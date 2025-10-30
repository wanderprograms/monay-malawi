export const firebaseConfig = { 
    apiKey: "AIzaSyBBZxCwywnv_ZVXYezOV8IKG6iKWK5sL10",

    authDomain: "studio-ywlo1.firebaseapp.com",

    projectId: "studio-ywlo1",

    storageBucket: "studio-ywlo1.firebasestorage.app",

    messagingSenderId: "791958850921",

    appId: "1:791958850921:web:149be668e7f132e59f41f8"
};

const airtelCredentials = {
  clientId: "AIRTEL_CLIENT_ID",
  clientSecret: "AIRTEL_SECRET_KEY",
  baseUrl: "https://openapi.airtel.africa"
};

const tnmCredentials = {
  apiKey: "TNM_API_KEY",
  secret: "TNM_SECRET_KEY",
  baseUrl: "https://api.tnm.mw"
};

export async function sendToAirtel(phone, amount) {
  try {
    const authRes = await fetch(`${airtelCredentials.baseUrl}/auth/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: airtelCredentials.clientId,
        client_secret: airtelCredentials.clientSecret,
        grant_type: "client_credentials"
      })
    });

    const authData = await authRes.json();
    const accessToken = authData.access_token;

    const payload = {
      reference: "Wanderslapp Airtel Transfer",
      amount: { value: amount, currency: "MWK" },
      recipient: { phoneNumber: phone }
    };

    const response = await fetch(`${airtelCredentials.baseUrl}/transactions/send-money`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    return await response.json();
  } catch (error) {
    console.error("Airtel API error:", error);
    return { success: false, error: error.message };
  }
}

export async function sendToTNM(phone, amount) {
  try {
    const authRes = await fetch(`${tnmCredentials.baseUrl}/auth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiKey: tnmCredentials.apiKey,
        secret: tnmCredentials.secret
      })
    });

    const authData = await authRes.json();
    const accessToken = authData.token;

    const payload = {
      reference: "Wanderslapp TNM Transfer",
      amount: amount,
      currency: "MWK",
      recipient: phone
    };

    const response = await fetch(`${tnmCredentials.baseUrl}/payments/send`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    return await response.json();
  } catch (error) {
    console.error("TNM API error:", error);
    return { success: false, error: error.message };
  }
}