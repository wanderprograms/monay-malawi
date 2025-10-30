window.sendMoneyConfirmed = false;

function calculateFee(amount) {
  return parseFloat((amount * 0.025).toFixed(2));
}

function growBalanceIfDue(balance, lastUpdated) {
  const now = new Date();
  const then = new Date(lastUpdated);
  const hours = Math.floor((now - then) / (1000 * 60 * 60));
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const newBalance = balance * Math.pow(1.03, days);
    return parseFloat(newBalance.toFixed(2));
  }
  return balance;
}

function showSendModal({ amount, accountType, fullName, number }, onConfirm) {
  const fee = calculateFee(amount);
  const total = (amount + fee).toFixed(2);

  const dashboard = document.getElementById('dashboard');
  if (dashboard) dashboard.style.display = 'none';

  const modal = document.createElement('div');
  modal.className = 'send-modal';
  modal.innerHTML = `
    <div style="
      position:fixed;
      top:0; left:0; right:0; bottom:0;
      background:rgba(0,0,0,0.6);
      display:flex;
      align-items:center;
      justify-content:center;
      z-index:9999;
    ">
      <div style="
        background:#fff;
        padding:20px;
        border-radius:12px;
        box-shadow:0 4px 12px rgba(0,0,0,0.3);
        max-width:90%;
        width:400px;
        font-family:sans-serif;
        line-height:1.5;
      ">
        <h3 style="margin-bottom:10px;">💸 Tsimikizani Kutumiza</h3>
        <p><strong>Account Type:</strong> ${accountType}</p>
        <p><strong>Dzina:</strong> ${fullName}</p>
        <p><strong>Nambala:</strong> ${number}</p>
        <p><strong>Sending Fee:</strong> MWK ${fee}</p>
        <p><strong>Total:</strong> MWK ${total}</p>
        <div style="margin-top:15px; display:flex; justify-content:space-between;">
          <button id="cancelSend" style="padding:10px 20px; background:#ccc; border:none; border-radius:6px;">Khasulani</button>
          <button id="confirmSend" style="padding:10px 20px; background:#28a745; color:#fff; border:none; border-radius:6px;">Tsimikizani</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  document.getElementById('cancelSend').onclick = () => {
    modal.remove();
    if (dashboard) dashboard.style.display = 'block';
  };

  document.getElementById('confirmSend').onclick = () => {
    modal.remove();
    if (dashboard) dashboard.style.display = 'block';
    window.sendMoneyConfirmed = true;
    document.getElementById('sendMoneyForm').requestSubmit();
  };
}

document.addEventListener('DOMContentLoaded', () => {
  const sendForm = document.getElementById('sendMoneyForm');
  if (!sendForm || !firebase || !firebase.firestore) return;

  const db = firebase.firestore();
  const auth = firebase.auth();

  // ✅ Grow balance if due
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      const uid = user.uid;
      const ref = db.collection("users").doc(uid);
      const doc = await ref.get();
      const data = doc.data();
      const lastUpdated = data.lastGrowth || new Date().toISOString();
      const newBalance = growBalanceIfDue(data.balance, lastUpdated);

      if (newBalance !== data.balance) {
        await ref.update({
          balance: newBalance,
          lastGrowth: new Date().toISOString()
        });
        const balanceEl = document.getElementById('balance');
        if (balanceEl) balanceEl.textContent = `Balance: MK ${newBalance.toFixed(2)}`;
      }
    }
  });

  // ✅ Intercept send form
  sendForm.addEventListener('submit', async function(e) {
    if (window.sendMoneyConfirmed) return;
    e.preventDefault();

    const amount = parseFloat(document.getElementById('amount').value);
    const accountType = document.getElementById('accountType').value;
    const number = document.getElementById('recipientPhone').value.trim();

    if (!amount || !accountType || !number) return;

    let fullName = "Recipient";

    try {
      if (accountType === "user") {
        const query = await db.collection("users").where("phone", "==", number).limit(1).get();
        if (!query.empty) {
          const data = query.docs[0].data();
          fullName = `${data.firstName} ${data.lastName}`;
        }
      } else {
        fullName = accountType === "airtel" ? "Airtel Recipient" : "TNM Recipient";
      }
    } catch (err) {
      console.warn("Recipient name fetch failed:", err);
    }

    showSendModal({ amount, accountType, fullName, number }, async () => {
      try {
        const fee = calculateFee(amount);
        const feeQuery = await db.collection("users").where("phone", "==", "0899535951").limit(1).get();
        if (!feeQuery.empty) {
          const feeRef = feeQuery.docs[0].ref;
          const feeData = feeQuery.docs[0].data();
          await feeRef.update({
            balance: feeData.balance + fee,
            notifications: firebase.firestore.FieldValue.arrayUnion({
              from: "System",
              message: `You received MWK ${fee} as transaction fee.`,
              timestamp: new Date().toISOString()
            })
          });
        }
      } catch (err) {
        console.warn("Fee transfer failed:", err);
      }
    });
  });
});

