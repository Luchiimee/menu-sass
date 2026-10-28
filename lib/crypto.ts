// Cifrado simétrico para secretos guardados en la base (tokens OAuth de MP).
// AES-256-GCM con el módulo crypto de Node. SOLO para código de servidor:
// no importar desde componentes cliente.
//
// Clave: MP_TOKEN_ENC_KEY = 32 bytes aleatorios en base64. Para generarla
// (una sola vez, y cargarla en Vercel y en .env.local sin compartirla):
//   openssl rand -base64 32
//   o: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
// Si se pierde o se cambia la clave, los tokens guardados no se pueden
// descifrar y cada restaurante tiene que volver a conectar su cuenta.
//
// Formato del texto cifrado: iv.tag.ciphertext, cada parte en base64.

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;

function getKey(): Buffer {
  const raw = process.env.MP_TOKEN_ENC_KEY;
  if (!raw) {
    throw new Error('MP_TOKEN_ENC_KEY no está configurada: no se pueden cifrar ni descifrar tokens.');
  }
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) {
    throw new Error('MP_TOKEN_ENC_KEY inválida: tiene que ser 32 bytes en base64.');
  }
  return key;
}

export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, ciphertext].map((b) => b.toString('base64')).join('.');
}

export function decrypt(payload: string): string {
  const key = getKey();
  const parts = payload.split('.');
  if (parts.length !== 3) {
    throw new Error('Texto cifrado con formato inválido.');
  }
  const [iv, tag, ciphertext] = parts.map((p) => Buffer.from(p, 'base64'));
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}
