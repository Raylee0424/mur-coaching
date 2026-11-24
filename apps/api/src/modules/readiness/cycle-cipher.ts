import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGO = 'aes-256-gcm';
const IV_BYTES = 12;

/**
 * AES-256-GCM with a fresh 96-bit IV per write. Token = `iv.tag.ciphertext` (base64). `aad` binds the token to its
 * row (client + date), so a ciphertext copied onto another user's or day's row fails to decrypt.
 */
export class CycleCipher {
  private readonly key: Buffer;

  constructor(keyBase64: string) {
    this.key = Buffer.from(keyBase64, 'base64');
    if (this.key.length !== 32) throw new Error('Cycle key must be 32 bytes.');
  }

  encrypt(plaintext: string, aad: string): string {
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGO, this.key, iv);
    cipher.setAAD(Buffer.from(aad, 'utf8'));
    const data = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    return [iv, cipher.getAuthTag(), data].map((b) => b.toString('base64')).join('.');
  }

  /** Throws when the token was tampered with, belongs to another row, or was written under another key. */
  decrypt(token: string, aad: string): string {
    const [iv, tag, data] = token.split('.').map((p) => Buffer.from(p, 'base64'));
    if (!iv || !tag || !data || iv.length !== IV_BYTES) throw new Error('Malformed cycle token.');
    const decipher = createDecipheriv(ALGO, this.key, iv);
    decipher.setAAD(Buffer.from(aad, 'utf8'));
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  }
}
