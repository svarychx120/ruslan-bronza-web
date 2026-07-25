const redis = require('../../lib/redis.js');

async function getAdminFromToken(req) {
  const cookies = req.headers.cookie || '';
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

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const admin = await getAdminFromToken(req);
    if (!admin) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const raw = await redis.get(`user:${email.toLowerCase().trim()}`);
    if (!raw) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = typeof raw === 'string' ? JSON.parse(raw) : raw;
    user.status = 'approved';
    await redis.set(`user:${email.toLowerCase().trim()}`, JSON.stringify(user));

    return res.status(200).json({ message: 'User approved' });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
};
