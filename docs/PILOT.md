# Chrome-on-Mac pilot

Use a disposable assignment folder with copies. No API key is required.

## Automated checks already run
`npm test`: 31 passing tests; `npm run build`: passes. Authenticated Worker output builds successfully. These checks do not exercise actual browser permissions, microphone hardware, PDF rendering, or visual layout.

## Manual checks — pending
- Open the deployed URL in a regular top-level Chrome tab. Folder picker may not work inside an embedded preview.
- Cancel the folder picker: no error page and no writes.
- Open the folder: app lists supported documents and keeps original file contents unchanged.
- Add a note, cancel review: folder is unchanged and rough text remains.
- Approve a note: verify project.json and exact student-authored text.
- Edit a source and reorder an outline: review clearly describes each update.
- Save twice: verify a prior project snapshot under history.
- Change project.json externally, then attempt a stale save: app rejects it. Cancel, refresh, and reapply changes.
- Deny write permission or remove the drive: error is visible, no false saved message.
- Reopen after closing the tab: saved state resumes after folder permission is granted.
- Preview .docx with punctuation and non-ASCII text; confirm text extraction without HTML execution.
- Preview PDF; try a scanned PDF and note that OCR is not provided.
- Open .gdoc or .doc: export instructions appear.
- Edit a draft in Word, save there, refresh here: preview shows the saved version.
- Allow microphone: record, stop, play back, approve, and locate the new audio file.
- Deny microphone access: typed notes remain usable.
- Leave with unsaved notes or audio: close warning appears when Chrome permits it.
- Verify narrow-window layout, keyboard focus, dialogs, and screen-reader labels.
- Verify the text coach; confirm transcription remains labeled unavailable.

## Pilot success
The student can capture one thought, attach a source, add one next step, approve a save, and resume without reconstructing the work. Ask what felt like extra administration before adding features.

## Source-and-note checks
- Create a source, add two notes inside it, reopen the project, and confirm grouping.
- Rename the source; both notes must remain linked.
- Link a legacy unassigned note, then change its source through reviewed edits.
- Attach a PNG and a PDF from nested project folders; preview each and verify original bytes are unchanged.
- Cancel an attachment review; no project update should be saved.
- Move an attached file externally; opening the old link should report that it is missing. Relink through Edit note.
- Uncheck an attachment and approve; the file must remain on disk.

Storyboard checks: create two sections and multiple notes; drag or use Move to; cancel a move; approve a move and reopen the folder; reorder sections and notes; confirm source details remain attached. Test keyboard menus and narrow-screen layout. Plan with AI should include only selected note text and should not send anything automatically. Native browser drag and layout still need manual verification.

Authentication pilot: signed-out visitors must be routed to sign-in; an uninvited account must be denied by Sites. Verify the signed-in account indicator and sign-out. Confirm Send shares only reviewed context, failures preserve the question, and session notes require approval. Native browser sign-in and layout require manual verification.
