import { TooManyRequestsError } from "../errors";

interface RateLimitRecord {
  timestamps: number[];
}

class InMemoryRateLimiter {
  private records = new Map<string, RateLimitRecord>();

  /**
   * Checks whether an action for a given key exceeds `limit` within `windowSeconds`.
   * Returns remaining allowed calls or throws TooManyRequestsError.
   */
  check(key: string, limit: number, windowSeconds: number): { remaining: number; resetInSeconds: number } {
    const now = Date.now();
    const windowMs = windowSeconds * 1000;

    let record = this.records.get(key);
    if (!record) {
      record = { timestamps: [] };
      this.records.set(key, record);
    }

    // Filter out timestamps outside current window
    record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

    if (record.timestamps.length >= limit) {
      const oldest = record.timestamps[0];
      const resetInSeconds = Math.ceil((oldest + windowMs - now) / 1000);
      throw new TooManyRequestsError(`Rate limit exceeded. Try again in ${resetInSeconds} seconds.`, {
        resetInSeconds,
      });
    }

    record.timestamps.push(now);
    return {
      remaining: limit - record.timestamps.length,
      resetInSeconds: windowSeconds,
    };
  }

  // Periodic cleanup
  cleanup(maxAgeSeconds = 300) {
    const now = Date.now();
    for (const [key, record] of this.records.entries()) {
      record.timestamps = record.timestamps.filter((ts) => now - ts < maxAgeSeconds * 1000);
      if (record.timestamps.length === 0) {
        this.records.delete(key);
      }
    }
  }
}

export const rateLimiter = new InMemoryRateLimiter();

// Clean up stale rate limit entries every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => rateLimiter.cleanup(), 300_000);
}
