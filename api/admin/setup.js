import redis from '../_redis.js';
import crypto from 'crypto';

function hashPassword(password, salt) {
  return crypto.createHash('sha256').update(password + salt).digest('hex');
}

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const alreadySet = await redis.get('admin_created');
    if (alreadySet) {
      return new Response(JSON.stringify({ error: 'Admin already set up' }), { status: 409 });
    }

    const { email, password } = await req.json();
    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Email and password are required' }), { status: 400 });
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const hashedPassword = hashPassword(password, salt);

    await redis.set(`user:${email.toLowerCase().trim()}`, JSON.stringify({
      name: 'Admin',
      surname: '',
      group: 'admin',
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      salt,
      status: 'approved',
      tier: 'admin',
      createdAt: Date.now(),
    }));

    await redis.set('admin_created', true);

    return new Response(JSON.stringify({ message: 'Admin account created successfully' }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
}
