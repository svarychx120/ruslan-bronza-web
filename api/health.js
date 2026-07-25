export default function handler() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || '';
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || '';
  return new Response(JSON.stringify({
    ok: true,
    redisUrl: url ? 'set' : 'missing',
    redisToken: token ? 'set' : 'missing',
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
