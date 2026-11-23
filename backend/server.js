import "dotenv/config";
import crypto from "node:crypto";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const app = express();
const PORT = Number(process.env.PORT || 3000);
const MAILBOX = (process.env.HOSTINGER_MAILBOX || "admin@codebihin.in").toLowerCase();
const HOSTINGER_API = "https://api.mail.hostinger.com";

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}

let serviceAccount;
try {
  serviceAccount = JSON.parse(requiredEnv("FIREBASE_SERVICE_ACCOUNT_JSON"));
} catch {
  console.error("FIREBASE_SERVICE_ACCOUNT_JSON must contain valid JSON.");
  process.exit(1);
}
if (!getApps().length) initializeApp({ credential: cert(serviceAccount) });

const firebaseAuth = getAuth();
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",").map((origin) => origin.trim()).filter(Boolean);

app.disable("x-powered-by");
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Origin not allowed by CORS"));
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Bootstrap-Secret"]
}));
app.use(express.json({ limit: "64kb" }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 120, standardHeaders: "draft-7", legacyHeaders: false }));

function isCodeBihinEmail(email) {
  if (typeof email !== "string") return false;
  const parts = email.trim().toLowerCase().split("@");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return false;
  return parts[1] === "codebihin.in" || parts[1].endsWith(".codebihin.in");
}

async function requireFirebaseUser(req, res, next) {
  const match = (req.headers.authorization || "").match(/^Bearer\s+(.+)$/i);
  if (!match) return res.status(401).json({ error: "A Firebase ID token is required." });
  try {
    const decoded = await firebaseAuth.verifyIdToken(match[1], true);
    if (!isCodeBihinEmail(decoded.email)) return res.status(403).json({ error: "Only CodeBihin accounts are allowed." });
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Your session is invalid or expired. Sign in again." });
  }
}

function requireMailAccess(req, res, next) {
  if (req.user?.mailAccess === true || req.user?.admin === true || req.user?.role === "super_admin") return next();
  return res.status(403).json({ error: "Your account is signed in but has not been granted official mailbox access." });
}
function requireAdmin(req, res, next) {
  if (req.user?.admin === true || req.user?.role === "super_admin") return next();
  return res.status(403).json({ error: "Administrator permission required." });
}

async function hostingerRequest(path, options = {}) {
  const token = requiredEnv("HOSTINGER_API_TOKEN");
  const response = await fetch(`${HOSTINGER_API}${path}`, {
    method: options.method || "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {})
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {})
  });
  const raw = await response.text();
  let payload = {};
  try { payload = raw ? JSON.parse(raw) : {}; } catch { payload = { error: "Hostinger returned an unreadable response." }; }
  if (!response.ok) {
    const error = new Error(payload.error || `Hostinger API request failed (${response.status}).`);
    error.status = response.status;
    error.code = payload.code || "HOSTINGER_API_ERROR";
    throw error;
  }
  return { status: response.status, payload };
}

let mailboxResourceIdCache = null;
let mailboxResourceIdCacheAt = 0;
async function getMailboxResourceId() {
  if (mailboxResourceIdCache && Date.now() - mailboxResourceIdCacheAt < 5 * 60 * 1000) return mailboxResourceIdCache;
  const { payload } = await hostingerRequest("/api/v1/me");
  const mailboxes = payload?.data?.mailboxes || [];
  const mailbox = mailboxes.find((item) => String(item.address || "").toLowerCase() === MAILBOX);
  if (!mailbox?.resourceId) {
    throw new Error(`Hostinger API token cannot access the configured mailbox ${MAILBOX}. Check the token's selected-mailbox scope.`);
  }
  mailboxResourceIdCache = mailbox.resourceId;
  mailboxResourceIdCacheAt = Date.now();
  return mailboxResourceIdCache;
}

function safeFolder(value) {
  return typeof value === "string" && value.length > 0 && value.length <= 180 && !/[\\r\\n]/.test(value);
}
function formatAddress(item) {
  if (!item) return "";
  return [item.name, item.address].filter(Boolean).join(" ");
}
function hostingerError(res, error, action) {
  console.error(`${action} failed:`, error.code || error.message);
  const status = error.status === 401 || error.status === 403 ? error.status : 502;
  res.status(status).json({
    error: status === 401 ? "Hostinger API token is invalid or expired."
      : status === 403 ? "The Hostinger API token is not authorised for this mailbox."
      : "Hostinger Mail API could not complete the request. Check the mailbox token scope and API response."
  });
}

app.get("/health", (_req, res) => res.json({ status: "ok", service: "CodeBihin Email API" }));
app.get("/api/me", requireFirebaseUser, (req, res) => res.json({
  uid: req.user.uid,
  email: req.user.email || null,
  mailAccess: req.user.mailAccess === true || req.user.admin === true || req.user.role === "super_admin",
  admin: req.user.admin === true
}));
app.get("/api/admin/status", requireFirebaseUser, requireAdmin, (_req, res) => res.json({ authorized: true }));

app.get("/api/mail/identity", requireFirebaseUser, requireMailAccess, (_req, res) => {
  res.json({ mailbox: MAILBOX });
});

app.get("/api/mail/folders", requireFirebaseUser, requireMailAccess, async (_req, res) => {
  try {
    const mailboxId = await getMailboxResourceId();
    const { payload } = await hostingerRequest(`/api/v1/mailboxes/${encodeURIComponent(mailboxId)}/folders?perPage=100`);
    const folders = (payload.data || []).map((folder) => ({
      path: folder.path,
      name: folder.name,
      specialUse: folder.specialUse || null,
      messageCount: folder.messageCount ?? 0,
      unreadCount: folder.unreadCount ?? 0
    }));
    res.json({ folders });
  } catch (error) { hostingerError(res, error, "Hostinger folder listing"); }
});

app.get("/api/mail/messages", requireFirebaseUser, requireMailAccess, async (req, res) => {
  const folder = req.query.folder || "INBOX";
  const page = Math.max(1, Math.min(10000, Number.parseInt(req.query.page || "1", 10) || 1));
  if (!safeFolder(folder)) return res.status(400).json({ error: "Invalid mailbox folder." });
  try {
    const mailboxId = await getMailboxResourceId();
    const path = `/api/v1/mailboxes/${encodeURIComponent(mailboxId)}/folders/${encodeURIComponent(folder)}/messages?page=${page}&perPage=30&sort=-date`;
    const { payload } = await hostingerRequest(path);
    const messages = (payload.data || []).map((item) => ({
      uid: item.uid,
      from: formatAddress(item.from),
      subject: item.subject || "(No subject)",
      date: item.date || null,
      preview: "",
      unread: item.unseen === true
    }));
    res.json({
      messages,
      total: payload.pagination?.total ?? messages.length,
      page: payload.pagination?.page ?? page
    });
  } catch (error) { hostingerError(res, error, "Hostinger message list"); }
});

app.get("/api/mail/messages/:uid", requireFirebaseUser, requireMailAccess, async (req, res) => {
  const uid = Number.parseInt(req.params.uid, 10);
  const folder = req.query.folder || "INBOX";
  if (!Number.isSafeInteger(uid) || uid < 1 || !safeFolder(folder)) return res.status(400).json({ error: "Invalid message reference." });
  try {
    const mailboxId = await getMailboxResourceId();
    const base = `/api/v1/mailboxes/${encodeURIComponent(mailboxId)}/folders/${encodeURIComponent(folder)}/messages/${uid}`;
    const [{ payload: messagePayload }, { payload: textPayload }] = await Promise.all([
      hostingerRequest(base),
      hostingerRequest(`${base}/text`)
    ]);
    const item = messagePayload.data || {};
    const body = textPayload.data || {};
    res.json({ message: {
      uid,
      from: formatAddress(item.from),
      fromAddress: item.from?.address || "",
      replyTo: item.from?.address || "",
      to: (item.to || []).map(formatAddress).join(", "),
      subject: item.subject || "(No subject)",
      date: item.date || null,
      text: body.text || ""
    }});
  } catch (error) { hostingerError(res, error, "Hostinger message read"); }
});

app.post("/api/mail/send", requireFirebaseUser, requireMailAccess, async (req, res) => {
  const { to, subject = "", text = "" } = req.body || {};
  const recipients = typeof to === "string" ? to.split(",").map((item) => item.trim()).filter(Boolean)
    : Array.isArray(to) ? to : [];
  if (!recipients.length || recipients.length > 10 || recipients.some((email) => typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    return res.status(400).json({ error: "Enter between 1 and 10 valid recipient email addresses." });
  }
  if (typeof subject !== "string" || subject.length > 200 || typeof text !== "string" || !text.trim() || text.length > 50000) {
    return res.status(400).json({ error: "Check the subject and message. Message must be under 50,000 characters." });
  }
  try {
    const mailboxId = await getMailboxResourceId();
    await hostingerRequest(`/api/v1/mailboxes/${encodeURIComponent(mailboxId)}/send`, {
      method: "POST",
      body: { to: recipients, displayName: "CodeBihin Official", subject, text }
    });
    console.info("Shared mailbox message sent by official:", req.user.email || req.user.uid);
    res.json({ success: true, from: MAILBOX });
  } catch (error) { hostingerError(res, error, "Hostinger send"); }
});

// One-time bootstrap for the first administrator. Remove BOOTSTRAP_SECRET after use.
app.post("/api/admin/bootstrap", async (req, res) => {
  const configuredSecret = process.env.BOOTSTRAP_SECRET;
  const suppliedSecret = req.get("X-Bootstrap-Secret") || "";
  if (!configuredSecret || !process.env.BOOTSTRAP_ADMIN_UID) return res.status(404).json({ error: "Bootstrap is not enabled." });
  const expected = Buffer.from(configuredSecret);
  const supplied = Buffer.from(suppliedSecret);
  if (expected.length !== supplied.length || !crypto.timingSafeEqual(expected, supplied)) {
    return res.status(401).json({ error: "Invalid bootstrap credential." });
  }
  try {
    const uid = process.env.BOOTSTRAP_ADMIN_UID;
    const user = await firebaseAuth.getUser(uid);
    if (!isCodeBihinEmail(user.email)) return res.status(400).json({ error: "The configured first-admin account must use a CodeBihin email address." });
    await firebaseAuth.setCustomUserClaims(uid, { ...(user.customClaims || {}), admin: true, mailAccess: true, role: "super_admin" });
    res.json({ success: true, message: "First administrator and mailbox access assigned. Sign out and sign in again.", uid });
  } catch (error) {
    console.error("Admin bootstrap failed:", error.code || error.message);
    res.status(500).json({ error: "Could not complete administrator setup." });
  }
});

app.use((error, _req, res, _next) => {
  if (error.message === "Origin not allowed by CORS") return res.status(403).json({ error: "This website origin is not allowed." });
  if (error instanceof SyntaxError && "body" in error) return res.status(400).json({ error: "Invalid JSON request body." });
  console.error("Unhandled API error:", error.message);
  res.status(500).json({ error: "Internal server error." });
});
app.listen(PORT, "0.0.0.0", () => console.log(`CodeBihin Email API listening on port ${PORT}`));
