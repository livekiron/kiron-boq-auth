// pages/api/auth/verify.js
import allowedData from "../../../../allowed.json";
import fs from "fs";
import path from "path";

function getClientIp(req) {
  const xff = req.headers['x-forwarded-for'] || req.headers['X-Forwarded-For'];
  if (xff) return String(xff).split(',')[0].trim();
  return req.socket?.remoteAddress || null;
}

export default function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();

  const { email, device } = req.query || {};

  if (!email || !device) {
    return res.status(400).json({ success: false, message: "Email and device required" });
  }

  const allowed = allowedData.allowed || [];
  if (!allowed.includes(email)) {
    return res.status(403).json({ success: false, allowed: false, message: "Email not allowed" });
  }

  const dbPath = path.join(process.cwd(), "database.json");
  let db = { devices: {} };
  try {
    const raw = fs.readFileSync(dbPath, "utf8");
    db = raw ? JSON.parse(raw) : { devices: {} };
    if (!db.devices) db.devices = {};
  } catch (e) {
    db = { devices: {} };
  }

  const clientIp = getClientIp(req);
  const now = new Date().toISOString();

  const existing = db.devices[email];

  if (!existing) {
    // first-time: register device
    db.devices[email] = {
      deviceId: device,
      ip: clientIp,
      firstVerifiedAt: now,
      lastSeenAt: now,
      lastIpSeen: clientIp
    };
    try {
      fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
    } catch (err) {
      console.error("Write DB error:", err);
      return res.status(500).json({ success: false, message: "Server error" });
    }
    return res.status(200).json({ success: true, allowed: true, message: "Verified and device locked (first time)" });
  }

  // if same device -> update lastSeen
  if (existing.deviceId === device) {
    existing.lastSeenAt = now;
    existing.lastIpSeen = clientIp || existing.lastIpSeen;
    db.devices[email] = existing;
    try {
      fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
    } catch (err) {
      console.error("Write DB error:", err);
    }
    return res.status(200).json({ success: true, allowed: true, message: "Email + Device matched. Access allowed." });
  }

  // mismatch -> blocked
  return res.status(403).json({
    success: false,
    allowed: false,
    message: "This email is already used on another PC.",
    info: { registeredIp: existing.ip, firstVerifiedAt: existing.firstVerifiedAt }
  });
}
