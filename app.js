
import { auth } from "./firebase-config.js";

import {
  signInWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

const passwordInput = document.getElementById("password");
const togglePassword = document.getElementById("togglePassword");
const loginForm = document.getElementById("loginForm");
const message = document.getElementById("message");
const loginButton = document.getElementById("loginButton");

document.getElementById("year").textContent =
  new Date().getFullYear();

togglePassword.addEventListener("click", () => {
  const show = passwordInput.type === "password";
  passwordInput.type = show ? "text" : "password";
  togglePassword.textContent = show ? "Hide" : "Show";
});

function showMessage(text) {
  message.textContent = text;
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("email")
    .value.trim().toLowerCase();

  const password = passwordInput.value;

  const domain = email.split("@")[1];

const allowedDomain =
  domain === "codebihin.in" ||
  domain.endsWith(".codebihin.in");

if (!allowedDomain) {
    showMessage("Use your @codebihin.in email address.");
    return;
  }

  loginButton.disabled = true;
  loginButton.textContent = "Signing in...";
  showMessage("Verifying your account...");

  try {
    const result = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    showMessage("Login successful! Mailbox setup is coming next.");

    console.log("Authenticated:", result.user.uid);

  } catch (error) {
    const errors = {
      "auth/invalid-email": "Invalid email address.",
      "auth/user-not-found": "Account not found.",
      "auth/wrong-password": "Incorrect password.",
      "auth/invalid-credential": "Incorrect email or password.",
      "auth/too-many-requests": "Too many attempts. Try again later.",
      "auth/network-request-failed": "Check your internet connection.",
      "auth/operation-not-allowed": "Enable Email/Password in Firebase."
    };

    showMessage(
      errors[error.code] || "Login failed. Please contact your administrator."
    );

    console.error(error);

  } finally {
    loginButton.disabled = false;
    loginButton.innerHTML = 'Sign in <span>→</span>';
  }
});

onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("Active session:", user.email);
  }
});
