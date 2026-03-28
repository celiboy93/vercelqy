import { kv } from "@vercel/kv";

export async function getAllLinks() {
  const keys = await kv.keys("link:*");
  if (keys.length === 0) return [];
  const links = [];
  for (const key of keys) {
    const val = await kv.get(key);
    if (val) links.push(val);
  }
  return links;
}

export async function setLink(url, data) {
  const key = "link:" + btoa(url).replace(/[+/=]/g, (c) =>
    c === "+" ? "-" : c === "/" ? "_" : ""
  );
  await kv.set(key, data);
}

export async function deleteLinkByUrl(url) {
  const key = "link:" + btoa(url).replace(/[+/=]/g, (c) =>
    c === "+" ? "-" : c === "/" ? "_" : ""
  );
  await kv.del(key);
}

async function processQyShare(url) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
      },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const html = await res.text();
    const token = html.match(/const token = "([^"]+)";/)?.[1];
    const fileId = html.match(/const fileId = (\d+);/)?.[1];
    const hostsMatch = html.match(/const downloadHosts = (\[.*?\]);/s);

    if (!token || !fileId || !hostsMatch)
      throw new Error("Invalid Page Structure");

    const hosts = JSON.parse(hostsMatch[1]);
    if (hosts.length === 0) throw new Error("No Hosts Available");

    const apiUrl = `${new URL(url).origin}/api/share/download?token=${encodeURIComponent(token)}&fileId=${encodeURIComponent(fileId)}&hostId=${hosts[0].id}`;

    const apiRes = await fetch(apiUrl, {
      method: "GET",
      headers: { "User-Agent": "Mozilla/5.0", Referer: url },
      redirect: "follow",
      signal: controller.signal,
    });

    if (!apiRes.ok) throw new Error("API Connection Failed");

    try {
      await apiRes.text();
    } catch (_) {}

    return true;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("Timeout (Web too slow)");
    }
    throw error;
  } finally {
    clearTimeout(id);
  }
}

export async function runMaintenance() {
  const allLinks = await getAllLinks();
  const shuffled = allLinks.sort(() => Math.random() - 0.5);
  const BATCH_SIZE = 5;

  for (let i = 0; i < shuffled.length; i += BATCH_SIZE) {
    const batch = shuffled.slice(i, i + BATCH_SIZE);
    console.log(
      `Processing batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(shuffled.length / BATCH_SIZE)}`
    );

    await Promise.all(
      batch.map(async (linkData) => {
        const MAX_RETRIES = 3;
        let success = false;
        let lastError = null;

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
          try {
            await processQyShare(linkData.url);
            success = true;
            break;
          } catch (e) {
            lastError = e.message;
            if (attempt < MAX_RETRIES) {
              console.warn(
                `Retry ${attempt}/${MAX_RETRIES} for ${linkData.url}: ${e.message}`
              );
              await new Promise((r) => setTimeout(r, 2000));
            }
          }
        }

        if (success) {
          await setLink(linkData.url, {
            ...linkData,
            status: "active",
            last_check: Date.now(),
            error: null,
          });
        } else {
          console.error(`FAILED ${linkData.url}: ${lastError}`);
          await setLink(linkData.url, {
            ...linkData,
            status: "failed",
            last_check: Date.now(),
            error: `Failed after 3 attempts: ${lastError}`,
          });
        }
      })
    );

    if (i + BATCH_SIZE < shuffled.length) {
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}
