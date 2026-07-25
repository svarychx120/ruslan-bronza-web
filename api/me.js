const redis = require('../lib/redis.js');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const cookies = req.headers.cookie || '';
    const tokenMatch = cookies.match(/auth_token=([^;]+)/);
    const token = tokenMatch ? tokenMatch[1] : null;

    if (!token) {
      return res.status(401).json({ authenticated: false });
    }

    const email = await redis.get(`token:${token}`);
    if (!email) {
      return res.status(401).json({ authenticated: false });
    }

    const raw = await redis.get(`user:${email}`);
    if (!raw) {
      return res.status(401).json({ authenticated: false });
    }

    const user = typeof raw === 'string' ? JSON.parse(raw) : raw;

    return res.status(200).json({
      authenticated: true,
      user: {
        name: user.name,
        surname: user.surname,
        group: user.group,
        email: user.email,
        status: user.status,
        tier: user.tier,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
};
