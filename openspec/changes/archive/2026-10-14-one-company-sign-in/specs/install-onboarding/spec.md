## ADDED Requirements

### Requirement: The owner signs in once for memory

Owner setup SHALL ready `cloudflared` on the owner's computer with the other tools, and sign the owner in to their own app once, showing the sign-in link in the chat. The owner's memory SHALL then work through that sign-in like everyone else's. Owner jobs that change the account, such as setup and fixes, SHALL keep using the Cloudflare API token.

#### Scenario: A fresh owner install

- **WHEN** an owner finishes setup on a computer without `cloudflared`
- **THEN** it is installed, the owner signed in once from the chat, and the closing report says memory works
