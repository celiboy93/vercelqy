import { runMaintenance } from "../lib/maintenance.mjs";

export default async function handler(req, res) {
  // Response ကို ချက်ခြင်းပြန်ပို့ပြီး background မှာ ဆက်run
  res.status(200).send("Triggered - running in background...");

  try {
    await runMaintenance();
    console.log("✅ Maintenance completed successfully");
  } catch (e) {
    console.error("❌ Maintenance failed:", e.message);
  }
}
