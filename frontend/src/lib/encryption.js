import CryptoJS from "crypto-js";

const secretKey = import.meta.env.VITE_ENCRYPTION_SECRET_KEY || "v1t3-s3cr3t-k3y";

// Create a proper 32-byte key from the secret (matching backend)
function getKey() {
  return CryptoJS.SHA256(secretKey);
}

export function encryptMessage(message) {
  if (!message) return message;
  
  const key = getKey();
  const iv = CryptoJS.lib.WordArray.random(16); // 16 bytes IV
  const encrypted = CryptoJS.AES.encrypt(message, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });
  
  // Return in format: iv:encrypted (matching backend format)
  return iv.toString(CryptoJS.enc.Hex) + ':' + encrypted.toString();
}

export function decryptMessage(encryptedData) {
  if (!encryptedData || !encryptedData.includes(':')) {
    // Handle plain text (unencrypted messages)
    return encryptedData;
  }
  
  try {
    const [ivHex, encryptedText] = encryptedData.split(':');
    const key = getKey();
    const iv = CryptoJS.enc.Hex.parse(ivHex);
    
    const decrypted = CryptoJS.AES.decrypt(encryptedText, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    
    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Decryption error:', error);
    // Return the original data if decryption fails
    return encryptedData;
  }
}
