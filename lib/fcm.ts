import { createSign } from 'crypto';

// Envío de notificaciones push a la app Android (Firebase Cloud Messaging, API HTTP v1).
// Sin dependencias: firmamos el JWT de la cuenta de servicio con crypto de Node.
// Variable de entorno: FIREBASE_SERVICE_ACCOUNT (el JSON de la clave de servicio de Firebase).

type ServiceAccount = { project_id: string; client_email: string; private_key: string };

let cachedToken: { value: string; exp: number } | null = null;

function loadServiceAccount(): ServiceAccount | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  try {
    const sa = JSON.parse(raw);
    if (!sa.project_id || !sa.client_email || !sa.private_key) return null;
    return sa;
  } catch {
    return null;
  }
}

const b64url = (input: string | Buffer) =>
  Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.exp - 60 > now) return cachedToken.value;

  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    })
  );
  const signer = createSign('RSA-SHA256');
  signer.update(`${header}.${claims}`);
  const signature = b64url(signer.sign(sa.private_key));

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${header}.${claims}.${signature}`,
    }),
  });
  if (!res.ok) throw new Error(`FCM auth falló: ${res.status}`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: json.access_token, exp: now + (json.expires_in || 3600) };
  return json.access_token;
}

// Manda un mensaje de solo datos (la app arma la notificación) a cada token.
// Devuelve cuántos salieron y qué tokens ya no sirven (celu desinstalado o token vencido) para limpiarlos.
export async function sendFcm(
  tokens: string[],
  data: Record<string, string>
): Promise<{ sent: number; invalid: string[]; skipped?: boolean }> {
  const sa = loadServiceAccount();
  if (!sa || tokens.length === 0) return { sent: 0, invalid: [], skipped: !sa };

  const accessToken = await getAccessToken(sa);
  const url = `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`;
  const invalid: string[] = [];
  let sent = 0;

  await Promise.allSettled(
    tokens.map(async (token) => {
      const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: { token, data, android: { priority: 'HIGH', ttl: '600s' } },
        }),
      });
      if (res.ok) {
        sent++;
        return;
      }
      const body = await res.text();
      if (res.status === 404 || body.includes('UNREGISTERED') || body.includes('INVALID_ARGUMENT')) {
        invalid.push(token);
      } else {
        console.error('FCM send error', res.status, body.slice(0, 300));
      }
    })
  );

  return { sent, invalid };
}
