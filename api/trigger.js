const { runMaintenance } = require("../lib/maintenance");

module.exports = async function handler(req, res) {
  // ပို့ response ကို client ဆီ ချက်ခြင်းပြန်ပို့ပြီး background မှာ ဆက်လုပ်
  res.status(200).send("Triggered - running in background...");

  // Vercel serverless function မှာ response ပို့ပြီးပေမဲ့
  // function ပိတ်မသွားသေးဘူး (maxDuration အတွင်း ဆက်run မယ်)
  try {
    await runMaintenance();
    console.log("✅ Maintenance completed successfully");
  } catch (e) {
    console.error("❌ Maintenance failed:", e.message);
  }
};
