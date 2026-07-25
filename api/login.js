import redis from '../_redis.js';
import crypto from 'crypto';

function hashPassword(password, salt) {
  return crypto.createHash('sha256').update(password + salt).digest('hex');
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Email and password are required' }), { status: 400 });
    }

    const emailLower = email.toLowerCase().trim();
    const raw = await redis.get(`user:${emailLower}`);

    if (!raw) {
      return new Response(JSON.stringify({ error: 'Invalid email or password' }), { status: 401 });
    }

    const user = typeof raw === 'string' ? JSON.parse(raw) : raw;

    if (user.status === 'rejected') {
      return new Response(JSON.stringify({ error: 'Your registration has been rejected' }), { status: 403 });
    }

    if (user.status === 'pending') {
      return new Response(JSON.stringify({
        error: 'Your registration is still pending admin approval',
        pending: true,
      }), { status: 403 });
    }

    const hashedInput = hashPassword(password, user.salt);
    if (hashedInput !== user.password) {
      return new Response(JSON.stringify({ error: 'Invalid email or password' }), { status: 401 });
    }

    const token = generateToken();
    await redis.set(`token:${token}`, emailLower, { ex: 60 * 60 * 24 * 30 });

    return new Response(JSON.stringify({ message: 'Login successful', token }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': `auth_token=${token}; HttpOnly; Path=/; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax`,
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
}
