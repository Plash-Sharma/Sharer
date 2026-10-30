import "dotenv/config";
import { drainStorageDeletionOutbox } from "../src/server/storage/outbox.worker";

async function main() {
  console.log("[Outbox Worker] Starting storage deletion outbox drain...");
  const result = await drainStorageDeletionOutbox();
  console.log(`[Outbox Worker] Finished. Processed: ${result.processed}, Errors: ${result.errors}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("[Outbox Worker Fatal]:", err);
  process.exit(1);
});
