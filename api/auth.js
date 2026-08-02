import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();
const WLIST_KEY = 'student_whitelist';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // POST: Teacher adds or removes a student
    if (req.method === 'POST') {
      const { teacherKey, action, name } = req.body || {};
      if (teacherKey !== process.env.TEACHER_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      if (!name || name.trim().length < 1) {
        return res.status(400).json({ error: 'Student name required' });
      }
      const studentName = name.trim();

      const raw = await redis.get(WLIST_KEY);
      let list = [];
      if (raw) {
        try { list = JSON.parse(raw); if (!Array.isArray(list)) list = []; } catch(e) { list = []; }
      }

      if (action === 'add') {
        if (!list.some(n => n.toLowerCase() === studentName.toLowerCase())) {
          list.push(studentName);
          await redis.set(WLIST_KEY, JSON.stringify(list));
        }
        return res.json({ ok: true, students: list });
      }

      if (action === 'remove') {
        list = list.filter(n => n.toLowerCase() !== studentName.toLowerCase());
        await redis.set(WLIST_KEY, JSON.stringify(list));
        return res.json({ ok: true, students: list });
      }

      return res.status(400).json({ error: 'Invalid action' });
    }

    // GET
    const query = req.query || {};

    // Teacher retrieves full student list
    if (query.getlist === '1' || query.getlist === 'true') {
      if (query.key !== process.env.TEACHER_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const raw = await redis.get(WLIST_KEY);
      let list = [];
      if (raw) {
        try { list = JSON.parse(raw); if (!Array.isArray(list)) list = []; } catch(e) { list = []; }
      }
      return res.json({ students: list });
    }

    // Student checks if their name is on the list
    const name = query.name;
    if (!name) {
      return res.json({ valid: false, empty: true });
    }

    const raw = await redis.get(WLIST_KEY);
    let list = [];
    if (raw) {
      try { list = JSON.parse(raw); if (!Array.isArray(list)) list = []; } catch(e) { list = []; }
    }

    if (list.length === 0) {
      return res.json({ valid: false, empty: true });
    }

    const matched = list.find(n => n.toLowerCase() === name.trim().toLowerCase());
    return res.json({ valid: !!matched, name: matched || null });

  } catch(err) {
    return res.status(500).json({ error: 'Server error', detail: err.message });
  }
}
