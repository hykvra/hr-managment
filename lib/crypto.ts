import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto'

function getKey(): Buffer {
  // Derive a 32-byte AES key from JWT_SECRET so no extra env var is needed
  return createHash('sha256').update(process.env.JWT_SECRET ?? 'fallback-dev-key').digest()
}

/**
 * AES-256-CBC encrypt a string. Returns "ivHex:encryptedHex".
 * Use to store sensitive fields (e.g. device passwords) in the DB.
 */
export function encryptText(plaintext: string): string {
  const iv = randomBytes(16)
  const cipher = createCipheriv('aes-256-cbc', getKey(), iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`
}

/**
 * Decrypt a value produced by encryptText.
 */
export function decryptText(ciphertext: string): string {
  const [ivHex, encHex] = ciphertext.split(':')
  if (!ivHex || !encHex) return ''
  const decipher = createDecipheriv('aes-256-cbc', getKey(), Buffer.from(ivHex, 'hex'))
  const decrypted = Buffer.concat([decipher.update(Buffer.from(encHex, 'hex')), decipher.final()])
  return decrypted.toString('utf8')
}
