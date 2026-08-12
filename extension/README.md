# Way2More LinkedIn Capture

A personal Chrome Manifest V3 extension that reviews a LinkedIn job and saves it to Way2More. The extension supports direct LinkedIn job pages and the selected-job panel in LinkedIn search results.

## Build and load

From the repository root:

```bash
pnpm install
pnpm extension:test
pnpm extension:build
```

Then open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**, and select:

```text
extension/.output/chrome-mv3
```

For a versioned installation artifact, run `pnpm extension:zip`. WXT writes the ZIP under `extension/.output/`.

To update the personal installation, rebuild and click **Reload** on the existing extension card. Keep loading the same output directory so Chrome retains the extension installation and its device-local settings.

## Connect to Way2More

1. Sign in at `https://way2more.vercel.app/app/settings`.
2. Under **Chrome extension access**, create a named token such as `Personal Chrome`.
3. Copy the token when it is shown. Way2More stores only its SHA-256 hash.
4. Open the extension options page, paste the token, and choose **Test connection and save**.

The production tracker URL is prefilled. `http://localhost:3000` is accepted for local development.

## Capture a job

On a supported LinkedIn job page, use **Add to Tracker** beside the job actions. If LinkedIn changes that area, use the extension toolbar popup and choose **Capture current LinkedIn job**.

The preview requires a LinkedIn job ID, posting URL, company, and role. It defaults to **Saved**; select **Already applied today** to create an Applied record using your local timezone stored by Way2More. All extracted identity and compensation fields can be edited before confirmation. Currency remains blank unless LinkedIn explicitly provides one. Nothing is submitted to Way2More until **Add to Tracker** is pressed.

### How fields are extracted

The preview fills in company, role, location, workplace type, compensation, and the job description from the first source that answers, in order:

1. **JSON-LD `JobPosting`**, when LinkedIn serves it (mostly signed-out job pages).
2. **The selected job pane.** Generic markup — the page `h1`, `/company/` links — is read only inside the pane, so a search-results rail never contributes another job's details. Labels LinkedIn duplicates for screen readers are collapsed, and posting recency, applicant counts, and promotion badges are discarded from the location.
3. **The Open Graph title**, which encodes `Company hiring Role in Location`.
4. **LinkedIn's public guest posting fragment** for the same job ID, requested when the preview opens and the rendered page left a field blank.

Because LinkedIn hydrates the detail pane after the content script mounts, the preview re-reads the pane for a short window and fills blanks as they appear. A value already present — including anything you typed — is never overwritten.

Duplicate LinkedIn job IDs and canonical URLs return the existing application. The job ID and posting URL must identify the same LinkedIn job. **Refresh job details** stores the latest extension extraction as a separate, read-only snapshot shown on the application detail page. It never overwrites or clears user-managed application fields, and resume match analysis continues to use the application-owned job description.

## Permissions and privacy

- `storage`: stores the tracker URL, access token, and bounded local diagnostics in `chrome.storage.local`; the token is never placed in Chrome sync storage.
- `activeTab`: lets the toolbar popup open the capture UI on the current LinkedIn tab.
- The declared LinkedIn jobs content script is limited to `linkedin.com/jobs/*`; API host access is limited to `way2more.vercel.app` and localhost development.

The content script reads only loaded LinkedIn job-detail DOM and structured data. It does not read LinkedIn credentials, messages, contacts, profiles, or unrelated browsing. It never clicks Apply or follows an external application redirect. Captured descriptions are normalized to plain text.

When you open the preview and the rendered page left a field blank, the content script makes one same-origin request to LinkedIn's public guest posting fragment for the job ID you are already viewing. It is sent without credentials, no other job is requested, and a failure leaves the rendered capture untouched.

There is no analytics or remote crash telemetry. Local diagnostics contain only timestamps, sanitized error codes, page type, and extraction-strategy names. They are capped at 100 entries and seven days and never include tokens or job descriptions.

## Troubleshooting

- **Connect Tracker shown:** create or paste a valid token, then test the connection in extension options.
- **Invalid or revoked token:** create a new token in Tracker Settings and replace the local token.
- **Button missing:** use the toolbar popup. If that also fails, reload LinkedIn after installing or updating the extension.
- **Company or role missing:** reopen the preview once the job pane has finished rendering, then correct any highlighted field. Optional fields may stay blank.
- **Network failure:** the populated preview remains open. Retry or use **Copy details**; v1 does not retain an offline queue.
- **LinkedIn layout regression:** copy local diagnostics from extension options. The recorded strategies name the source of each capture (`json-ld`, `dom-top-card`, `dom-description`, `guest-api`); a capture that reaches `guest-api` every time means the rendered-pane selectors need updating. Extraction fixture tests cover signed-out, signed-in split-panel, and guest-fragment layouts, but LinkedIn selectors can change.

## Disconnect and uninstall

**Disconnect** in extension options clears the tracker URL, token, and diagnostics from the current Chrome profile. Then revoke the named token in Way2More Settings. Before uninstalling the extension, revoke its token as well; Chrome cannot reliably revoke a server token during uninstall.

## Architecture

```text
LinkedIn content script (Shadow DOM preview)
  -> Manifest V3 background worker
  -> POST /api/extension at configured Way2More URL
  -> SHA-256 token lookup and scoped Convex mutation
  -> applications + stage/activity/resume-link records
```

The API supports only connection testing, single-job lookup/create, allowlisted snapshot refresh, and a server-enforced 10-second same-token undo/archive. It cannot list the pipeline or read notes, contacts, or resumes. Create requests are duplicate-safe, and all operations are limited to 30 per token per minute.

## Manual end-to-end checklist

1. Build and load the unpacked extension in current desktop Chrome.
2. Create a production token, connect to `https://way2more.vercel.app`, and verify the connection succeeds.
3. Open a direct LinkedIn `/jobs/view/...` page and confirm the inline button appears.
4. Review extracted title, company, URL/job ID, location, explicit arrangement, compensation, and description; correct any missing essentials. Open **More details** and confirm the description and compensation are populated.
5. Create a Saved application and use **Open application**.
6. Reload Way2More and verify source, captured fields, default resume, stage history, and activity.
7. Capture the same job again and verify the existing record is returned.
8. Refresh job details and verify user-managed fields are unchanged.
9. Create another capture as Already applied and verify today’s application date.
10. Use Undo within 10 seconds and verify the record is archived, not deleted.
11. Repeat capture from LinkedIn search results while selecting different jobs without a full page reload.
12. Revoke the token in Tracker Settings and confirm subsequent requests are rejected.

## Future Chrome Web Store release

Before public distribution, add formal privacy-policy hosting, store screenshots/listing copy, automated selector monitoring across supported LinkedIn locales, public multi-user onboarding, support documentation, and Chrome Web Store signing/submission. The personal v1 intentionally makes no claims for non-English LinkedIn interfaces or browsers other than current desktop Chrome.
