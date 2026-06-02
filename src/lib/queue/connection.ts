export const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

/**
 * BullMQ connection options. We pass a plain options object (not an ioredis
 * instance) so BullMQ uses its own bundled ioredis and avoids dual-package type
 * conflicts. `maxRetriesPerRequest: null` is required by BullMQ.
 */
export function redisConnection() {
  const u = new URL(REDIS_URL);
  return {
    host: u.hostname,
    port: Number(u.port || 6379),
    username: u.username || undefined,
    password: u.password || undefined,
    maxRetriesPerRequest: null as null,
  };
}
