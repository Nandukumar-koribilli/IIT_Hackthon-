import crypto from 'crypto';
import { promisify } from 'util';

const randomBytes = promisify(crypto.randomBytes);
const scrypt = promisify(crypto.scrypt);

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 32;
const KEY_LENGTH = 32;
const TAG_LENGTH = 16;

/**
 * Generate a random encryption key
 */
export async function generateKey() {
  const key = await randomBytes(KEY_LENGTH);
  return key.toString('hex');
}

/**
 * Generate a random IV (Initialization Vector)
 */
export async function generateIV() {
  const iv = await randomBytes(IV_LENGTH);
  return iv.toString('hex');
}

/**
 * Generate a random salt for key derivation
 */
export async function generateSalt() {
  const salt = await randomBytes(SALT_LENGTH);
  return salt.toString('hex');
}

/**
 * Derive encryption key from password using scrypt
 */
export async function deriveKeyFromPassword(password, salt) {
  const saltBuffer = Buffer.from(salt, 'hex');
  const key = await scrypt(password, saltBuffer, KEY_LENGTH);
  return key;
}

/**
 * Encrypt data using AES-256-GCM
 */
export function encrypt(data, key, iv) {
  const keyBuffer = Buffer.isBuffer(key) ? key : Buffer.from(key, 'hex');
  const ivBuffer = Buffer.from(iv, 'hex');
  
  const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, ivBuffer);
  
  let encrypted = cipher.update(data);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  
  const authTag = cipher.getAuthTag();
  
  return {
    encrypted,
    authTag: authTag.toString('hex')
  };
}

/**
 * Decrypt data using AES-256-GCM
 */
export function decrypt(encryptedData, key, iv, authTag) {
  const keyBuffer = Buffer.isBuffer(key) ? key : Buffer.from(key, 'hex');
  const ivBuffer = Buffer.from(iv, 'hex');
  const authTagBuffer = Buffer.from(authTag, 'hex');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, ivBuffer);
  decipher.setAuthTag(authTagBuffer);
  
  let decrypted = decipher.update(encryptedData);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  
  return decrypted;
}

/**
 * Create encryption stream for large files
 */
export function createEncryptStream(key, iv) {
  const keyBuffer = Buffer.isBuffer(key) ? key : Buffer.from(key, 'hex');
  const ivBuffer = Buffer.from(iv, 'hex');
  
  return crypto.createCipheriv(ALGORITHM, keyBuffer, ivBuffer);
}

/**
 * Create decryption stream for large files
 */
export function createDecryptStream(key, iv, authTag) {
  const keyBuffer = Buffer.isBuffer(key) ? key : Buffer.from(key, 'hex');
  const ivBuffer = Buffer.from(iv, 'hex');
  const authTagBuffer = Buffer.from(authTag, 'hex');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, ivBuffer);
  decipher.setAuthTag(authTagBuffer);
  
  return decipher;
}

/**
 * Hash a key for storage/verification
 */
export function hashKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * Generate file checksum
 */
export function generateChecksum(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Create hash stream for computing checksum of large files
 */
export function createHashStream() {
  return crypto.createHash('sha256');
}

/**
 * Generate secure random transfer ID
 */
export async function generateTransferId() {
  const bytes = await randomBytes(16);
  return bytes.toString('base64url');
}

export default {
  generateKey,
  generateIV,
  generateSalt,
  deriveKeyFromPassword,
  encrypt,
  decrypt,
  createEncryptStream,
  createDecryptStream,
  hashKey,
  generateChecksum,
  createHashStream,
  generateTransferId,
  ALGORITHM,
  IV_LENGTH,
  KEY_LENGTH
};
