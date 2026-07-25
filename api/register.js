const redis = require('../lib/redis.js');
const crypto = require('crypto');

function hashPassword(password, salt) {
  return crypto.createHash('sha256').update(password + salt).digest('hex');
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, surname, group, email, password } = req.body;

    if (!name || !surname || !group || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const emailLower = email.toLowerCase().trim();

    const existing = await redis.get(`user:${emailLower}`);
    if (existing) {
      return res.status(409).json({ error: 'This email is already registered' });
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

    return res.status(201).json({ message: 'Registration submitted. Awaiting admin approval.' });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
};
