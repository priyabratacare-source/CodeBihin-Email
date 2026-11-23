import { auth } from "../firebase-config.js";
import {
  onAuthStateChanged,
  getIdTokenResult,
  signOut
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

document.documentElement.style.visibility = "hidden";

function showAccessDenied(message) {
  document.documentElement.style.visibility = "visible";
  document.body.replaceChildren();

  const main = document.createElement("main");
  Object.assign(main.style, {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f4f6fb",
    fontFamily: "Arial, sans-serif",
    padding: "20px",
    textAlign: "center"
  });

  const section = document.createElement("section");
  Object.assign(section.style, {
    maxWidth: "440px",
    background: "#fff",
    padding: "35px",
    borderRadius: "16px",
    boxShadow: "0 10px 35px rgba(0,0,0,.08)"
  });

  const heading = document.createElement("h2");
  heading.textContent = "Admin Access Restricted";

  const paragraph = document.createElement("p");
  paragraph.textContent = message;

  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "Sign out";
  Object.assign(button.style, {
    padding: "12px 22px",
    background: "#263b80",
    color: "#fff",
    border: "0",
    borderRadius: "8px",
    cursor: "pointer"
  });

  button.addEventListener("click", async () => {
    button.disabled = true;
    try {
      await signOut(auth);
      window.location.replace("../index.html");
    } catch (error) {
      console.error("Sign-out failed:", error);
      button.disabled = false;
      paragraph.textContent = "Sign-out failed. Please refresh and try again.";
    }
  });

  section.append(heading, paragraph, button);
  main.append(section);
  document.body.append(main);
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.replace("../index.html");
    return;
  }

  try {
    const tokenResult = await getIdTokenResult(user, true);
    const claims = tokenResult.claims;
    const isAdmin = claims.admin === true || claims.role === "super_admin";

    if (!isAdmin) {
      showAccessDenied(
        "You are signed in, but an administrator has not granted Admin Panel access to this account."
      );
      return;
    }

    const year = document.getElementById("year");
    if (year) year.textContent = new Date().getFullYear();

    document.documentElement.style.visibility = "visible";
    console.info("Admin access verified for Firebase UID:", user.uid);
  } catch (error) {
    console.error("Admin authorization check failed:", error);
    showAccessDenied("We could not verify your administrator permissions. Please try again later.");
  }
});
