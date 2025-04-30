import CryptoJS from "crypto-js";

const secretKey = import.meta.env.VITE_ENCRYPTION_SECRET_KEY || "v1t3-s3cr3t-k3y";

export function encryptMessage(message) {
  return CryptoJS.AES.encrypt(message, secretKey).toString();
}

export function decryptMessage(encryptedMessage) {
  const bytes = CryptoJS.AES.decrypt(encryptedMessage, secretKey);
  return bytes.toString(CryptoJS.enc.Utf8);
}
