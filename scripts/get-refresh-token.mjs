import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { URL } from 'node:url';

const PORT = 53682;
const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`;
const DEFAULT_SCOPE = 'https://www.googleapis.com/auth/gmail.send';

async function loadClientSecret() {
  const path = process.env.GOOGLE_OAUTH_CLIENT_JSON;
  if (!path) return null;
  const raw = await readFile(path, 'utf8');
  const json = JSON.parse(raw);
  // Supports both installed and web client JSON formats
  const data = json.installed ?? json.web ?? json;
  return {
    client_id: data.client_id,
    client_secret: data.client_secret,
  };
}

async function main() {
  let client_id = process.env.GOOGLE_CLIENT_ID;
  let client_secret = process.env.GOOGLE_CLIENT_SECRET;

  if (!client_id || !client_secret) {
    const fromFile = await loadClientSecret();
    if (fromFile) {
      client_id = client_id ?? fromFile.client_id;
      client_secret = client_secret ?? fromFile.client_secret;
    }
  }

  if (!client_id || !client_secret) {
    throw new Error(
      'Missing GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET or GOOGLE_OAUTH_CLIENT_JSON.'
    );
  }

  const scope = process.env.GOOGLE_OAUTH_SCOPE ?? DEFAULT_SCOPE;

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', client_id);
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', scope);
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');

  console.log('\nOpen this URL in your browser to authorize:');
  console.log(authUrl.toString());
  console.log(`\nWaiting for OAuth redirect on ${REDIRECT_URI} ...`);

  const code = await new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        const reqUrl = new URL(req.url ?? '', REDIRECT_URI);
        if (reqUrl.pathname !== '/oauth2callback') {
          res.writeHead(404);
          res.end('Not found');
          return;
        }
        const authCode = reqUrl.searchParams.get('code');
        const error = reqUrl.searchParams.get('error');
        if (error) {
          res.writeHead(400);
          res.end(`OAuth error: ${error}`);
          server.close();
          reject(new Error(`OAuth error: ${error}`));
          return;
        }
        if (!authCode) {
          res.writeHead(400);
          res.end('Missing code');
          return;
        }
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Authorization received. You can close this tab.');
        server.close();
        resolve(authCode);
      } catch (err) {
        server.close();
        reject(err);
      }
    });

    server.listen(PORT);
    server.on('error', reject);
  });

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id,
      client_secret,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  });

  const tokenText = await tokenRes.text();
  if (!tokenRes.ok) {
    throw new Error(`Token exchange failed: ${tokenText}`);
  }

  const tokenJson = JSON.parse(tokenText);

  console.log('\nRefresh token:');
  console.log(tokenJson.refresh_token ?? '(none returned)');
  console.log('\nAccess token (short-lived):');
  console.log(tokenJson.access_token ?? '(none)');
  console.log('\nIf refresh_token is missing, revoke access in Google Account > Security > Third-party access, then run again.');
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
