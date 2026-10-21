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

## Daily live room (Google Meet), members only

**Who sees it.** Only people who filled out the form and ticked the live room box. Everyone else sees a locked box with no schedule and no link. The page checks the person's private code against the `access` collection in Firestore.

**Monthly cycle.** All access ends on one date, set in the admin page (**Go live** tab, **Access cycle**). The first cycle ends 21 Nov 2026 (start of that day, New York time). After that the Join button disappears by itself. People fill out the form again to get the next cycle. Send the renewal email 3 days before the end (21 Nov: send on 18 Nov). Each month, set the new end date (21 Dec, 21 Jan, and so on).

**The real lock is Google Meet, not the page.** The Meet link is in the page code, so a technical visitor could find it. Protect the room in Google Calendar and Meet:
1. Add the active members as guests on the repeating **Ayiti Live Analysis** event (admin page, **Members** tab, **Copy active emails**).
2. In the event's Meet settings, set access to **Restricted**, so only invited people can join and you never have to admit anyone by hand. Guests must sign in to Google with the email you invited.
3. On the end date, remove expired members from the guest list (Members tab, **Copy expired emails**).

**One-time setup after Firebase is created.**
1. Sign in at `/feedback/admin.html`, open **Go live**, and tap **Set cycle end** (21 Nov 2026 is pre-filled). Nobody can get access until this is set.
2. In `site/index.html`, set `LIVE_PROJECT` (your Firebase projectId) and `LIVE_KEY` (your Firebase apiKey), and `FEEDBACK_URL`.

**I am live now.** A website cannot see inside Google Meet. Tap **I am live now, open Meet** on the admin page's first tab. Members then see a red "I am live now" box. **End live** turns it off, and it turns itself off after 3 hours.

**Privacy.** Email stays optional for the comment form. It is required only if the person ticks the live room box. It is used only to invite them and to remind them 3 days before access ends. The form and the privacy list say so.
