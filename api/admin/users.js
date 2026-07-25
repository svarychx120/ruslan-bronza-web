import redis from '../../_redis.js';

async function getAdminFromToken(req) {
  const cookies = req.headers.get('cookie') || '';
  const tokenMatch = cookies.match(/auth_token=([^;]+)/);
  const token = tokenMatch ? tokenMatch[1] : null;
  if (!token) return null;

  const email = await redis.get(`token:${token}`);
  if (!email) return null;

  const raw = await redis.get(`user:${email}`);
  if (!raw) return null;

  const user = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (user.tier !== 'admin') return null;

  return user;
}

export default async function handler(req) {
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const admin = await getAdminFromToken(req);
    if (!admin) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const keys = await redis.keys('user:*');
    const users = [];

    for (const key of keys) {
      const raw = await redis.get(key);
      if (!raw) continue;
      const user = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (user.tier === 'admin') continue;
      users.push({
        name: user.name,
        surname: user.surname,
        group: user.group,
        email: user.email,
        status: user.status,
        tier: user.tier,
        createdAt: user.createdAt,
      });
    }

    users.sort((a, b) => b.createdAt - a.createdAt);

    return new Response(JSON.stringify({ users }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
}
