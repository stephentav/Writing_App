# AI integration and authentication

The hosted app uses a Cloudflare Worker ESM bundle. Sites authenticates requests and enforces its owner-private access policy. The Worker requires platform identity on every app asset and coaching request. There is no public registration or app-managed password database. Sign-in and sign-out use Sites-owned routes. Invitations must be explicitly approved before changing audience.

`OPENAI_API_KEY` is a secret in Sites runtime configuration, never bundled or returned. `OPENAI_MODEL` is an optional server-side setting; the default is `gpt-4.1-mini`. The server calls the OpenAI Responses API with `store: false`, a fixed coaching instruction, and 1,100 maximum output tokens. The application does not log prompts or responses. This is not a promise of zero provider retention.

The student explicitly sends reviewed context plus their recent conversation. Attachments and recordings are excluded. Server validation limits request bytes, context length, message roles, message count and message sizes. Same-origin JSON POST is required. An in-memory per-user throttle allows at most ten requests per minute per Worker isolate and one in-flight request per isolate; this is a best-effort guard, not a global spending cap. Configure API project budget alerts/limits separately.

The coach cannot write files or change the storyboard. Student-authored drafts remain untouched. Students may review and approve a locally saved transcript labeled as AI coaching, or edit it into decisions and next steps. Close warnings are best-effort; unsaved conversations disappear on refresh. Follow-ups carry the last five exchanges and the current reviewed context snapshot.

Responses API reference: https://developers.openai.com/api/docs/guides/migrate-to-responses
Model reference: https://developers.openai.com/api/docs/models/gpt-4.1-mini

## Remaining pilot checks
Thirty-one automated tests and built Worker checks pass. A live synthetic request on 2026-11-06 reached OpenAI and returned `credit_balance_exhausted` / `insufficient_quota`. API credits must be replenished before a successful live coaching response can be verified. Native browser sign-in, unauthorized-account access and visual layout remain manual checks. Speech transcription and automatic structured application of outline suggestions are not implemented.
