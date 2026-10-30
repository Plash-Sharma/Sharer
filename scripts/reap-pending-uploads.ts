import "dotenv/config";
import { nodeRepo } from "../src/server/repositories/node.repo";
import { defaultStorageProvider } from "../src/server/storage/S3StorageProvider";

async function main() {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  console.log(`[Reaper] Looking for stale PENDING uploads older than ${oneHourAgo.toISOString()}...`);

  const staleNodes = await nodeRepo.listStalePendingUploads(oneHourAgo);
  console.log(`[Reaper] Found ${staleNodes.length} stale pending uploads.`);

  let reaped = 0;
  for (const node of staleNodes) {
    if (node.storageKey) {
      try {
        await defaultStorageProvider.deleteObject(node.storageKey);
      } catch (err) {
        console.error(`[Reaper] Failed to delete object ${node.storageKey}:`, err);
      }
    }
    await nodeRepo.deleteById(node.id);
    reaped++;
  }

  console.log(`[Reaper] Successfully reaped ${reaped} stale nodes.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("[Reaper Fatal]:", err);
  process.exit(1);
});
