# Citizen privacy notice

**Show this notice before collecting a citizen's account details, location, SOS, report, or photo.** The backend branch does not include the PWA screen that must display it or record the person's consent.

> AAGAM uses your phone number and home district for your account. If you submit an SOS or incident report, authorized disaster-response officers assigned to that district can see the details you provide, including your location, notes, and SOS contact details. Incident photos are used for damage triage; when live AI mode is enabled, the photo is sent to the configured vision service. In this demo, SMS is mocked and no SMS is sent. Offline SOS/report data stays on this phone until it can sync; queued means it has not been sent and help has not been notified. For immediate help, call 112. Photos are deleted after 30 days; SOS location and notes and report location and notes are removed after 90 days. Citizen account identifiers are anonymized after 90 days. Do not submit information you do not want shared with your district response team.

The notice and retention periods describe this demo implementation. A real pilot needs an approved privacy review, consent capture, an operational contact for data requests, and confirmation that the deployment's retention schedule and configured vision provider match this notice.
