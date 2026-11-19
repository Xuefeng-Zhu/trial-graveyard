# Email providers

The Haunted Demo Inbox uses generated fixture messages. Its consent screen grants access only to those fixtures.

A future browser-only Gmail provider could use the Google Identity Services token client with the `gmail.readonly` scope. An Outlook provider could use MSAL.js with delegated `Mail.Read` and Microsoft Graph. Both would need explicit consent and would keep access tokens in memory. The current app ships only the mock provider.
