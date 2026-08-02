import { kv } from '@vercel/kv';

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
    const rawScores = await kv.lrange('scores', 0, 499);
    const scores = rawScores.map(s => {
      try { return JSON.parse(s); } catch { return null; }
    }).filter(Boolean);

    res.status(200).json({ scores, count: scores.length });
  } catch (err) {
    // If KV not configured
    res.status(500).json({ error: 'Storage not available', scores: [] });
  }
}
