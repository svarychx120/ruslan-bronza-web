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
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const admin = await getAdminFromToken(req);
    if (!admin) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const { email } = await req.json();
    if (!email) {
      return new Response(JSON.stringify({ error: 'Email is required' }), { status: 400 });
    }

    const emailLower = email.toLowerCase().trim();
    const raw = await redis.get(`user:${emailLower}`);
    if (!raw) {
      return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 });
    }

    const user = typeof raw === 'string' ? JSON.parse(raw) : raw;
    user.status = 'rejected';
    await redis.set(`user:${emailLower}`, JSON.stringify(user));

    return new Response(JSON.stringify({ message: 'User rejected' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
}
