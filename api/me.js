import redis from '../lib/redis.js';

export default async function handler(req) {
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const cookies = req.headers.get('cookie') || '';
    const tokenMatch = cookies.match(/auth_token=([^;]+)/);
    const token = tokenMatch ? tokenMatch[1] : null;

    if (!token) {
      return new Response(JSON.stringify({ authenticated: false }), { status: 401 });
    }

    const email = await redis.get(`token:${token}`);
    if (!email) {
      return new Response(JSON.stringify({ authenticated: false }), { status: 401 });
    }

    const raw = await redis.get(`user:${email}`);
    if (!raw) {
      return new Response(JSON.stringify({ authenticated: false }), { status: 401 });
    }

    const user = typeof raw === 'string' ? JSON.parse(raw) : raw;

    return new Response(JSON.stringify({
      authenticated: true,
      user: {
        name: user.name,
        surname: user.surname,
        group: user.group,
        email: user.email,
        status: user.status,
        tier: user.tier,
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
}
