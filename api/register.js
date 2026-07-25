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
    const { name, surname, group, email, password } = await req.json();

    if (!name || !surname || !group || !email || !password) {
      return new Response(JSON.stringify({ error: 'All fields are required' }), { status: 400 });
    }

    const emailLower = email.toLowerCase().trim();

    const existing = await redis.get(`user:${emailLower}`);
    if (existing) {
      return new Response(JSON.stringify({ error: 'This email is already registered' }), { status: 409 });
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const hashedPassword = hashPassword(password, salt);

    const user = {
      name: name.trim(),
      surname: surname.trim(),
      group: group.trim(),
      email: emailLower,
      password: hashedPassword,
      salt,
      status: 'pending',
      tier: 'member',
      createdAt: Date.now(),
    };

    await redis.set(`user:${emailLower}`, JSON.stringify(user));

    return new Response(JSON.stringify({ message: 'Registration submitted. Awaiting admin approval.' }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
}
