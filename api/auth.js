const { Redis } = require('@upstash/redis');

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const r = Redis.fromEnv();

  // POST: Teacher sets access code
  if (req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch(e) { body = {}; }
    }
    const { teacherKey, accessCode } = body || {};
    if (teacherKey !== process.env.TEACHER_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!accessCode || accessCode.trim().length < 1) {
      return res.status(400).json({ error: 'Access code required' });
    }
    const code = accessCode.trim();
    await r.set('access_code', code);
    return res.json({ ok: true, accessCode: code });
  }

  // GET: Teacher retrieves current code
  const query = req.query || {};
  if (query.getcode === '1' || query.getcode === 'true') {
    if (query.key !== process.env.TEACHER_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const current = await r.get('access_code');
    return res.json({ accessCode: current || null });
  }

  // GET: Student checks access code
  const code = query.code;
  if (!code) {
    return res.json({ valid: false, noCode: true });
  }

  const storedCode = await r.get('access_code');
  if (!storedCode) {
    return res.json({ valid: false, noCode: true });
  }

  return res.json({ valid: storedCode === code.trim() });
};
