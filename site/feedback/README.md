# Public Voice: comment and vote on every section

A static site (GitHub Pages) plus Firebase Firestore. There is no server to run and no card is needed: it works on the free Spark plan.

## Why not GitHub Issues or Discussions
They are public, show the author's name and need a GitHub account. This project collects political opinions from people in a country where armed groups threaten critics, so names and comments must never be public.

## How the privacy works (all enforced in `firestore.rules`)
- The public can only **create, update or delete their own answers**. Nobody outside the review team can read `people`, `emails` or `submissions`.
- Every document id is a SHA-256 hash of a **private code** that only the person holds, so only they can find their answers again (to change a vote or delete everything).
- Emails sit in their own collection, apart from comments.
- The public reads only two things the review team publishes: a **results snapshot** (breakdown groups under the minimum size, default 20, are removed before publishing) and the **revision logs**.
- Raw IP addresses are never stored (the site never sees them).
- The rules were tested against the Firestore emulator (31 checks in `tests/rules.test.mjs`).

## One-time setup (about 15 minutes)
1. Go to console.firebase.google.com, create a project (no Google Analytics needed), stay on the free Spark plan.
2. **Build > Firestore Database > Create database**, production mode, a region near your readers (for example `nam5`).
3. **Rules** tab: paste all of `firestore.rules`, Publish.
4. **Build > Authentication > Get started**, enable **Email/Password**. Add a user for the review team (email and a strong password). Copy that user's **UID**. Under Settings > Authorized domains add `maxmaseratii.github.io`.
5. In Firestore, create the collection `admins`, with a document whose **id is that UID** and one field, `ok` = true.
6. **Project settings > Your apps > Web app (</>)**: register an app and copy `apiKey`, `authDomain`, `projectId`, `appId` into `config.js`. These are meant to be public.
7. Commit. The public site is `/feedback/` and the review page is `/feedback/admin.html`.
8. Recommended: **App Check** (Build > App Check) with reCAPTCHA v3, then put its site key in `config.js` as `APPCHECK_SITE_KEY` and turn on enforcement for Firestore. This blocks scripts that are not your site.

## What the review team does in `admin.html`
Overview, filterable submissions (read each comment beside the person's profile, set status New / Reviewed / Accepted / Declined with a public reason / Needs translation), campaign detection (five or more near-identical comments in one hour), **Publish results** (with an option to count a campaign once), the public revision log for each section, CSV exports (emails behind a second confirmation), and retention.

## Limits you should know
- Results are a snapshot that a reviewer publishes, not a live counter. That is what keeps small groups hidden.
- The private code is the only way to change or delete an answer. If someone loses it, they can answer again from a new browser and the old answer stays.
- Without App Check, a script can still submit junk answers. The rules cap field sizes and allowed values, and reviewers can filter campaigns.
- Self-declared profiles cannot be verified. Results show who says what with sample sizes and give nobody extra weight.
- Delete: a person deletes by code. The site cannot say whether anything existed, because the public cannot read.
- A site that collects opinions is a target. Protect the Firebase account with two-step verification and review the access log.
- The Kreyòl text in `strings.js` needs a native-speaker review before launch.

## Daily live room (Google Meet)

- The page shows the live schedule at the top of every tab: room opens 4:35 AM New York time, live at 4:45 AM New York time, Monday to Friday. Each visitor also sees the next live in their own local time.
- The Meet link is in `site/index.html` (`LIVE_MEET`) and in `site/feedback/admin.html` (`MEET`). It is the repeating Google Calendar event, so the link never changes.
- A website cannot see inside Google Meet. To show **I am live now**, sign in at `/feedback/admin.html` and tap **I am live now, open Meet** on the first tab. Tap **End live** when you finish. It switches itself off after 3 hours.
- For the badge to work on the main page, set `LIVE_PROJECT` (your Firebase projectId) and `LIVE_KEY` (your Firebase apiKey) in `site/index.html`. Leave them empty and the page shows the schedule only.
