const webpush = require('web-push');

const LINES = [
  "something\u2019s been delivered.",
  "today\u2019s delivery is here."
];

module.exports = async (req, res) => {
  const send = (code, obj) => { try { res.statusCode = code; res.setHeader('Content-Type','application/json'); res.end(JSON.stringify(obj)); } catch (_) {} };
  try {
    const PUB = process.env.VAPID_PUBLIC, PRIV = process.env.VAPID_PRIVATE,
          KEY = process.env.FIREBASE_API_KEY, PROJ = process.env.FIREBASE_PROJECT_ID,
          PUSHID = process.env.PUSH_DOC_ID;
    if (!PUB || !PRIV || !KEY || !PROJ || !PUSHID) return send(500, { error: 'missing env vars' });
    try { webpush.setVapidDetails('mailto:beacompagnon@gmail.com', PUB, PRIV); }
    catch (e) { return send(500, { error: 'bad VAPID keys: ' + String(e) }); }
    const msg = LINES[Math.floor(Math.random() * LINES.length)];
    let data;
    try {
      const url = `https://firestore.googleapis.com/v1/projects/${PROJ}/databases/(default)/documents/pushsubs/${PUSHID}?key=${KEY}`;
      const r = await fetch(url);
      if (!r.ok) return send(200, { sent: 0, note: 'no subscription yet', status: r.status });
      data = await r.json();
    } catch (e) { return send(502, { error: 'firestore fetch failed: ' + String(e) }); }
    const subStr = data && data.fields && data.fields.sub && data.fields.sub.stringValue;
    if (!subStr) return send(200, { sent: 0, note: 'no sub field' });
    try { await webpush.sendNotification(JSON.parse(subStr), msg); return send(200, { sent: 1, msg }); }
    catch (err) { return send(200, { sent: 0, note: 'subscription expired/invalid', code: err && err.statusCode }); }
  } catch (e) { send(500, { error: String(e) }); }
};
