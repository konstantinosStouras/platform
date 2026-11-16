# Marketplace Lab

Classroom foundation for two-sided and multi-sided marketplace simulations.

- Website: https://www.stouras.com/marketplace/
- Instructor workspace: https://www.stouras.com/marketplace/#/admin
- Firebase project: `stouras-marketplace-2026`
- Firestore: Standard edition, `(default)`, London (`europe-west2`)

## Included

Google and email/password registration, email verification, password reset, instructor access, class and private test sessions, ten-character invite codes, real-time rosters and waiting rooms, participant side assignment, and JSON export. New sessions default to Hosts and Guests. Instructors may name two to eight distinct sides. Test sessions are private to their creator, with one optional sample participant per side and student-view previews.

Session lifecycle is lobby → active ⇄ paused → closed. Students can join only in the lobby. Closed sessions remain available for review. Trading, pricing, matching, payments, scores, and other simulation mechanics are intentionally outside this foundation release.

## Accounts and permissions

The verified `kstouras@gmail.com` account is the bootstrap administrator, matching the existing UCD Blog setup. Sign in with Google, then open the instructor workspace. Its “Manage instructor access” section can grant another email permission to create sessions after that account verifies its email. Other registrations are students. To revoke delegated access, delete its `instructors/{email}` document in the Firebase console. Instructors manage only sessions they own.

Student email and display name stay in Firebase Authentication. Rosters use random participant aliases; no email addresses are stored in session documents. Students can read their own membership, not the roster or another student's personal session index. A verified user with the unguessable invite code may read basic class session settings. Test session settings are owner-only. Permissions are enforced by Firestore rules, not only the interface.

## Development and verification

Node 22 or newer. Static ES modules load the Firebase 13.3.0 browser SDK from Google's CDN; there is no bundler or production Node server.

```sh
npm ci
npm start
npm run check
npm test
npx -y firebase-tools@latest emulators:exec --only firestore,auth --project demo-marketplace "npm run test:rules"
```

The emulator requires Java 21+. For browser tests, start the server and both emulators, then run `node tests/browser.mjs`. `http://127.0.0.1:4173/marketplace/?emulator=1` connects only to local emulators and uses the `demo-marketplace` project. Emulator mode is unavailable on production domains. Browser tests use the installed Chrome browser.

## Deployment

The main website mounts this repository at `/marketplace` as a Git submodule. Its existing “Publish independent projects” workflow updates the pinned source commit. The website keeps its existing GitHub Pages/Jekyll setup and domain.

```sh
npx -y firebase-tools@latest deploy --only firestore,auth --project stouras-marketplace-2026
gh workflow run sync-projects.yml --repo konstantinosStouras/konstantinosStouras.github.io
```

`check-project.mjs` refuses database deployments to a different project. Firebase browser configuration is public by design; service-account keys and credentials must never be committed. Authentication providers and authorized domains are configured in `firebase.json`.

## Security validation

Prototype Firestore rules are compiled on deployment and tested against the emulator for unauthenticated access, verification, privilege escalation, cross-instructor ownership, private test access, schema and size limits, atomic joining, roster privacy, and lifecycle restrictions. Review the rules before broad classroom rollout. Tests are a useful baseline, not a security guarantee.

## Reference projects

The setup follows the separate-repository publishing pattern from AgentLab and UCD Blog, the Firebase sign-in and instructor/session pattern from Realgame Sustainability, and the existing site's deployment guard convention.
