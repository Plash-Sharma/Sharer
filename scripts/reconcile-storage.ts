import { ListObjectsV2Command, ListObjectsV2CommandOutput } from "@aws-sdk/client-s3";
import { s3Client, s3Bucket } from "../src/server/storage/s3.client";
import { prisma } from "../src/server/db/prisma";

async function main() {
  console.log(`[Storage Reconciler] Starting audit of bucket '${s3Bucket}' against PostgreSQL...`);

  // 1. Fetch all object keys from MinIO/S3
  const bucketKeys = new Set<string>();
  let continuationToken: string | undefined = undefined;

  do {
    const response: ListObjectsV2CommandOutput = await s3Client.send(
      new ListObjectsV2Command({
        Bucket: s3Bucket,
        ContinuationToken: continuationToken,
      })
    );

    if (response.Contents) {
      for (const obj of response.Contents) {
        if (obj.Key) bucketKeys.add(obj.Key);
      }
    }
    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  console.log(`[Storage Reconciler] Total objects found in bucket: ${bucketKeys.size}`);

  // 2. Fetch all storageKeys from active Node rows in DB
  const nodes = await prisma.node.findMany({
    where: { storageKey: { not: null } },
    select: { id: true, name: true, storageKey: true, uploadStatus: true },
  });

  const nodeStorageKeys = new Map<string, typeof nodes[0]>();
  for (const n of nodes) {
    if (n.storageKey) nodeStorageKeys.set(n.storageKey, n);
  }

  // 3. Fetch all storageKeys currently in StorageDeletion outbox
  const outbox = await prisma.storageDeletion.findMany({
    select: { storageKey: true },
  });
  const outboxKeys = new Set(outbox.map((o) => o.storageKey));

  // 4. Identify orphans in both directions
  const orphanObjects: string[] = []; // In S3, but neither in Node nor Outbox
  for (const key of bucketKeys) {
    if (!nodeStorageKeys.has(key) && !outboxKeys.has(key)) {
      orphanObjects.push(key);
    }
  }

  const orphanRows: string[] = []; // In Node (READY), but missing in S3
  for (const [key, node] of nodeStorageKeys.entries()) {
    if (node.uploadStatus === "READY" && !bucketKeys.has(key)) {
      orphanRows.push(`Node ${node.id} ("${node.name}") expects key ${key}`);
    }
  }

  console.log("---------------- RECONCILIATION REPORT ----------------");
  console.log(`Bucket objects: ${bucketKeys.size}`);
  console.log(`Database READY file nodes: ${nodeStorageKeys.size}`);
  console.log(`Pending outbox deletions: ${outboxKeys.size}`);
  console.log(`Orphan objects in bucket (no DB row): ${orphanObjects.length}`);
  if (orphanObjects.length > 0) {
    console.log("  Sample orphan objects:", orphanObjects.slice(0, 10));
  }
  console.log(`Orphan database rows (missing object in bucket): ${orphanRows.length}`);
  if (orphanRows.length > 0) {
    console.log("  Sample orphan rows:", orphanRows.slice(0, 10));
  }
  console.log("-------------------------------------------------------");

  await prisma.$disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("[Storage Reconciler Fatal]:", err);
  process.exit(1);
});
