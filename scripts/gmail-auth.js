// One-time setup: run `node scripts/gmail-auth.js` and follow the printed
// URL to grant Gmail read access. Produces token.json, which the test suite
// then uses to check for received emails without any further manual login.
const fs = require('fs');
const path = require('path');
const http = require('http');
const { google } = require('googleapis');

const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
const TOKEN_PATH = path.join(__dirname, '..', 'token.json');

function findCredentialsFile() {
  const root = path.join(__dirname, '..');
  const candidate = fs.readdirSync(root).find((f) => f.startsWith('client_secret_') && f.endsWith('.json'));
  if (!candidate) {
    throw new Error('No client_secret_*.json file found in project root. Download it from Google Cloud Console first.');
  }
  return path.join(root, candidate);
}

async function main() {
  const credentialsPath = findCredentialsFile();
  const { client_secret, client_id } = JSON.parse(fs.readFileSync(credentialsPath)).installed;

  const server = http.createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const redirectUri = `http://localhost:${port}`;

  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirectUri);

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });

  console.log('\nOpen this URL in a browser and grant access:\n');
  console.log(authUrl);
  console.log('\nWaiting for authorization...\n');

  const code = await new Promise((resolve, reject) => {
    server.on('request', (req, res) => {
      const url = new URL(req.url, redirectUri);
      const authCode = url.searchParams.get('code');
      const error = url.searchParams.get('error');
      if (error) {
        res.end('Authorization failed. You can close this tab.');
        reject(new Error(error));
        return;
      }
      if (authCode) {
        res.end('Authorization successful. You can close this tab and return to the terminal.');
        resolve(authCode);
      }
    });
  });
  server.close();

  const { tokens } = await oAuth2Client.getToken(code);
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
  console.log(`Token saved to ${TOKEN_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
