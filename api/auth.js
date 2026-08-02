const { Redis } = require('@upstash/redis');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const r = Redis.fromEnv();
  const WLIST_KEY = 'student_whitelist';

  async function getWhitelist() {
    const raw = await r.get(WLIST_KEY);
    if (!raw) return [];
    try {
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch(e) {
      return [];
    }
  }

  async function saveWhitelist(arr) {
    await r.set(WLIST_KEY, JSON.stringify(arr));
  }

  // POST: Teacher adds or removes a student
  if (req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch(e) { body = {}; }
    }
    const { teacherKey, action, name } = body || {};
    if (teacherKey !== process.env.TEACHER_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!name || name.trim().length < 1) {
      return res.status(400).json({ error: 'Student name required' });
    }
    const studentName = name.trim();
    let list = await getWhitelist();

    if (action === 'add') {
      if (!list.some(n => n.toLowerCase() === studentName.toLowerCase())) {
        list.push(studentName);
        await saveWhitelist(list);
      }
      return res.json({ ok: true, students: list });
    }

    if (action === 'remove') {
      list = list.filter(n => n.toLowerCase() !== studentName.toLowerCase());
      await saveWhitelist(list);
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
    const list = await getWhitelist();
    return res.json({ students: list });
  }

  // Student checks if their name is on the list
  const name = query.name;
  if (!name) {
    return res.json({ valid: false, empty: true });
  }

  const list = await getWhitelist();
  if (list.length === 0) {
    return res.json({ valid: false, empty: true });
  }

  const matched = list.find(n => n.toLowerCase() === name.trim().toLowerCase());
  return res.json({ valid: !!matched, name: matched || null });
};
