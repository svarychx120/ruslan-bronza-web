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
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const admin = await getAdminFromToken(req);
    if (!admin) {
      return res.status(401).json({ error: 'Unauthorized' });
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

    return res.status(200).json({ users });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
};
