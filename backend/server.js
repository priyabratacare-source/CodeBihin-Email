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

if (!getApps().length) {
  initializeApp({ credential: cert(serviceAccount) });
}

const firebaseAuth = getAuth();
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.disable("x-powered-by");
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    // Permit server-to-server and command-line requests without an Origin header.
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Origin not allowed by CORS"));
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Bootstrap-Secret"]
}));
app.use(express.json({ limit: "32kb" }));
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 120,
  standardHeaders: "draft-7",
  legacyHeaders: false
}));

function isCodeBihinEmail(email) {
  if (typeof email !== "string") return false;
  const parts = email.trim().toLowerCase().split("@");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return false;
  const domain = parts[1];
  return domain === "codebihin.in" || domain.endsWith(".codebihin.in");
}

async function requireFirebaseUser(req, res, next) {
  const header = req.headers.authorization || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return res.status(401).json({ error: "A Firebase ID token is required." });
  }

  try {
    const decoded = await firebaseAuth.verifyIdToken(match[1], true);
    if (!isCodeBihinEmail(decoded.email)) {
      return res.status(403).json({ error: "Only CodeBihin email accounts are allowed." });
    }
    req.user = decoded;
    return next();
  } catch {
    return res.status(401).json({ error: "Your session is invalid or expired. Sign in again." });
  }
}

function requireAdmin(req, res, next) {
  const isAdmin = req.user?.admin === true || req.user?.role === "super_admin";
  if (!isAdmin) {
    return res.status(403).json({ error: "Administrator permission required." });
  }
  return next();
}

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "CodeBihin Email API" });
});

app.get("/api/me", requireFirebaseUser, (req, res) => {
  res.json({
    uid: req.user.uid,
    email: req.user.email || null,
    role: req.user.role || "employee",
    admin: req.user.admin === true
  });
});

app.get("/api/admin/status", requireFirebaseUser, requireAdmin, (_req, res) => {
  res.json({ authorized: true, message: "Administrator access verified." });
});

// One-time setup endpoint. It can only grant admin to the UID configured on the VPS.
// Disable it after the first successful bootstrap by removing BOOTSTRAP_SECRET.
app.post("/api/admin/bootstrap", async (req, res) => {
  const configuredSecret = process.env.BOOTSTRAP_SECRET;
  const suppliedSecret = req.get("X-Bootstrap-Secret") || "";

  if (!configuredSecret || !process.env.BOOTSTRAP_ADMIN_UID) {
    return res.status(404).json({ error: "Bootstrap is not enabled." });
  }

  const expected = Buffer.from(configuredSecret);
  const supplied = Buffer.from(suppliedSecret);
  if (
    expected.length !== supplied.length ||
    !crypto.timingSafeEqual(expected, supplied)
  ) {
    return res.status(401).json({ error: "Invalid bootstrap credential." });
  }

  try {
    const uid = process.env.BOOTSTRAP_ADMIN_UID;
    const user = await firebaseAuth.getUser(uid);

    if (!isCodeBihinEmail(user.email)) {
      return res.status(400).json({
        error: "The configured first-admin account must use a CodeBihin email address."
      });
    }

    await firebaseAuth.setCustomUserClaims(uid, {
      ...(user.customClaims || {}),
      admin: true,
      role: "super_admin"
    });

    return res.json({
      success: true,
      message: "First administrator claim assigned. Sign out and sign in again.",
      uid
    });
  } catch (error) {
    console.error("Admin bootstrap failed:", error.code || error.message);
    return res.status(500).json({ error: "Could not complete administrator setup." });
  }
});

app.use((error, _req, res, _next) => {
  if (error.message === "Origin not allowed by CORS") {
    return res.status(403).json({ error: "This website origin is not allowed." });
  }
  if (error instanceof SyntaxError && "body" in error) {
    return res.status(400).json({ error: "Invalid JSON request body." });
  }
  console.error("Unhandled API error:", error.message);
  return res.status(500).json({ error: "Internal server error." });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`CodeBihin Email API listening on port ${PORT}`);
});
