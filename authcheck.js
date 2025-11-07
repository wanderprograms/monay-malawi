window.sendVerificationEmail = function(user) {
  if (user && !user.emailVerified) {
    user.sendEmailVerification()
      .then(() => alert("Tatumiza email yotsimikizira."))
      .catch((error) => console.error("Verification failed:", error));
  }
};

window.checkEmailVerified = function(auth, onVerified, onUnverified) {
  auth.onAuthStateChanged((user) => {
    if (user && user.emailVerified) {
      if (typeof onVerified === "function") onVerified(user);
    } else {
      alert("Chonde verify email yanu kaye.");
      if (typeof onUnverified === "function") onUnverified(user);
      auth.signOut();
    }
  });
};
