import "dotenv/config";
import { newStorageKey } from "../src/server/storage/keys";
import { defaultStorageProvider } from "../src/server/storage/S3StorageProvider";

async function runSmokeTest() {
  console.log("=== S3 / MinIO Smoke Test (App Credentials) ===");

  const key = newStorageKey();
  console.log(`[1] Generated flat UUID storage key: ${key}`);

  const testPayload = `DriveLite S3 Smoke Test - Timestamp: ${new Date().toISOString()}`;
  const payloadBuffer = Buffer.from(testPayload, "utf-8");
  const mimeType = "text/plain";

  // Step 1: Pre-signed PUT
  console.log("[2] Generating pre-signed PUT URL...");
  const putUrl = await defaultStorageProvider.presignPut(
    key,
    payloadBuffer.length,
    mimeType,
    300
  );
  console.log(`Pre-signed PUT URL generated successfully.`);

  // Step 2: Client uploads directly to MinIO
  console.log("[3] Uploading test bytes directly to storage via PUT...");
  const putResponse = await fetch(putUrl, {
    method: "PUT",
    headers: {
      "Content-Type": mimeType,
      "Content-Length": payloadBuffer.length.toString(),
    },
    body: payloadBuffer,
  });

  if (!putResponse.ok) {
    throw new Error(
      `PUT to storage failed with status ${putResponse.status}: ${await putResponse.text()}`
    );
  }
  console.log(`PUT succeeded. Status: ${putResponse.status}`);

  // Step 3: Server HEAD request to verify object
  console.log("[4] Verifying object via server HEAD call...");
  const meta = await defaultStorageProvider.head(key);
  if (!meta) {
    throw new Error(`HEAD verification failed: object ${key} not found.`);
  }
  console.log(`HEAD succeeded. Length: ${meta.contentLength}, ETag: ${meta.etag}`);
  if (meta.contentLength !== payloadBuffer.length) {
    throw new Error(
      `Length mismatch: expected ${payloadBuffer.length}, got ${meta.contentLength}`
    );
  }

  // Step 4: Pre-signed GET
  console.log("[5] Generating pre-signed GET URL with Content-Disposition...");
  const getUrl = await defaultStorageProvider.presignGet(
    key,
    "smoke-test.txt",
    mimeType,
    60
  );
  console.log(`Pre-signed GET URL generated successfully.`);

  // Step 5: Direct download via pre-signed GET
  console.log("[6] Fetching bytes directly from storage via pre-signed GET...");
  const getResponse = await fetch(getUrl);
  if (!getResponse.ok) {
    throw new Error(
      `GET from storage failed with status ${getResponse.status}: ${await getResponse.text()}`
    );
  }
  const downloadedText = await getResponse.text();
  if (downloadedText !== testPayload) {
    throw new Error(`Data corruption: downloaded text does not match uploaded payload`);
  }
  console.log(`GET succeeded. Content verified: "${downloadedText.substring(0, 40)}..."`);

  // Step 6: Delete object
  console.log("[7] Deleting object via server DELETE call...");
  await defaultStorageProvider.deleteObject(key);
  console.log(`DELETE request completed.`);

  // Step 7: Confirm object no longer exists
  console.log("[8] Confirming deletion via HEAD call...");
  const postDeleteMeta = await defaultStorageProvider.head(key);
  if (postDeleteMeta !== null) {
    throw new Error(`Deletion verification failed: object ${key} still exists.`);
  }
  console.log(`Confirmed: object no longer exists in storage.`);

  console.log("\n=== ALL SMOKE TEST CHECKS PASSED SUCCESSFULLY ===");
}

runSmokeTest().catch((err) => {
  console.error("Smoke test failed:", err);
  process.exit(1);
});
