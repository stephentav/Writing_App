# Writing Room — browser prototype
A quiet workspace for student-owned research and writing. The app opens a student-selected local folder in Chrome on Mac, shows documents when needed, and saves organizational work only after review and approval.

**Version 0.2:** the local workflow works without an API key. AI coaching and transcription are intentionally disabled and labeled in the interface. No mock response is presented as AI. This replaces the template-only product direction; the earlier kit remains in its separate draft PR.

## Run locally
Requires Node.js 22+ and Python 3 for the optional preview command.

```sh
npm ci
npm test
npm run build
npm run dev
```
Open http://127.0.0.1:4173 in desktop Chrome. For hosting, serve `dist/` over HTTPS. Do not open index.html directly from the filesystem.

## Try it
1. Make a test folder with a .docx, PDF, and text note. Use copies for the first pilot.
2. Open the app and select that folder. Chrome requests folder access.
3. Choose **Edit project & plan** to enter requirements, research question, due date, and one next step.
4. Type a rough thought, choose **Review as a note**, then approve the displayed update.
5. Add source records, outline sections, and dated tasks. All changes use the same approval flow.
6. Under **My files**, preview saved documents. Edit drafts in Word or Google Docs; export Google Docs to .docx/PDF in the selected folder and refresh here.
7. Record an idea, listen back, and approve saving the audio separately.
8. Close and return. Reopen the last folder (Chrome may ask for permission again) to load saved project state.

## Working now
- Folder selection and remembered handle in IndexedDB; no project content is cached there.
- Read-only .docx text, PDF, .txt, and .md previews. Legacy .doc and .gdoc shortcuts show export guidance.
- Student-authored notes, source details, outline sections with source/location fields, and tasks.
- Project requirements, research question, due dates, next step, and completion tracking.
- Change review, explicit approval, exact save verification, recovery copies, and stale-state rejection.
- Outline reordering and record editing through approval.
- Local microphone recording, playback, and separately approved audio saves.
- Before-unload warning for unsaved capture, proposals, or audio where the browser supports it.

## Data ownership
Approved project data lives in `Writing Room/project.json` inside the selected folder. Earlier snapshots are retained in `Writing Room/history/`. Approved recordings live in `Writing Room/recordings/`. Source documents and drafts are never written by the app. The folder handle is the only information remembered in browser IndexedDB.

No file content or audio is sent to an AI service in this release. The Site host still serves the application and may maintain ordinary access logs. There is no API key in source or browser storage.

## Verification and limitations
13 automated tests cover model behavior, reviewed saves, conflict rejection, recovery copies, and DOM interactions. Build and HTTP asset checks pass. Actual Chrome picker permissions, microphone recording, PDF rendering, and visual layout require the [manual pilot](docs/PILOT.md); they were not browser-tested in the authoring session.

PDF previews use the browser viewer, with no OCR or text extraction yet. Word previews extract text only, so layout and page numbers may differ. Files are limited to 25 MB for preview. Files are refreshed manually. Folder scanning is limited to eight levels and 3,000 entries. Use a dedicated assignment folder.

Conflict detection checks the current saved project before writing; it is not a cross-application filesystem transaction. Same-origin tabs use Web Locks when available. Avoid editing project.json concurrently in other applications; recovery snapshots are retained.

Recording stops after three minutes. Audio is not transcribed. Unapproved content is not persisted across a browser crash; browser close warnings are best-effort. There are no background deadline notifications.

## Next phase
See [AI integration boundary](docs/AI-INTEGRATION.md). The parent can configure a server-side key later. No key is needed for this prototype.
