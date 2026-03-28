const { getAllLinks, setLink } = require("../lib/maintenance");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { links } = req.body;
  const existing = await getAllLinks();
  const existingUrls = new Set(existing.map((l) => l.url));

  for (const url of links) {
    if (!existingUrls.has(url)) {
      await setLink(url, {
        url,
        status: "pending",
        added_at: Date.now(),
        last_check: null,
        error: null,
      });
    }
  }

  return res.status(200).json({ success: true });
};
