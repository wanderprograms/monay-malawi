import { firebaseConfig, sendToAirtel, sendToTNM } from './api/configAndApis.js';

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null;
let notifications = [];
let notificationsVisible = false;

document.addEventListener("DOMContentLoaded", () => {
  function showRegister() {
    document.getElementById('registerSection').style.display = 'block';
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('dashboard').style.display = 'none';
  }

  function showLogin() {
    document.getElementById('registerSection').style.display = 'none';
    document.getElementById('loginSection').style.display = 'block';
    document.getElementById('dashboard').style.display = 'none';
  }

  function showDashboard() {
    document.getElementById('registerSection').style.display = 'none';
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('dashboard').style.display = 'block';
    renderDashboard();
  }

  function clearErrors() {
    document.getElementById('registerError').textContent = '';
    document.getElementById('loginError').textContent = '';
    document.getElementById('sendMoneyError').textContent = '';
    document.getElementById('sendMoneySuccess').textContent = '';
  }

  document.getElementById('showLoginBtn').addEventListener('click', showLogin);
  document.getElementById('showRegisterBtn').addEventListener('click', showRegister);

  document.getElementById('registerForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    clearErrors();

    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const email = document.getElementById('emailRegister').value.trim();
    const phone = document.getElementById('phoneRegister').value.trim();
    const password = document.getElementById('passwordRegister').value;

    try {
      const userCredential = await auth.createUserWithEmailAndPassword(email, password);
      const uid = userCredential.user.uid;

      await db.collection("users").doc(uid).set({
        firstName,
        lastName,
        email,
        phone,
        balance: 500,
        notifications: [],
        lastGrowth: new Date().toISOString()
      });

      alert("Registration successful! Please login.");
      showLogin();
      this.reset();
    } catch (error) {
      document.getElementById('registerError').textContent = error.message;
    }
  });

  document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    clearErrors();

    const identifier = document.getElementById('identifierLogin').value.trim();
    const password = document.getElementById('passwordLogin').value;

    try {
      let email = identifier;
      if (!identifier.includes("@")) {
        email = `${identifier}@wanderslapp.com`;
      }

      const userCredential = await auth.signInWithEmailAndPassword(email, password);
      currentUser = userCredential.user.uid;
      showDashboard();
      this.reset();
    } catch (error) {
      document.getElementById('loginError').textContent = error.message;
    }
  });

  async function renderDashboard() {
    const doc = await db.collection("users").doc(currentUser).get();
    const data = doc.data();

    document.getElementById('balance').textContent = `Balance: MK ${data.balance.toFixed(2)}`;
    notifications = data.notifications || [];
    document.getElementById('notificationIcon').setAttribute('data-count', notifications.length);
    document.getElementById('messages').innerHTML = '';
    notificationsVisible = false;
  }

  document.getElementById('notificationIcon').addEventListener('click', async () => {
    const messagesEl = document.getElementById('messages');

    if (!notificationsVisible) {
      const doc = await db.collection("users").doc(currentUser).get();
      const data = doc.data();
      notifications = data.notifications || [];

      messagesEl.innerHTML = notifications.map(n =>
        `<div><strong>${n.from}:</strong> ${n.message}</div>`
      ).join('');

      notificationsVisible = true;
    } else {
      messagesEl.innerHTML = '';
      notificationsVisible = false;

      await db.collection("users").doc(currentUser).update({ notifications: [] });
      document.getElementById('notificationIcon').setAttribute('data-count', 0);
    }
  });

  document.getElementById('sendMoneyForm').addEventListener('confirmedSendMoney', async function() {
    clearErrors();

    const recipientPhone = document.getElementById('recipientPhone').value.trim();
    const amount = parseFloat(document.getElementById('amount').value);
    const accountType = document.getElementById('accountType').value;
    const fee = parseFloat((amount * 0.025).toFixed(2));
    const totalAmount = amount + fee;

    if (!recipientPhone || isNaN(amount) || amount <= 0 || !accountType) {
      document.getElementById('sendMoneyError').textContent = 'Please enter valid details.';
      return;
    }

    try {
      const senderRef = db.collection("users").doc(currentUser);
      const senderDoc = await senderRef.get();
      const senderData = senderDoc.data();

      if (senderData.balance < totalAmount) {
        document.getElementById('sendMoneyError').textContent = 'Insufficient balance.';
        return;
      }

      await senderRef.update({ balance: senderData.balance - totalAmount });

      if (accountType === 'user') {
        const recipientQuery = await db.collection("users")
          .where("phone", "==", recipientPhone)
          .limit(1)
          .get();

        if (recipientQuery.empty) {
          document.getElementById('sendMoneyError').textContent = 'Recipient user not found.';
          return;
        }

        const recipientRef = recipientQuery.docs[0].ref;
        const recipientData = recipientQuery.docs[0].data();

        await recipientRef.update({
          balance: recipientData.balance + amount,
          notifications: firebase.firestore.FieldValue.arrayUnion({
            from: senderData.firstName,
            message: `Wakutumizilani MK ${amount.toFixed(2)}.`,
            timestamp: new Date().toISOString()
          })
        });
      }

      if (accountType === 'airtel') {
        const result = await sendToAirtel(recipientPhone, amount);
        if (!result || result.success === false) {
          document.getElementById('sendMoneyError').textContent = 'Airtel API failed.';
          return;
        }
      }

      if (accountType === 'tnm') {
        const result = await sendToTNM(recipientPhone, amount);
        if (!result || result.success === false) {
          document.getElementById('sendMoneyError').textContent = 'TNM API failed.';
          return;
        }
      }

      const feeQuery = await db.collection("users").where("phone", "==", "0899535951").limit(1).get();
      if (!feeQuery.empty) {
        const feeRef = feeQuery.docs[0].ref;
        const feeData = feeQuery.docs[0].data();
        await feeRef.update({
          balance: feeData.balance + fee,
          notifications: firebase.firestore.FieldValue.arrayUnion({
            from: senderData.firstName,
            message: `paid MWK ${fee} as transaction fee.`,
            timestamp: new Date().toISOString()
          })
        });
      }

      document.getElementById('sendMoneySuccess').textContent =
        `Money sent successfully.`;
      renderDashboard();
      this.reset();
    } catch (error) {
      document.getElementById('sendMoneyError').textContent = error.message;
    }
  });

  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await auth.signOut();
    currentUser = null;
    notifications = [];
    showLogin();
  });

  showLogin();
});

