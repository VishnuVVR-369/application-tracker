# Android quick capture

Way2More can be installed from Chrome on Android and registered in the Android share sheet. When you share a job link to Way2More, it opens a review screen; the application is written to Convex only after you confirm it.

This feature is Android-only. It does not add an iOS application, a native Android package, background scraping, or offline write queue.

## Requirements

- An Android phone with a current version of Google Chrome
- The Way2More web app deployed on HTTPS (a production deployment, not a plain LAN or HTTP URL)
- A Way2More account using one of the configured sign-in providers

The desktop extension and Android capture use the same Way2More account and Convex data. The Android flow does not use or expose the extension token.

## Install on Android

1. Open the deployed Way2More URL in Chrome on the Android phone.
2. Sign in and open **Settings**.
3. Find **Android quick capture** and tap **Install on Android** if the button is available.
4. If the button is not shown, open Chrome's three-dot menu and tap **Install app** or **Add to Home screen**.
5. Confirm the installation. Launch Way2More from the new home-screen icon once and verify that you are signed in.

Chrome creates an installed web app for Way2More. Installation is what registers Way2More as an Android share target; merely bookmarking the website is not enough.

## Capture a job from a phone

1. Open a job in LinkedIn, Chrome, or another Android app that can share links.
2. Tap **Share**.
3. Choose **Way2More** in the Android share sheet. You may need to expand the sheet with **More** the first time.
4. Review the posting URL, company, and role. Android apps place shared links in different fields, so company and role are filled only when the title has a recognizable format.
5. Select **Saved for later** or **Already applied**.
6. Optionally add location, work arrangement, source, resume, job description, or notes.
7. Tap **Save application** or **Add applied job**.

You can also long-press the installed Way2More icon and choose **Add job**, or open **Settings → Android quick capture → Open quick capture**, to enter an application without sharing from another app.

## Duplicate behavior

Way2More normalizes common job-link variants before creating an application:

- LinkedIn job URLs are reduced to their stable numeric job URL.
- Fragment identifiers and known marketing parameters such as `utm_*`, `gclid`, and `fbclid` are removed.
- Other query parameters are retained because they may identify a different job.

If the normalized URL already exists, Way2More shows the existing application and does not create a second row. Archived applications also count as duplicates; open the archived record and decide whether to restore or update it.

## Privacy and failure behavior

- Receiving a share does not write to the database.
- The incoming title, text, and URL arrive as normal HTTPS request parameters and may therefore be present in browser history or hosting access logs. Way2More does not write them to the application database before confirmation; the review draft itself is kept in the current tab's `sessionStorage`.
- The temporary draft expires after 30 minutes and is removed after a successful create.
- Only HTTP and HTTPS URLs without embedded credentials are accepted.
- A failed or interrupted save stays on the review screen so you can retry. There is no background or offline submission.

## Troubleshooting

### Way2More is missing from the share sheet

Confirm that the app was installed from Chrome, not only bookmarked. Open the installed app once, then try Share → More. If the app was installed before Android capture was added, uninstall Way2More and install it again so Android receives the current manifest.

### Chrome does not offer installation

Use the deployed HTTPS URL, wait for the page to finish loading, and check Chrome's three-dot menu. Private/incognito browsing and some managed-device policies can prevent installation. The Settings panel's install button depends on Chrome exposing its install prompt, so the menu remains the fallback.

### The link or title is not filled correctly

Different Android apps populate `title`, `text`, and `url` differently. Way2More checks all three and extracts the first safe HTTP(S) link, but you can edit every field before saving. If the wrong link is selected from a share containing multiple links, replace it in the review form.

### Sign-in returns to the dashboard

Start the share again. The sign-in callback is restricted to Way2More's `/app` routes; external callback URLs are rejected. Keep the share tab open during OAuth so its temporary draft remains available.

### An application is reported as a duplicate

Open the existing record from the warning. The match includes archived records and URL variants with removable tracking parameters.

## Developer verification

Run the normal quality gates:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm extension:test
pnpm extension:build
```

To exercise the receiver locally in a desktop browser, start the app and open:

```text
http://localhost:3000/capture?title=Acme%20hiring%20Engineer%20%7C%20LinkedIn&text=https%3A%2F%2Fwww.linkedin.com%2Fjobs%2Fview%2F4250012345%2F
```

This verifies parsing, authentication handoff, review, duplicate detection, and creation. It does **not** prove Android share-sheet registration.

Before release, use a physical Android phone against the deployed HTTPS origin:

1. Install or reinstall Way2More from Chrome.
2. Share one LinkedIn job and one ordinary company careers URL.
3. Verify both **Saved** and **Applied** dates in a timezone that differs from UTC.
4. Share the same link again and verify that the existing application is shown.
5. Archive that application, share it again, and verify that the archived duplicate is shown.
6. Sign out, initiate a share, sign in, and verify that the review draft survives the same-tab OAuth round trip.

Physical-device verification is required release evidence because desktop tests and Android emulation cannot guarantee that an installed web app appears correctly in a real device's share sheet.
