import { storageDeletionRepo } from "../repositories/storage-deletion.repo";
import { defaultStorageProvider } from "./S3StorageProvider";

export async function drainStorageDeletionOutbox(batchSize = 1000): Promise<{ processed: number; errors: number }> {
  const pending = await storageDeletionRepo.listPending(batchSize);
  if (pending.length === 0) {
    return { processed: 0, errors: 0 };
  }

  const keys = pending.map((p) => p.storageKey);
  const ids = pending.map((p) => p.id);

  try {
    // S3 DeleteObjects max 1000
    await defaultStorageProvider.deleteMany(keys);
    // On success, remove from outbox table
    await storageDeletionRepo.remove(ids);
    return { processed: keys.length, errors: 0 };
  } catch (err) {
    console.error("[Storage Outbox Worker] Error deleting batch:", err);
    // Increment retry attempts
    await storageDeletionRepo.incrementAttempts(ids);
    return { processed: 0, errors: keys.length };
  }
}
