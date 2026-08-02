import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Simple auth: require teacher key
    const key = req.query.key;
    if (!key || key !== process.env.TEACHER_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get last 500 scores
    const rawScores = await redis.lrange('scores', 0, 499);
    const scores = (rawScores || []).map(s => {
      try { return typeof s === 'string' ? JSON.parse(s) : s; } catch { return null; }
    }).filter(Boolean);

    res.status(200).json({ scores, count: scores.length });
  } catch (err) {
    res.status(500).json({ error: 'Storage not available', scores: [], detail: err.message });
  }
}
