import { auth } from "./firebase-config.js";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const togglePassword = document.getElementById("togglePassword");
const loginForm = document.getElementById("loginForm");
const message = document.getElementById("message");
const loginButton = document.getElementById("loginButton");

const year = document.getElementById("year");
if (year) year.textContent = new Date().getFullYear();

function showMessage(text) {
  if (message) message.textContent = text;
}

function isAllowedCodeBihinEmail(value) {
  const email = value.trim().toLowerCase();
  const parts = email.split("@");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return false;

  const domain = parts[1];
  return domain === "codebihin.in" || domain.endsWith(".codebihin.in");
}

if (togglePassword && passwordInput) {
  togglePassword.addEventListener("click", () => {
    const show = passwordInput.type === "password";
    passwordInput.type = show ? "text" : "password";
    togglePassword.textContent = show ? "Hide" : "Show";
    togglePassword.setAttribute("aria-label", show ? "Hide password" : "Show password");
  });
}

if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = emailInput?.value.trim().toLowerCase() || "";
    const password = passwordInput?.value || "";

    if (!isAllowedCodeBihinEmail(email)) {
      showMessage("Use a CodeBihin email address, including an approved subdomain.");
      return;
    }

    if (!password) {
      showMessage("Enter your password.");
      return;
    }

    if (loginButton) {
      loginButton.disabled = true;
      loginButton.textContent = "Signing in...";
    }
    showMessage("Verifying your account...");

    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      showMessage("Login successful. Your account is authenticated.");
      console.info("Authenticated Firebase UID:", result.user.uid);
    } catch (error) {
      const errors = {
        "auth/invalid-email": "Invalid email address.",
        "auth/user-not-found": "Account not found.",
        "auth/wrong-password": "Incorrect email or password.",
        "auth/invalid-credential": "Incorrect email or password.",
        "auth/too-many-requests": "Too many attempts. Try again later.",
        "auth/network-request-failed": "Check your internet connection.",
        "auth/operation-not-allowed": "Email/Password sign-in is not enabled in Firebase.",
        "auth/user-disabled": "This account has been disabled. Contact your administrator."
      };
      showMessage(errors[error.code] || "Login failed. Contact your administrator.");
      console.error("Sign-in error:", error.code);
    } finally {
      if (loginButton) {
        loginButton.disabled = false;
        loginButton.innerHTML = 'Sign in <span>→</span>';
      }
    }
  });
}

onAuthStateChanged(auth, (user) => {
  if (user) console.info("Active Firebase session:", user.email);
});
