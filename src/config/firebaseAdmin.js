const admin = require("firebase-admin")

function formatPrivateKey(key) {
  if (!key) return null
  
  
  let formattedKey = key
    .replace(/\\n/g, "\n")  
    .replace(/^["']|["']$/g, "") 
    .trim()
  
  if (!formattedKey.includes("BEGIN PRIVATE KEY") && !formattedKey.includes("BEGIN RSA PRIVATE KEY")) {
    if (formattedKey.startsWith("-----")) {
      return formattedKey
    }
    console.warn(" Firebase private key may be missing PEM markers")
  }
  
  return formattedKey
}

const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: formatPrivateKey(process.env.FIREBASE_PRIVATE_KEY),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
}

if (!admin.apps.length) {
  const hasFirebaseConfig = 
    serviceAccount.project_id &&
    serviceAccount.private_key_id &&
    serviceAccount.private_key &&
    serviceAccount.client_email

  if (hasFirebaseConfig) {
    try {
      if (!serviceAccount.private_key.includes("PRIVATE KEY")) {
        throw new Error("Private key appears to be invalid (missing PRIVATE KEY markers)")
      }
      
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      })
      console.log("Firebase Admin initialized")
    } catch (error) {
      console.warn(" Firebase Admin initialization failed:", error.message)
      console.warn("   This is non-critical - some endpoints may not work without Firebase")
      // Don't crash - Firebase might not be needed for all endpoints
    }
  } else {
    const missingVars = []
    if (!serviceAccount.project_id) missingVars.push("FIREBASE_PROJECT_ID")
    if (!serviceAccount.private_key_id) missingVars.push("FIREBASE_PRIVATE_KEY_ID")
    if (!serviceAccount.private_key) missingVars.push("FIREBASE_PRIVATE_KEY")
    if (!serviceAccount.client_email) missingVars.push("FIREBASE_CLIENT_EMAIL")
    
    console.warn(` Firebase Admin not initialized - missing environment variables: ${missingVars.join(", ")}`)
  }
}

module.exports = admin
