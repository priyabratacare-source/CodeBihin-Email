
const passwordInput = document.getElementById("password");
const togglePassword = document.getElementById("togglePassword");
const loginForm = document.getElementById("loginForm");
const message = document.getElementById("message");

document.getElementById("year").textContent =
  new Date().getFullYear();

togglePassword.addEventListener("click", () => {
  const isPassword = passwordInput.type === "password";

  passwordInput.type = isPassword ? "text" : "password";
  togglePassword.textContent = isPassword ? "Hide" : "Show";
});

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const email = document.getElementById("email").value.trim();

  if (!email.toLowerCase().endsWith("@codebihin.in")) {
    message.textContent = "Please use your @codebihin.in account.";
    return;
  }

  message.textContent =
    "The login service is not connected yet. Firebase authentication will be added in the next step.";
});
