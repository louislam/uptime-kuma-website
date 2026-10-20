// Builds github-public-sponsors.json from the GitHub Sponsors GraphQL API.
//
// Usage:
//   npm run sponsors:json                 # write github-public-sponsors.json
//   npm run sponsors:json -- --out x.json # write somewhere else
//   npm run sponsors:json -- --check      # compare with the ground truth file
//
// Needs GITHUB_API_TOKEN with access to the Sponsors GraphQL API.

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const GRAPHQL_URL = "https://api.github.com/graphql";
const DEFAULT_OUT = "github-public-sponsors.json";
const GROUND_TRUTH = "github-public-sponsors - ground truth.json";

interface Sponsor {
    login: string;
    url: string;
    name: string;
    currency: string;
    image: string;
    amount: number;
    is_public: boolean;
}

interface SponsorshipNode {
    privacyLevel: "PUBLIC" | "PRIVATE";
    sponsorEntity: {
        __typename: "User" | "Organization";
        login: string;
        name: string | null;
        avatarUrl: string;
    } | null;
}

interface LifetimeNode {
    amountInCents: number;
    sponsor: { login: string } | null;
}

interface PageInfo {
    hasNextPage: boolean;
    endCursor: string | null;
}

interface SponsorshipsPage {
    viewer: {
        sponsorshipsAsMaintainer: {
            pageInfo: PageInfo;
            nodes: SponsorshipNode[];
        };
    };
}

interface LifetimePage {
    viewer: {
        lifetimeReceivedSponsorshipValues: {
            pageInfo: PageInfo;
            nodes: LifetimeNode[];
        };
    };
}

const TOKEN = process.env.GITHUB_API_TOKEN;
if (!TOKEN) {
    console.error("GITHUB_API_TOKEN is not set in environment / .env file");
    process.exit(1);
}

async function gql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
    const response = await fetch(GRAPHQL_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "User-Agent": "uptime-kuma-website",
            "Authorization": `Bearer ${TOKEN}`,
        },
        body: JSON.stringify({ query, variables }),
    });

    const json = await response.json() as { data?: T; errors?: Array<{ message: string }> };

    if (!response.ok || json.errors?.length) {
        throw new Error(`GitHub GraphQL failed (${response.status}): ${JSON.stringify(json.errors ?? json)}`);
    }
    if (!json.data) {
        throw new Error("GitHub GraphQL returned no data");
    }

    return json.data;
}

async function fetchSponsorships(): Promise<Map<string, SponsorshipNode>> {
    const result = new Map<string, SponsorshipNode>();
    let cursor: string | null = null;

    do {
        const data = await gql<SponsorshipsPage>(
            `query($cursor: String) {
                viewer {
                    sponsorshipsAsMaintainer(first: 100, after: $cursor, activeOnly: false, includePrivate: true) {
                        pageInfo { hasNextPage endCursor }
                        nodes {
                            privacyLevel
                            sponsorEntity {
                                __typename
                                ... on User { login name avatarUrl }
                                ... on Organization { login name avatarUrl }
                            }
                        }
                    }
                }
            }`,
            { cursor },
        );

        const page = data.viewer.sponsorshipsAsMaintainer;
        for (const node of page.nodes) {
            const login = node.sponsorEntity?.login;
            if (!login) continue;

            const existing = result.get(login);
            // A sponsor can have several sponsorships. Keep the public one, and
            // prefer a node that actually carries a name and avatar.
            if (!existing || (!existing.sponsorEntity?.name && node.sponsorEntity?.name) ||
                (existing.privacyLevel === "PRIVATE" && node.privacyLevel === "PUBLIC")) {
                result.set(login, node);
            }
        }

        cursor = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
    } while (cursor);

    return result;
}

async function fetchLifetimeAmounts(): Promise<Map<string, number>> {
    const result = new Map<string, number>();
    let cursor: string | null = null;

    do {
        const data = await gql<LifetimePage>(
            `query($cursor: String) {
                viewer {
                    lifetimeReceivedSponsorshipValues(first: 100, after: $cursor) {
                        pageInfo { hasNextPage endCursor }
                        nodes {
                            amountInCents
                            sponsor {
                                ... on User { login }
                                ... on Organization { login }
                            }
                        }
                    }
                }
            }`,
            { cursor },
        );

        const page = data.viewer.lifetimeReceivedSponsorshipValues;
        for (const node of page.nodes) {
            const login = node.sponsor?.login;
            if (!login) continue;
            result.set(login, node.amountInCents);
        }

        cursor = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
    } while (cursor);

    return result;
}

function md5Hex(input: string): string {
    return createHash("md5").update(input).digest("hex");
}

export async function buildSponsors(): Promise<Sponsor[]> {
    const [sponsorships, lifetime] = await Promise.all([
        fetchSponsorships(),
        fetchLifetimeAmounts(),
    ]);

    const result: Sponsor[] = [];

    for (const [login, sponsorship] of sponsorships) {
        const amountInCents = lifetime.get(login);
        if (amountInCents === undefined) continue;

        const isPublic = sponsorship.privacyLevel === "PUBLIC" && sponsorship.sponsorEntity !== null;
        const entity = sponsorship.sponsorEntity;

        if (!isPublic) {
            result.push({
                login: "hidden-" + md5Hex(login).substring(12, 12 + 24),
                url: "https://github.com/louislam/uptime-kuma",
                name: "Guest",
                currency: "USD",
                image: "",
                amount: amountInCents / 100,
                is_public: false,
            });
            continue;
        }

        result.push({
            login,
            url: `https://github.com/${login}`,
            name: entity?.name || login,
            currency: "USD",
            image: entity?.avatarUrl ?? "",
            amount: amountInCents / 100,
            is_public: true,
        });
    }

    result.sort((a, b) => {
        const cmp = a.login.localeCompare(b.login);
        if (cmp !== 0) return cmp;
        return a.amount > b.amount ? -1 : 1;
    });

    return result;
}

function cents(amount: number): number {
    return Math.round(amount * 100);
}

export function diffSponsors(actual: Sponsor[], expected: Sponsor[]): string[] {
    const problems: string[] = [];
    const actualByLogin = new Map(actual.map((s) => [s.login, s]));
    const expectedByLogin = new Map(expected.map((s) => [s.login, s]));

    for (const login of expectedByLogin.keys()) {
        if (!actualByLogin.has(login)) problems.push(`missing: ${login}`);
    }
    for (const login of actualByLogin.keys()) {
        if (!expectedByLogin.has(login)) problems.push(`extra: ${login}`);
    }

    for (const [login, expectedSponsor] of expectedByLogin) {
        const actualSponsor = actualByLogin.get(login);
        if (!actualSponsor) continue;

        if (cents(actualSponsor.amount) !== cents(expectedSponsor.amount)) {
            problems.push(`amount ${login}: ${actualSponsor.amount} != ${expectedSponsor.amount}`);
        }
        if (actualSponsor.is_public !== expectedSponsor.is_public) {
            problems.push(`is_public ${login}: ${actualSponsor.is_public} != ${expectedSponsor.is_public}`);
        }
        if (actualSponsor.name !== expectedSponsor.name) {
            problems.push(`name ${login}: ${JSON.stringify(actualSponsor.name)} != ${JSON.stringify(expectedSponsor.name)}`);
        }
        if (actualSponsor.url !== expectedSponsor.url) {
            problems.push(`url ${login}: ${actualSponsor.url} != ${expectedSponsor.url}`);
        }
        if (actualSponsor.image !== expectedSponsor.image) {
            problems.push(`image ${login}: ${JSON.stringify(actualSponsor.image)} != ${JSON.stringify(expectedSponsor.image)}`);
        }
    }

    return problems;
}

async function main(): Promise<void> {
    const args = process.argv.slice(2);
    const check = args.includes("--check");
    const outIndex = args.indexOf("--out");
    const out = outIndex >= 0 ? args[outIndex + 1] : DEFAULT_OUT;
    const mergeIndex = args.indexOf("--merge");
    const mergePath = mergeIndex >= 0 ? args[mergeIndex + 1] : null;

    let sponsors = await buildSponsors();

    // Sponsorships that disappeared from the API (deleted accounts) are still
    // part of the all-time list. Carry them over from a previous JSON.
    if (mergePath) {
        const previous = JSON.parse(await readFile(mergePath, "utf8")) as Sponsor[];
        const current = new Set(sponsors.map((s) => s.login));
        const carried = previous.filter((s) => !current.has(s.login));
        if (carried.length > 0) {
            console.log(`Carried over ${carried.length} sponsor(s) from ${mergePath}`);
            sponsors = sponsors.concat(carried).sort((a, b) => {
                const cmp = a.login.localeCompare(b.login);
                if (cmp !== 0) return cmp;
                return a.amount > b.amount ? -1 : 1;
            });
        }
    }

    console.log(`Sponsors: ${sponsors.length} (${sponsors.filter((s) => !s.is_public).length} private)`);

    if (check) {
        const expected = JSON.parse(await readFile(GROUND_TRUTH, "utf8")) as Sponsor[];
        const problems = diffSponsors(sponsors, expected);

        if (problems.length > 0) {
            console.error(`Mismatch: ${problems.length} problem(s)`);
            for (const problem of problems) console.error(`  ${problem}`);
            process.exit(1);
        }

        console.log(`Matches ${GROUND_TRUTH}`);
        return;
    }

    if (!out) {
        console.error("Missing path after --out");
        process.exit(1);
    }

    await writeFile(out, JSON.stringify(sponsors, null, 4));
    console.log(`Wrote ${out}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    await main();
}
