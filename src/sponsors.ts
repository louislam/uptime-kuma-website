// Sponsors SVG generator.
//
// Port of views/sponsors.php + src/UptimeKuma/SimpleImage.php.
//  - OpenCollective members are fetched live (same as PHP file_get_contents).
//  - GitHub sponsors are read from github-public-sponsors.json.
//  - Avatars are resized to width 90 and encoded as JPEG quality 75 (GD's imagejpeg).
//  - Results are cached as `data:image/jpeg;base64,...` strings under ./cache,
//    mirroring PHP's md5(url) . sha1(url) cache key.

import sharp from "npm:sharp@0.35.5";
import { createHash } from "node:crypto";

interface Sponsor {
    name: string;
    amount: number;
    currency: string;
    image: string;
    url: string;
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
const AVATAR_WIDTH = 90;
const CACHE_DIR = Deno.env.get("CACHE_DIR") ?? "./cache";
const SPONSORS_JSON = Deno.env.get("SPONSORS_JSON") ?? "./github-public-sponsors.json";
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
    return createHash("md5").update(url).digest("hex") + createHash("sha1").update(url).digest("hex");
}

async function getImageData(imageURL: string): Promise<string> {
    if (!imageURL) {
        imageURL = FALLBACK_IMAGE;
    }

    const cachePath = `${CACHE_DIR}/${cacheKey(imageURL)}`;
    try {
        return await Deno.readTextFile(cachePath);
    } catch {
        // cache miss
    }

    const res = await fetch(imageURL);
    if (!res.ok) {
        throw new Error(`Failed to fetch sponsor image ${imageURL}: ${res.status} ${res.statusText}`);
    }

    const jpeg = await sharp(new Uint8Array(await res.arrayBuffer()))
        .resize({ width: AVATAR_WIDTH })
        .jpeg({ quality: 75 })
        .toBuffer();

    const data = `data:image/jpeg;base64,${jpeg.toBase64()}`;
    await Deno.writeTextFile(cachePath, data);
    return data;
}

async function buildSponsorList(): Promise<Sponsor[]> {
    const list: Sponsor[] = [];
    const unique = new Set<string>();

    const response = await fetch("https://opencollective.com/uptime-kuma/members/all.json");
    if (!response.ok) {
        throw new Error(`Failed to fetch OpenCollective members: ${response.status} ${response.statusText}`);
    }
    const openCollective = await response.json() as OpenCollectiveMember[];

    for (const item of openCollective) {
        if (item.totalAmountDonated === 0) continue;
        if (unique.has(item.profile)) continue;
        unique.add(item.profile);
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

    const github = JSON.parse(await Deno.readTextFile(SPONSORS_JSON)) as Sponsor[];
    list.push(...github);

    list.sort((a, b) => {
        if (a.amount === b.amount) return byteCompare(a.name, b.name);
        return b.amount - a.amount;
    });

    return list;
}

export async function renderSponsorsSvg(): Promise<string> {
    const sponsorList = await buildSponsorList();

    const totalWidth = ITEM_WIDTH * COLS;
    const totalHeight = Math.ceil(sponsorList.length / COLS) * ITEM_HEIGHT;

    let cells = "";
    let col = 1;
    let x = 0;
    let y = 0;

    for (const sponsor of sponsorList) {
        const href = await getImageData(sponsor.image);
        cells += `        <a href="${escapeXml(sponsor.url)}" target="_blank">
            <image width="100" height="100" x="${x}" y="${y}" href="${href}" />
            <text x="${x}" y="${y + 105}" clip-path="url(#clip${col})" dominant-baseline="hanging" text-anchor="start">${escapeXml(sponsor.name)}</text>
            <text x="${x}" y="${y + 125}" clip-path="url(#clip${col})" dominant-baseline="hanging" text-anchor="start">${escapeXml(sponsor.currency)} ${escapeXml(sponsor.amount)}</text>
        </a>
        <clipPath id="clip${col}">
            <rect x="${x}" y="${y + 105}" width="105" height="40"/>
        </clipPath>
`;

        if (col % COLS === 0) {
            x = 0;
            y += ITEM_HEIGHT;
        } else {
            x += ITEM_WIDTH;
        }
        col++;
    }

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
