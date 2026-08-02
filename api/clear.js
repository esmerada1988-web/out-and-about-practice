import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  // Allow POST and DELETE
  if (req.method !== 'POST' && req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Auth check
    const key = req.query.key || (req.body && req.body.key);
    if (!key || key !== process.env.TEACHER_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await kv.del('scores');
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Storage not available' });
  }
}
