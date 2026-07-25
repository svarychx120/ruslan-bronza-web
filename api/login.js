const redis = require('../lib/redis.js');
const crypto = require('crypto');

function hashPassword(password, salt) {
  return crypto.createHash('sha256').update(password + salt).digest('hex');
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const emailLower = email.toLowerCase().trim();
    const raw = await redis.get(`user:${emailLower}`);

    if (!raw) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = typeof raw === 'string' ? JSON.parse(raw) : raw;

    if (user.status === 'rejected') {
      return res.status(403).json({ error: 'Your registration has been rejected' });
    }

    if (user.status === 'pending') {
      return res.status(403).json({ error: 'Your registration is still pending admin approval', pending: true });
    }

    const hashedInput = hashPassword(password, user.salt);
    if (hashedInput !== user.password) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken();
    await redis.set(`token:${token}`, emailLower, { ex: 60 * 60 * 24 * 30 });

    res.setHeader('Set-Cookie', `auth_token=${token}; HttpOnly; Path=/; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax`);
    return res.status(200).json({ message: 'Login successful', token });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
};
