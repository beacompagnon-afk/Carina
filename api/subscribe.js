module.exports = async (req, res) => {
  const send = (c, o) => { try { res.statusCode = c; res.setHeader('Content-Type','application/json'); res.end(JSON.stringify(o)); } catch (_) {} };
  if (req.method !== 'POST') return send(405, { error: 'POST only' });
  try {
    const KEY = process.env.FIREBASE_API_KEY, PROJ = process.env.FIREBASE_PROJECT_ID, PUSHID = process.env.PUSH_DOC_ID;
    if (!KEY || !PROJ || !PUSHID) return send(500, { error: 'missing env vars' });
    let payload = req.body;
    if (!payload || typeof payload !== 'object') {
      let raw = '';
      await new Promise((r) => { req.on('data', (c) => raw += c); req.on('end', r); req.on('error', r); });
      try { payload = JSON.parse(raw || '{}'); } catch (e) { return send(400, { error: 'bad json' }); }
    }
    const sub = payload && payload.sub;
    if (!sub || !sub.endpoint) return send(400, { error: 'no subscription' });
    const url = `https://firestore.googleapis.com/v1/projects/${PROJ}/databases/(default)/documents/pushsubs/${PUSHID}?key=${KEY}`;
    const r = await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: { sub: { stringValue: JSON.stringify(sub) } } }) });
    if (!r.ok) return send(502, { error: 'firestore write failed', status: r.status });
    return send(200, { ok: true });
  } catch (e) { send(500, { error: String(e) }); }
};
