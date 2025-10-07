import crypto from 'crypto';

// Ensure the key is exactly 32 bytes for AES-256
const SECRET_KEY = process.env.MESSAGE_SECRET_KEY;
if (!SECRET_KEY || SECRET_KEY.length < 32) {
  throw new Error('FATAL ERROR: MESSAGE_SECRET_KEY environment variable is not set or is not long enough (must be 32 bytes).');
}

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

// Create a proper 32-byte key from your secret
function getKey() {
  return crypto.createHash('sha256').update(SECRET_KEY).digest();
}

export function encrypt(text) {
  try {
    if (!text) return text;
    
    const key = getKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv); // Fixed: using createCipheriv
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return `${iv.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('Encryption error:', error);
    return text; // Return original text if encryption fails
  }
}

export function decrypt(encryptedData) {
  try {
    if (!encryptedData || !encryptedData.includes(':')) {
      // Handle plain text (unencrypted messages)
      return encryptedData;
    }
    
    const [ivHex, encryptedText] = encryptedData.split(':');
    const key = getKey();
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv); // Fixed: using createDecipheriv
    
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    // Return the original data if decryption fails
    return encryptedData;
  }
}