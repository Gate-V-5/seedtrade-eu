// Explicit fail-closed B2B API boundary until owner-approved activation.
// This module does not import MySQL, SMTP, or registration services.
export function handleDisabledB2bApi(req, res) {
  let pathname;
  try { pathname = new URL(req.url, 'http://localhost').pathname; }
  catch { return false; }
  if (!pathname.startsWith('/api/b2b/v1/')) return false;
  res.writeHead(404, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(JSON.stringify({error:'NOT_FOUND'}));
  return true;
}
