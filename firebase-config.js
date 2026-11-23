
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyC4H5WzOKFF4qHGS6T3_2xKWVuPhuJmMYU",
  authDomain: "codebihin-email.firebaseapp.com",
  projectId: "codebihin-email",
  storageBucket: "codebihin-email.firebasestorage.app",
  messagingSenderId: "132451360246",
  appId: "1:132451360246:web:37c784961de7f4b72dbbd7"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export { app, auth };
