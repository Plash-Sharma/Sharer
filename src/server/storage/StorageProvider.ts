export interface ObjectMetadata {
  contentLength: number;
  etag: string;
  contentType?: string;
  lastModified?: Date;
}

export interface StorageProvider {
  /**
   * Generates a pre-signed PUT URL for uploading directly to storage from the browser.
   */
  presignPut(
    key: string,
    size: number,
    mimeType: string,
    ttlSeconds?: number
  ): Promise<string>;

  /**
   * Generates a pre-signed GET URL for downloading directly from storage to the browser.
   */
  presignGet(
    key: string,
    downloadFilename: string,
    mimeType?: string,
    ttlSeconds?: number
  ): Promise<string>;

  /**
   * Reads metadata for an object from storage directly. Returns null if object does not exist.
   */
  head(key: string): Promise<ObjectMetadata | null>;

  /**
   * Deletes multiple objects in batch.
   */
  deleteMany(keys: string[]): Promise<void>;

  /**
   * Deletes a single object.
   */
  deleteObject(key: string): Promise<void>;

  /**
   * Directly uploads buffer/text to storage (used for small in-app text/markdown files).
   */
  putObject(
    key: string,
    body: Buffer | Uint8Array | string,
    contentType: string
  ): Promise<{ etag: string }>;

  /**
   * Reads object bytes directly (used for in-app text file editing).
   */
  getObject(key: string): Promise<Buffer | null>;
}
