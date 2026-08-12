// Checks a Gmail inbox for an email delivered to a given address, using the
// OAuth token produced by scripts/gmail-auth.js. Used to confirm the app
// actually sent a notification email after an action (e.g. coordinator
// creation), not just that the form submitted successfully.
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const ROOT = path.join(__dirname, '..', '..');
const TOKEN_PATH = path.join(ROOT, 'token.json');

function findCredentialsFile() {
  const candidate = fs.readdirSync(ROOT).find((f) => f.startsWith('client_secret_') && f.endsWith('.json'));
  if (!candidate) {
    throw new Error('No client_secret_*.json file found in project root.');
  }
  return path.join(ROOT, candidate);
}

function getGmailClient() {
  if (!fs.existsSync(TOKEN_PATH)) {
    throw new Error('token.json not found. Run `node scripts/gmail-auth.js` first.');
  }
  const { client_secret, client_id } = JSON.parse(fs.readFileSync(findCredentialsFile())).installed;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret);
  oAuth2Client.setCredentials(JSON.parse(fs.readFileSync(TOKEN_PATH)));
  return google.gmail({ version: 'v1', auth: oAuth2Client });
}

function extractBody(payload) {
  if (payload.body?.data) return Buffer.from(payload.body.data, 'base64').toString('utf-8');
  if (payload.parts) {
    const plainPart = payload.parts.find((p) => p.mimeType === 'text/plain');
    if (plainPart?.body?.data) return Buffer.from(plainPart.body.data, 'base64').toString('utf-8');
    const htmlPart = payload.parts.find((p) => p.mimeType === 'text/html');
    if (htmlPart?.body?.data) return Buffer.from(htmlPart.body.data, 'base64').toString('utf-8');
  }
  return '';
}

/**
 * Pulls "Email: ...", "Password: ...", "Account Type: ..." out of the
 * Divisarana welcome email body (works against both the HTML markup and
 * the plain-text snippet, since list items render as "Label: value" either way).
 */
function extractAccountCredentials(body) {
  const clean = body.replace(/<[^>]+>/g, ' ');
  const match = (label) => clean.match(new RegExp(`${label}\\s*:\\s*([^\\n<]+)`, 'i'));
  return {
    email: match('Email')?.[1]?.trim() ?? null,
    password: match('Password')?.[1]?.trim() ?? null,
    accountType: match('Account Type')?.[1]?.trim() ?? null,
  };
}

/**
 * Polls the inbox until an email addressed to `recipientEmail` is found
 * (searched via Gmail's `to:` operator), or the timeout is reached.
 * Returns the matching message's subject/body/credentials, or null if none arrived.
 */
async function waitForEmailTo(recipientEmail, { timeoutMs = 60_000, pollIntervalMs = 5_000, afterEpochSeconds } = {}) {
  const gmail = getGmailClient();
  const query = afterEpochSeconds
    ? `to:${recipientEmail} after:${afterEpochSeconds}`
    : `to:${recipientEmail}`;

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const { data } = await gmail.users.messages.list({ userId: 'me', q: query, maxResults: 1 });
    if (data.messages && data.messages.length > 0) {
      const message = await gmail.users.messages.get({
        userId: 'me',
        id: data.messages[0].id,
        format: 'full',
      });
      const headers = Object.fromEntries(
        message.data.payload.headers.map((h) => [h.name, h.value])
      );
      const body = extractBody(message.data.payload);
      return {
        subject: headers.Subject,
        from: headers.From,
        to: headers.To,
        snippet: message.data.snippet,
        ...extractAccountCredentials(body),
      };
    }
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }
  return null;
}

module.exports = { waitForEmailTo };
