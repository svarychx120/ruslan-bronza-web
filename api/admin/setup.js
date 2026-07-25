const redis = require('../../lib/redis.js');
const crypto = require('crypto');

function hashPassword(password, salt) {
  return crypto.createHash('sha256').update(password + salt).digest('hex');
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const alreadySet = await redis.get('admin_created');
    if (alreadySet) {
      return res.status(409).json({ error: 'Admin already set up' });
    }

    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
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

    return res.status(201).json({ message: 'Admin account created successfully' });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
};
