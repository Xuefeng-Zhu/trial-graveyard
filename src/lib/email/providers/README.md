# Email providers

Every provider implements `EmailProvider` from `../types.ts`. The scanner and the UI only see that interface, so a new provider is a drop-in: add a file here and register it in `PROVIDERS` in `../index.ts`.

```ts
interface EmailProvider {
  id: string;
  label: string;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  searchReceipts(opts: { since: Date }): AsyncIterable<EmailMessage>; // { id, from, subject, date, text }
}
```

`searchReceipts` should reject when not connected and yield messages one at a time so the scan can show live progress.

## Available

- `mock.ts`: "Haunted Demo Inbox". In-memory fixtures with dates relative to now, fake consent step, injectable delay. No network.

## Planned

Both planned providers run in the browser with no backend. Tokens stay in memory and are dropped on `disconnect()`.

### Gmail
- Sign in with Google Identity Services (token client, implicit token flow).
- Scope: `https://www.googleapis.com/auth/gmail.readonly`.
- `users.messages.list` with a `q` such as `after:<since> (trial OR "free for" OR renews)`, then `users.messages.get` per id. Decode the text part into `EmailMessage.text`.

### Outlook
- Sign in with MSAL.js (`@azure/msal-browser`) using a popup login.
- Scope: `Mail.Read`.
- Microsoft Graph `GET /me/messages` with a `$filter` on `receivedDateTime ge <since>`, mapping `bodyPreview` or the text body to `EmailMessage.text`.
