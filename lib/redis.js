import { Redis } from '@upstash/redis';

let redis = null;

function getRedis() {
  if (redis) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    throw new Error('Redis not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in Vercel environment variables.');
  }
  redis = new Redis({ url, token });
  return redis;
}

export default new Proxy({}, {
  get(_, prop) {
    return (...args) => getRedis()[prop](...args);
  },
});
