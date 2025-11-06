 // Tumiza email verification user akangopanga register
  function sendVerificationEmail(user) {
    if (user && !user.emailVerified) {
      user.sendEmailVerification()
        .then(() => {
          console.log("✅ Verification email sent to:", user.email);
          alert("Tatumiza email yotsimikizira. Chonde fufuzani inbox yanu.");
        })
        .catch((error) => {
          console.error("❌ Email verification failed:", error.message);
        });
    }
  }

  // Onetsetsa kuti user watsimikizika akalowa
  function checkEmailVerified(auth, onVerified, onUnverified) {
    auth.onAuthStateChanged((user) => {
      if (user) {
        if (user.emailVerified) {
          console.log("✅ User is verified");
          if (typeof onVerified === "function") onVerified(user);
        } else {
          console.warn("⚠️ User not verified");
          alert("Chonde verify email yanu kaye.");
          if (typeof onUnverified === "function") onUnverified(user);
          auth.signOut();
          window.location.href = "/verify.html"; // kapena redirect ku homepage
        }
      }
    });
  }

  // ✅ Gwiritsani ntchito izi mu script.js popanda kusintha logic
  window.sendVerificationEmail = sendVerificationEmail;
  window.checkEmailVerified = checkEmailVerified;