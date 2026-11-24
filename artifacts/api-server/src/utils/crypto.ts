import crypto from 'crypto';

/**
 * AES‑256‑GCM encryption utilities for storing secret tokens.
 *
 * Requires an environment variable `ENCRYPTION_KEY` which must be a
 * Base64‑encoded 32‑byte key (256‑bit). The module validates the key on
 * first import and throws if it is missing or malformed – this prevents the
 * server from starting with an insecure configuration.
 */

const rawKey = process.env.ENCRYPTION_KEY;
if (!rawKey) {
  throw new Error('ENCRYPTION_KEY environment variable is required for token encryption');
}
const key = Buffer.from(rawKey, 'base64');
if (key.length !== 32) {
  throw new Error('ENCRYPTION_KEY must decode to 32 bytes (256 bits)');
}

/**
 * Encrypt a plaintext string.
 * Returns a Base64 string composed of `iv|authTag|ciphertext`.
 */
export function encryptToken(plain: string): string {
  const iv = crypto.randomBytes(12); // 96‑bit IV recommended for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // Concatenate iv + authTag + ciphertext
  const combined = Buffer.concat([iv, authTag, ciphertext]);
  return combined.toString('base64');
}

/**
 * Decrypt a Base64 string produced by `encryptToken`.
 */
export function decryptToken(enc: string): string {
  const combined = Buffer.from(enc, 'base64');
  const iv = combined.subarray(0, 12);
  const authTag = combined.subarray(12, 28);
  const ciphertext = combined.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}

