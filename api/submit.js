import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, source, mode, score, correct, wrong, total, pct } = req.body;

    // Basic validation
    if (!name || typeof name !== 'string' || name.length > 50) {
      return res.status(400).json({ error: 'Invalid name' });
    }
    if (!source) {
      return res.status(400).json({ error: 'Missing source' });
    }

    // Build score record
    const record = {
      name: name.trim(),
      source: String(source),
      mode: String(mode || ''),
      score: Number(score) || 0,
      correct: Number(correct) || 0,
      wrong: Number(wrong) || 0,
      total: Number(total) || 0,
      pct: Number(pct) || 0,
      time: new Date().toISOString(),
      id: Date.now() + Math.floor(Math.random() * 1000)
    };

    // Store in KV list (keep last 1000 entries)
    await kv.lpush('scores', JSON.stringify(record));
    await kv.ltrim('scores', 0, 999);

    res.status(200).json({ success: true, id: record.id });
  } catch (err) {
    // If KV is not configured, return error (student page will fallback to score code)
    res.status(500).json({ error: 'Storage not available', fallback: true });
  }
}
