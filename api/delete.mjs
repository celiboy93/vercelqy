import { deleteLinkByUrl } from "../lib/maintenance.mjs";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { url } = req.body;
  await deleteLinkByUrl(url);

  return res.status(200).json({ success: true });
}
