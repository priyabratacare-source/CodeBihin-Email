import "dotenv/config";
import crypto from "node:crypto";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import nodemailer from "nodemailer";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const app = express();
const PORT = Number(process.env.PORT || 3000);
const MAILBOX = process.env.HOSTINGER_MAILBOX || "admin@codebihin.in";

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
function makeImapClient() {
  return new ImapFlow({
    host: process.env.HOSTINGER_IMAP_HOST || "imap.hostinger.com",
    port: Number(process.env.HOSTINGER_IMAP_PORT || 993),
    secure: true,
    auth: { user: MAILBOX, pass: requiredEnv("HOSTINGER_APP_PASSWORD") },
    logger: false
  });
}
async function withMailbox(folder, action) {
  const client = makeImapClient();
  await client.connect();
  let lock;
  try {
    lock = await client.getMailboxLock(folder);
    return await action(client);
  } finally {
    lock?.release();
    await client.logout().catch(() => {});
  }
}
function formatAddresses(addresses = []) {
  return addresses.map((item) => [item.name, item.address].filter(Boolean).join(" ")).join(", ");
}
function safeFolder(value) {
  return typeof value === "string" && value.length > 0 && value.length <= 180 && !/[\r\n]/.test(value);
}
async function getFolders(client) {
  const folders = await client.list();
  return folders.map((folder) => ({
    path: folder.path,
    name: folder.name,
    specialUse: folder.specialUse || null
  }));
}

app.get("/health", (_req, res) => res.json({ status: "ok", service: "CodeBihin Email API" }));
app.get("/api/me", requireFirebaseUser, (req, res) => res.json({
  uid: req.user.uid,
  email: req.user.email || null,
  mailAccess: req.user.mailAccess === true || req.user.admin === true || req.user.role === "super_admin",
  admin: req.user.admin === true
}));
app.get("/api/admin/status", requireFirebaseUser, requireAdmin, (_req, res) => res.json({ authorized: true }));

app.get("/api/mail/identity", requireFirebaseUser, requireMailAccess, (_req, res) => res.json({ mailbox: MAILBOX }));
app.get("/api/mail/folders", requireFirebaseUser, requireMailAccess, async (_req, res) => {
  try {
    const folders = await withMailbox("INBOX", getFolders);
    res.json({ folders });
  } catch (error) {
    console.error("IMAP folder listing failed:", error.message);
    res.status(502).json({ error: "Could not connect to the Hostinger mailbox. Check the server-side IMAP settings." });
  }
});
app.get("/api/mail/messages", requireFirebaseUser, requireMailAccess, async (req, res) => {
  const folder = req.query.folder || "INBOX";
  const page = Math.max(1, Math.min(1000, Number.parseInt(req.query.page || "1", 10) || 1));
  if (!safeFolder(folder)) return res.status(400).json({ error: "Invalid mailbox folder." });
  try {
    const result = await withMailbox(folder, async (client) => {
      const folders = await getFolders(client);
      if (!folders.some((item) => item.path === folder)) throw new Error("FOLDER_NOT_FOUND");
      const uids = await client.search({ all: true }, { uid: true });
      const ordered = (uids || []).sort((a, b) => b - a);
      const pageUids = ordered.slice((page - 1) * 30, page * 30);
      const messages = [];
      if (pageUids.length) {
        for await (const item of client.fetch(pageUids.join(","), {
          uid: true, envelope: true, flags: true, internalDate: true
        }, { uid: true })) {
          messages.push({
            uid: item.uid,
            from: formatAddresses(item.envelope?.from),
            subject: item.envelope?.subject || "(No subject)",
            date: item.internalDate || item.envelope?.date || null,
            preview: "",
            unread: !item.flags?.has("\\Seen")
          });
        }
      }
      return { folders, messages, total: ordered.length, page };
    });
    res.json(result);
  } catch (error) {
    console.error("IMAP message list failed:", error.message);
    res.status(error.message === "FOLDER_NOT_FOUND" ? 404 : 502).json({
      error: error.message === "FOLDER_NOT_FOUND" ? "Mailbox folder not found." : "Could not load messages from Hostinger."
    });
  }
});
app.get("/api/mail/messages/:uid", requireFirebaseUser, requireMailAccess, async (req, res) => {
  const uid = Number.parseInt(req.params.uid, 10);
  const folder = req.query.folder || "INBOX";
  if (!Number.isSafeInteger(uid) || uid < 1 || !safeFolder(folder)) return res.status(400).json({ error: "Invalid message reference." });
  try {
    const message = await withMailbox(folder, async (client) => {
      const downloaded = await client.download(uid, undefined, { uid: true });
      const parsed = await simpleParser(downloaded.content);
      await client.messageFlagsAdd(uid, ["\\Seen"], { uid: true });
      return {
        uid,
        from: formatAddresses(parsed.from?.value),
        fromAddress: parsed.from?.value?.[0]?.address || "",
        replyTo: parsed.replyTo?.value?.[0]?.address || parsed.from?.value?.[0]?.address || "",
        to: formatAddresses(parsed.to?.value),
        subject: parsed.subject || "(No subject)",
        date: parsed.date || null,
        text: parsed.text || ""
      };
    });
    res.json({ message });
  } catch (error) {
    console.error("IMAP message read failed:", error.message);
    res.status(502).json({ error: "Could not open this message. It may have been moved or deleted." });
  }
});
app.post("/api/mail/send", requireFirebaseUser, requireMailAccess, async (req, res) => {
  const { to, subject = "", text = "" } = req.body || {};
  const recipients = typeof to === "string" ? to.split(",").map((item) => item.trim()).filter(Boolean) : [];
  if (!recipients.length || recipients.length > 10 || recipients.some((email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    return res.status(400).json({ error: "Enter between 1 and 10 valid recipient email addresses." });
  }
  if (typeof subject !== "string" || subject.length > 200 || typeof text !== "string" || !text.trim() || text.length > 50000) {
    return res.status(400).json({ error: "Check the subject and message. Message must be under 50,000 characters." });
  }
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.HOSTINGER_SMTP_HOST || "smtp.hostinger.com",
      port: Number(process.env.HOSTINGER_SMTP_PORT || 465),
      secure: true,
      auth: { user: MAILBOX, pass: requiredEnv("HOSTINGER_APP_PASSWORD") }
    });
    const sent = await transporter.sendMail({
      from: { name: "CodeBihin Official", address: MAILBOX },
      to: recipients,
      subject,
      text,
      headers: { "X-CodeBihin-Official-User": req.user.email || req.user.uid }
    });
    console.info("Shared mailbox message sent by official:", req.user.email || req.user.uid, sent.messageId);
    await transporter.close();
    res.json({ success: true, messageId: sent.messageId, from: MAILBOX });
  } catch (error) {
    console.error("SMTP send failed:", error.message);
    res.status(502).json({ error: "Hostinger could not send this message. Check SMTP settings and mailbox status." });
  }
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
