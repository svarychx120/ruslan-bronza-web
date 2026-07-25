const redis = require('../../lib/redis.js');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await redis.del('admin_created');
    // Also delete the test admin user
    const keys = await redis.keys('user:*');
    for (const key of keys) {
      const raw = await redis.get(key);
      if (!raw) continue;
      const user = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (user.tier === 'admin') {
        await redis.del(key);
      }
    }
    return res.status(200).json({ message: 'Admin reset. You can now run setup again.' });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
};
