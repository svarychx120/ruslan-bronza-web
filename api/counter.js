const redis = require('../lib/redis.js');

const KEY = 'prompt_counter_start';

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let startTime = await redis.get(KEY);

    if (!startTime) {
      startTime = Date.now();
      await redis.set(KEY, startTime);
    }

    return res.status(200).json({ startTime: Number(startTime) });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
};
