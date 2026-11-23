
import { auth } from "../firebase-config.js";

import {
  onAuthStateChanged,
  getIdTokenResult,
  signOut
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

// Keep the dashboard hidden until authorization is checked.
document.documentElement.style.visibility = "hidden";

function showAccessDenied(message) {
  document.documentElement.style.visibility = "visible";

  document.body.innerHTML = `
    <main style="
      min-height:100vh;
      display:flex;
      align-items:center;
      justify-content:center;
      background:#f4f6fb;
      font-family:Arial,sans-serif;
      padding:20px;
      text-align:center;
    ">
      <section style="
        max-width:440px;
        background:white;
        padding:35px;
        border-radius:16px;
        box-shadow:0 10px 35px rgba(0,0,0,.08);
      ">
        <h2>Admin Access Restricted</h2>
        <p>${message}</p>
        <button id="logoutBtn" style="
          padding:12px 22px;
          background:#263b80;
          color:white;
          border:0;
          border-radius:8px;
          cursor:pointer;
        ">Sign out</button>
      </section>
    </main>
  `;

  document.getElementById("logoutBtn").addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "../index.html";
  });
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "../index.html";
    return;
  }

  try {
    // Refresh the token to check the latest server-assigned claims.
    const tokenResult = await getIdTokenResult(user, true);
    const claims = tokenResult.claims;

    const isAdmin =
      claims.admin === true ||
      claims.role === "super_admin";

    if (!isAdmin) {
      showAccessDenied(
        "Your account is signed in, but an administrator has not granted Admin Panel access yet."
      );
      return;
    }

    // Authorized admin: display the dashboard.
    document.documentElement.style.visibility = "visible";

    console.log("Admin access verified:", user.uid);

  } catch (error) {
    console.error("Admin verification failed:", error);

    showAccessDenied(
      "We could not verify your administrator permissions. Please try again later."
    );
  }
});
