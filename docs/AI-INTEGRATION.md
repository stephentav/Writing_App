# AI integration boundary — deferred by user request

This release contains no live model endpoint and no API credential. The guided questions are explicitly fixed prompts, not simulated AI conversation.

## Add later
- A private server endpoint for coaching; credentials remain in hosting runtime secrets, never client JavaScript, GitHub, or localStorage.
- Small, student-selected excerpts, relevant project state, and assignment requirements passed to the model. Show what is included; avoid uploading an entire folder automatically.
- Speech transcription after explicit send action, with editable transcript review before capture as a note.
- One conversational coach with planning, research, outlining, and revision contexts.
- Structured organizational suggestions mapped to the existing review UI. AI responses cannot call arbitrary filesystem writes.
- Student-authored drafts remain read-only. The model may ask questions and give feedback, not compose or replace assignment prose.
- Missing-source honesty, bounded research tasks, and milestone save prompts.
- Request limits, timeouts, parent-funded usage limits, and server-side authorization before enabling a paid endpoint.

## Preserve
The browser owns file access and approval. Server code must not receive arbitrary paths or decide what files to overwrite. Only approved records reach Writing Room/project.json through saveApproved. Existing drafts remain untouched. The current app uses no hosted data store.

## Gate before enabling
Verify a funded key securely, test authorization and spending controls, then test real coaching and transcription with fictional material. Do not label AI as available merely because a key was entered. Account/sign-on and billing product flows for multiple students are outside this pilot.
