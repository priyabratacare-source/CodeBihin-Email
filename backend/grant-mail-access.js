import "dotenv/config";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const [emailArg, action = "grant"] = process.argv.slice(2);
if (!emailArg || !["grant", "revoke"].includes(action)) {
  console.error("Usage: npm run mail-access -- official@codebihin.in grant|revoke");
  process.exit(1);
}
const email = emailArg.trim().toLowerCase();
const parts = email.split("@");
if (parts.length !== 2 || !parts[0] || !(parts[1] === "codebihin.in" || parts[1].endsWith(".codebihin.in"))) {
  console.error("Only CodeBihin root-domain or subdomain accounts are allowed.");
  process.exit(1);
}
let serviceAccount;
try { serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || ""); }
catch { console.error("Set FIREBASE_SERVICE_ACCOUNT_JSON in the backend environment."); process.exit(1); }
if (!getApps().length) initializeApp({ credential: cert(serviceAccount) });
const auth = getAuth();
const user = await auth.getUserByEmail(email);
const claims = { ...(user.customClaims || {}) };
if (action === "grant") claims.mailAccess = true;
else delete claims.mailAccess;
await auth.setCustomUserClaims(user.uid, claims);
console.log(`${action === "grant" ? "Granted" : "Revoked"} shared mailbox access for ${email}. The user must sign out and sign in again.`);
