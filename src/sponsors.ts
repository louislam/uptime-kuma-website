// Sponsors SVG generator.
//
// Port of views/sponsors.php + src/UptimeKuma/SimpleImage.php.
//  - OpenCollective members are fetched live (same as PHP file_get_contents).
//  - GitHub sponsors are read from github-public-sponsors.json.
//  - Avatars are resized to width 80 and encoded as WebP quality 70.
//  - Results are cached as `data:image/webp;base64,...` strings under ./cache,
//    keyed by a cache version plus md5(url) + sha1(url).

import sharp from "sharp";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";

interface Sponsor {
    name: string;
    amount: number;
    currency: string;
    image: string;
    url: string;
}

interface GithubSponsor extends Sponsor {
    is_public?: boolean;
}

interface OpenCollectiveMember {
    totalAmountDonated: number;
    profile: string;
    name: string;
    currency: string;
    image: string;
}

const COLS = 10;
const ITEM_WIDTH = 120;
const ITEM_HEIGHT = 140;
const AVATAR_WIDTH = 80;
const CACHE_VERSION = "v2";
const CACHE_DIR = process.env.CACHE_DIR ?? "./cache";
const SPONSORS_JSON = process.env.SPONSORS_JSON ?? "./github-public-sponsors.json";
const FALLBACK_IMAGE = "https://raw.githubusercontent.com/louislam/uptime-kuma/master/public/icon-192x192.png";

function escapeXml(value: unknown): string {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function byteCompare(a: string, b: string): number {
    // Matches PHP strcmp (byte-wise), not locale-aware comparison.
    return a < b ? -1 : a > b ? 1 : 0;
}

function cacheKey(url: string): string {
    return CACHE_VERSION + createHash("md5").update(url).digest("hex") + createHash("sha1").update(url).digest("hex");
}

async function getImageData(imageURL: string): Promise<string> {
    if (!imageURL) {
        imageURL = FALLBACK_IMAGE;
    }

    const cachePath = `${CACHE_DIR}/${cacheKey(imageURL)}`;
    try {
        return await readFile(cachePath, "utf8");
    } catch {
        // cache miss
    }

    const res = await fetch(imageURL);
    if (!res.ok) {
        throw new Error(`Failed to fetch sponsor image ${imageURL}: ${res.status} ${res.statusText}`);
    }

    const webp = await sharp(new Uint8Array(await res.arrayBuffer()))
        .resize({ width: AVATAR_WIDTH })
        .webp({ quality: 70 })
        .toBuffer();

    const data = `data:image/webp;base64,${webp.toBase64()}`;
    await mkdir(CACHE_DIR, { recursive: true });
    await writeFile(cachePath, data, "utf8");
    return data;
}

async function buildSponsorList(): Promise<Sponsor[]> {
    const list: Sponsor[] = [];
    const unique = new Set<string>();
    let guestAmount = 0;
    let guestCount = 0;

    const response = await fetch("https://opencollective.com/uptime-kuma/members/all.json");
    if (!response.ok) {
        throw new Error(`Failed to fetch OpenCollective members: ${response.status} ${response.statusText}`);
    }
    const openCollective = await response.json() as OpenCollectiveMember[];

    for (const item of openCollective) {
        if (item.totalAmountDonated === 0) continue;
        if (unique.has(item.profile)) continue;
        unique.add(item.profile);

        if (item.name === "Guest") {
            guestAmount += item.totalAmountDonated;
            guestCount++;
            continue;
        }

        if (item.totalAmountDonated > 0) {
            list.push({
                name: item.name,
                amount: item.totalAmountDonated,
                currency: item.currency,
                image: item.image,
                url: item.profile,
            });
        }
    }

    const github = JSON.parse(await readFile(SPONSORS_JSON, "utf8")) as GithubSponsor[];

    for (const sponsor of github) {
        if (sponsor.is_public === false) {
            guestAmount += sponsor.amount;
            guestCount++;
        } else {
            list.push(sponsor);
        }
    }

    if (guestCount > 0) {
        list.push({
            name: "All Guests",
            amount: Math.round(guestAmount * 100) / 100,
            currency: "USD",
            image: "",
            url: "https://github.com/louislam/uptime-kuma",
        });
    }

    list.sort((a, b) => {
        if (a.amount === b.amount) return byteCompare(a.name, b.name);
        return b.amount - a.amount;
    });

    return list;
}

interface LayoutResult {
    cells: string;
    height: number;
    nextClipId: number;
}

async function layoutSponsors(
    sponsors: Sponsor[],
    cols: number,
    scale: number,
    offsetY: number,
    clipIdStart: number,
): Promise<LayoutResult> {
    let cells = "";
    let clipId = clipIdStart;
    const fontSize = scale > 1 ? 16 : 16 * scale;

    for (let i = 0; i < sponsors.length; i++) {
        const sponsor = sponsors[i];
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = col * ITEM_WIDTH * scale;
        const y = offsetY + row * ITEM_HEIGHT * scale;
        const href = await getImageData(sponsor.image);
        const id = clipId++;

        cells += `        <a href="${escapeXml(sponsor.url)}" target="_blank">
            <image width="${100 * scale}" height="${100 * scale}" x="${x}" y="${y}" href="${href}" />
            <text x="${x}" y="${y + 105 * scale}" clip-path="url(#clip${id})" dominant-baseline="hanging" text-anchor="start" font-size="${fontSize}">${escapeXml(sponsor.name)}</text>
            <text x="${x}" y="${y + 125 * scale}" clip-path="url(#clip${id})" dominant-baseline="hanging" text-anchor="start" font-size="${fontSize}">${escapeXml(sponsor.currency)} ${escapeXml(sponsor.amount)}</text>
        </a>
        <clipPath id="clip${id}">
            <rect x="${x}" y="${y + 105 * scale}" width="${105 * scale}" height="${40 * scale}"/>
        </clipPath>
`;
    }

    return {
        cells,
        height: Math.ceil(sponsors.length / cols) * ITEM_HEIGHT * scale,
        nextClipId: clipId,
    };
}

export async function renderSponsorsSvg(): Promise<string> {
    const sponsorList = await buildSponsorList();

    const totalWidth = ITEM_WIDTH * COLS;

    const top = sponsorList.slice(0, 10);
    const middle = sponsorList.slice(10, 210);
    const rest = sponsorList.slice(210);

    let cells = "";
    let offsetY = 0;
    let clipId = 1;

    const topLayout = await layoutSponsors(top, 5, 2, offsetY, clipId);
    cells += topLayout.cells;
    offsetY += topLayout.height;
    clipId = topLayout.nextClipId;

    const middleLayout = await layoutSponsors(middle, 10, 1, offsetY, clipId);
    cells += middleLayout.cells;
    offsetY += middleLayout.height;
    clipId = middleLayout.nextClipId;

    const restLayout = await layoutSponsors(rest, 20, 0.5, offsetY, clipId);
    cells += restLayout.cells;
    offsetY += restLayout.height;

    const totalHeight = offsetY;

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${totalHeight}">
    <style>
        a {
            transition: all ease-in-out 0.2s;
            font-family: sans-serif;
        }
        a:hover {
            opacity: 0.5;
        }
    </style>

${cells} </svg>`;
}
