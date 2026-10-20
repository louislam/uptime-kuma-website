// Sponsors SVG generator.
//
// Port of views/sponsors.php + src/UptimeKuma/SimpleImage.php.
//  - OpenCollective members are fetched live (same as PHP file_get_contents).
//  - GitHub sponsors are read from github-public-sponsors.json.
//  - Avatars are resized to the display width and encoded as WebP quality 70.
//  - Results are cached as `data:image/webp;base64,...` strings under ./cache,
//    keyed by a cache version, width, plus md5(url) + sha1(url).

import sharp from "sharp";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";

type SponsorSource = "github" | "opencollective" | "guest";

interface Sponsor {
    name: string;
    amount: number;
    currency: string;
    image: string;
    url: string;
    source?: SponsorSource;
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
const CACHE_DIR = process.env.CACHE_DIR ?? "./cache";
const SPONSORS_JSON = process.env.SPONSORS_JSON ?? "./github-public-sponsors.json";
const FALLBACK_IMAGE = "https://raw.githubusercontent.com/louislam/uptime-kuma/master/public/icon-192x192.png";
const GITHUB_ICON = `data:image/svg+xml,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path fill="#181717" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z"/></svg>',
)}`;
const OPENCIL_ICON = `data:image/svg+xml,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path fill-rule="evenodd" clip-rule="evenodd" d="M29.1531 6.8877C30.948 9.47379 31.9999 12.614 31.9999 16.0003C31.9999 19.3866 30.948 22.5271 29.1531 25.1129L25.0085 20.9684C25.8225 19.4957 26.2858 17.8019 26.2858 16.0003C26.2858 14.1987 25.8225 12.5052 25.0085 11.0325L29.1531 6.8877Z" fill="#8FC7FF"/><path fill-rule="evenodd" clip-rule="evenodd" d="M25.1126 2.84685L20.9678 6.99138C19.4951 6.17745 17.8016 5.71417 16 5.71417C10.3194 5.71417 5.71418 10.3194 5.71418 16C5.71418 21.6806 10.3194 26.2858 16 26.2858C17.8016 26.2858 19.4951 25.8226 20.9678 25.0086L25.1126 29.1532C22.5265 30.948 19.3863 32 16 32C7.16352 32 0 24.8365 0 16C0 7.16351 7.16352 0 16 0C19.3863 0 22.5265 1.05197 25.1126 2.84685Z" fill="#297EFF"/></svg>',
)}`;

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

function cacheKey(url: string, width: number): string {
    return `v3-${width}-` + createHash("md5").update(url).digest("hex") + createHash("sha1").update(url).digest("hex");
}

async function getImageData(imageURL: string, width: number, source?: SponsorSource): Promise<string> {
    if (!imageURL) {
        if (source === "github") return GITHUB_ICON;
        if (source === "opencollective") return OPENCIL_ICON;
        imageURL = FALLBACK_IMAGE;
    }

    const cachePath = `${CACHE_DIR}/${cacheKey(imageURL, width)}`;
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
        .resize({ width })
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
                source: "opencollective",
            });
        }
    }

    const github = JSON.parse(await readFile(SPONSORS_JSON, "utf8")) as GithubSponsor[];

    for (const sponsor of github) {
        if (sponsor.is_public === false) {
            guestAmount += sponsor.amount;
            guestCount++;
        } else {
            sponsor.source = "github";
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
            source: "guest",
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
        const href = await getImageData(sponsor.image, 100 * scale, sponsor.source);
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
