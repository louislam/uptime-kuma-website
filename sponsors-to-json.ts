import { parse } from "jsr:@std/csv@1.0.6";
import { crypto } from "jsr:@std/crypto@1.1.0";
import { encodeHex } from "jsr:@std/encoding@1.0.10/hex";

let Login = -1;
let Name = -1;
let PublicEmail = -1;
let IsPublic = -1;
let Amount = -1;
let Status = -1;

interface Sponsor {
    login: string;
    url: string;
    name: string;
    currency: string;
    image: string;
    amount: number;
    is_public: boolean;
}

const decoder = new TextDecoder("utf-8");
const data = Deno.readFileSync("louislam-sponsorships-all-time.csv");
const csvContent = decoder.decode(data);

// Parse CSV properly (handles quoted fields)
const rows = parse(csvContent, { skipFirstRow: false });

console.log(`Total lines in csv: ${rows.length}`);

const list = new Map<string, Sponsor>();

let isFirst = true;
for (const row of rows) {
    // Skip empty rows
    if (row.length === 0 || (row.length === 1 && row[0] === "")) {
        continue;
    }

    if (isFirst) {
        for (let i = 0; i < row.length; i++) {
            if (row[i] === "Sponsor Handle") Login = i;
            else if (row[i] === "Sponsor Profile Name") Name = i;
            else if (row[i] === "Sponsor Public Email") PublicEmail = i;
            else if (row[i] === "Is Public?") IsPublic = i;
            else if (row[i] === "Processed Amount") Amount = i;
            else if (row[i] === "Status") Status = i;
        }
        isFirst = false;
        continue;
    }

    // Settled only
    if (row[Status] !== "settled") {
        console.log(`Skip row because not settled: ${row[Status]}`);
        continue;
    }

    const loginKey = row[Login];

    if (!list.has(loginKey)) {
        const obj: Sponsor = {
            login: "",
            url: "",
            name: "",
            currency: "USD",
            image: "",
            amount: 0,
            is_public: row[IsPublic] === "true",
        };

        // If it is private, mark it as a guest
        if (row[IsPublic] !== "true") {
            const hash = await md5Hex(loginKey);
            obj.login = "hidden-" + hash.substring(12, 12 + 24);
            obj.url = "https://github.com/louislam/uptime-kuma";
            obj.name = "Guest";
        } else {
            obj.login = loginKey;
            obj.url = `https://github.com/${loginKey}`;
            obj.name = row[Name] || loginKey;
        }

        list.set(loginKey, obj);
    }

    // Offset 1, strip out dollar sign
    const sponsor = list.get(loginKey)!;
    sponsor.amount += parseFloat(row[Amount].substring(1));
}

let result = Array.from(list.values());

console.log(`Total row in list: ${result.length}`);

// Get profile pic url from github api
const imageList = await getImages(result);

for (const user of result) {
    for (const item of imageList) {
        if (!item) continue;
        if (user.login === item.login) {
            user.image = item.avatarUrl;
        }
    }
}

result.sort((a, b) => {
    const cmp = a.login.toLowerCase().localeCompare(b.login.toLowerCase());
    if (cmp !== 0) return cmp;
    return a.amount > b.amount ? -1 : 1;
});

Deno.writeTextFileSync("github-public-sponsors.json", JSON.stringify(result, null, 4));

console.log("Done");


async function md5Hex(input: string): Promise<string> {
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("MD5", encoder.encode(input));
    return encodeHex(new Uint8Array(hashBuffer));
}

async function getImages(list: Sponsor[]): Promise<Array<{ login: string; avatarUrl: string }>> {
    const token = Deno.env.get("GITHUB_API_TOKEN");
    if (!token) {
        throw new Error("GITHUB_API_TOKEN is not set in environment / .env file");
    }

    let query = "";
    let i = 1;
    for (const user of list) {
        if (user.is_public) {
            query += `
             user${i}: user(login: "${user.login}") {
                 login
                 avatarUrl
             }
            `;
            i++;
        }
    }

    if (!query) {
        return [];
    }

    const response = await fetch("https://api.github.com/graphql", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "User-Agent": "uptime-kuma-website",
            "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ query: `{ ${query} }` }),
    });

    if (!response.ok) {
        throw new Error(`Failed to get image list from GitHub API: ${response.status} ${response.statusText}`);
    }

    const json = await response.json();

    if (json.data) {
        return Object.values(json.data) as Array<{ login: string; avatarUrl: string }>;
    }

    throw new Error(`Failed to get image list from GitHub API: ${JSON.stringify(json)}`);
}
