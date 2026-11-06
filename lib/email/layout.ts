// Layout visual común de los mails de Snappy (encabezado negro, tarjeta blanca, pie).
// Sin imports (ni alias) para poder probarlo sin red.

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Botón verde centrado.
export function emailButton(href: string, label: string): string {
  return `<table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${href}"
                      style="display:inline-block;background-color:#1BB179;color:#0C2D1F;text-decoration:none;
                             font-weight:900;font-size:13px;letter-spacing:1px;text-transform:uppercase;
                             padding:16px 40px;border-radius:16px;">
                      ${label}
                    </a>
                  </td>
                </tr>
              </table>`;
}

// Documento completo. `content` va dentro de la tarjeta blanca (ya con su HTML).
export function emailLayout(title: string, content: string): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#F5F5EF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F5F5EF;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- HEADER NEGRO -->
          <tr>
            <td style="background-color:#15160E;border-radius:24px 24px 0 0;padding:40px 48px;text-align:center;">
              <img src="https://snappy.uno/logo-snappy.svg" alt="Snappy" width="48" height="48"
                style="display:block;margin:0 auto 16px;" />
              <span style="color:#F5F5EF;font-size:22px;font-weight:900;letter-spacing:-0.5px;text-transform:uppercase;">
                Snappy
              </span>
            </td>
          </tr>

          <!-- CONTENIDO BLANCO -->
          <tr>
            <td style="background-color:#FFFFFF;padding:48px;border-radius:0 0 24px 24px;">
${content}
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="padding:24px 0;text-align:center;">
              <p style="margin:0;font-size:11px;color:#86877B;">
                © ${new Date().getFullYear()} Snappy · hola@snappy.uno
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}
