import { auth } from "./firebase-config.js";
import { API_BASE_URL } from "./api-config.js";
import { signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const togglePassword = document.getElementById("togglePassword");
const loginForm = document.getElementById("loginForm");
const message = document.getElementById("message");
const loginButton = document.getElementById("loginButton");
const year = document.getElementById("year");
if (year) year.textContent = new Date().getFullYear();

function showMessage(value) {
  if (message) message.textContent = value;
}
function isAllowedCodeBihinEmail(value) {
  const parts = value.trim().toLowerCase().split("@");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return false;
  return parts[1] === "codebihin.in" || parts[1].endsWith(".codebihin.in");
}
if (togglePassword && passwordInput) {
  togglePassword.addEventListener("click", () => {
    const show = passwordInput.type === "password";
    passwordInput.type = show ? "text" : "password";
    togglePassword.textContent = show ? "Hide" : "Show";
  });
}
if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;
    if (!isAllowedCodeBihinEmail(email)) return showMessage("Use your authorised CodeBihin email address.");
    if (!password) return showMessage("Enter your account password.");
    loginButton.disabled = true;
    loginButton.textContent = "Signing in…";
    showMessage("Verifying your official account…");
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      try { const token = await credential.user.getIdToken(); await fetch(API_BASE_URL.replace(/\\/$/, "") + "/api/audit/login-success", { method: "POST", headers: { Authorization: "Bearer " + token } }); } catch {}
      window.location.replace("./webmail.html");
    } catch (error) {
      try { await fetch(API_BASE_URL.replace(/\\/$/, "") + "/api/audit/login-failed", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) }); } catch {}
      const errors = {
        "auth/invalid-email": "Invalid email address.",
        "auth/user-not-found": "Account not found.",
        "auth/wrong-password": "Incorrect email or password.",
        "auth/invalid-credential": "Incorrect email or password.",
        "auth/too-many-requests": "Too many attempts. Try again later.",
        "auth/network-request-failed": "Check your internet connection.",
        "auth/operation-not-allowed": "Email/password sign-in is not enabled.",
        "auth/user-disabled": "This account has been disabled."
      };
      showMessage(errors[error.code] || "Sign-in failed. Contact the administrator.");
      loginButton.disabled = false;
      loginButton.innerHTML = 'Open official inbox <span>→</span>';
    }
  });
}
onAuthStateChanged(auth, (user) => {
  if (user) window.location.replace("./webmail.html");
});
