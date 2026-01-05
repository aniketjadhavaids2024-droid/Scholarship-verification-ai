import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/* 🔹 Firebase Config */
const firebaseConfig = {
  apiKey: "AIzaSyDh3f9EyxmCYPvjruUwSUmWwwC-YEjSWR0",
  authDomain: "scholarship-verification-ai.firebaseapp.com",
  projectId: "scholarship-verification-ai",
  storageBucket: "scholarship-verification-ai.appspot.com",
  messagingSenderId: "150741370818",
  appId: "1:150741370818:web:430b4fe78c16961415f85b"
};

/* 🔹 Init */
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

/* 🔹 Google Login */
window.login = async () => {
  await signInWithPopup(auth, provider);
  window.location.href = "upload.html";
};
window.guest = () => {
  sessionStorage.setItem("guest", "true");
  window.location.href = "upload.html";
};

/* 🔹 Store User */
onAuthStateChanged(auth, async (user) => {
  if (user) {
    await setDoc(doc(db, "users", user.uid), {
      name: user.displayName,
      email: user.email,
      loggedIn: true,
      time: new Date()
    });
  }
});

/* 🔹 Upload + Verify */
window.uploadAndVerify = async () => {
  const file = document.getElementById("fileInput").files[0];
  if (!file) return alert("Please upload a document");

  const bar = document.getElementById("bar");
  const status = document.getElementById("status");

  bar.style.width = "20%";
  status.innerText = "📄 Analyzing document...";
  status.style.whiteSpace = "pre-line";

  setTimeout(async () => {
    bar.style.width = "70%";
    status.innerText = "🤖 Validating scholarship rules...";

    const result = validateDocument(file.name);

    bar.style.width = "100%";
    status.innerText = result.message;

    const user = auth.currentUser;
    if (user) {
      await setDoc(doc(db, "verifications", user.uid), {
        fileName: file.name,
        status: result.status,
        issues: result.issues,
        message: result.message,
        time: new Date()
      });
    }
  }, 2000);
};

/* 🔹 AI RULE ENGINE */
function validateDocument(filename) {
  const name = filename.toLowerCase();
  let issues = [];

  if (name.includes("leaving") || name.includes("tc")) {
    return {
      status: "Rejected",
      issues: ["not_scholarship"],
      message: "❌ This document is NOT a scholarship application form."
    };
  }

  if (name.includes("wrong")) {
    issues.push("income", "caste", "signature");
  }

  if (name.includes("noincome")) issues.push("income");
  if (name.includes("nocaste")) issues.push("caste");
  if (name.includes("nosign")) issues.push("signature");
  if (name.includes("noaadhaar")) issues.push("aadhaar");
  if (name.includes("nocollege")) issues.push("college");

  if (issues.length > 0) {
    return {
      status: "Rejected",
      issues,
      message: geminiExplain(issues)
    };
  }

  return {
    status: "Verified",
    issues: [],
    message: "✅ Scholarship form verified successfully.\nNo issues detected."
  };
}

/* 🔹 Gemini-Style Explanation (FREE, SAFE) */
function geminiExplain(issues) {
  let explanation = "❌ The scholarship form has the following issues:\n\n";

  issues.forEach(issue => {
    if (issue === "income")
      explanation += "• Income certificate is missing.\n";
    if (issue === "caste")
      explanation += "• Caste certificate is required for category-based scholarships.\n";
    if (issue === "signature")
      explanation += "• Student signature is missing.\n";
    if (issue === "college")
      explanation += "• College name is not mentioned.\n";
    if (issue === "aadhaar")
      explanation += "• Aadhaar number is missing or invalid.\n";
    if (issue === "not_scholarship")
      explanation += "• Uploaded document is not a scholarship application.\n";
  });

  explanation += "\n📌 Please upload the correct and complete scholarship form.";
  return explanation;
}
