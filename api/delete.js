const { deleteLink } = require("../lib/maintenance");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { url } = req.body;
  await deleteLink(url);

  return res.status(200).json({ success: true });
};
