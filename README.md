# Clinical Pharmacist v5 — release candidate

Thai pharmacist workspace for the existing **GitHub Pages → Google Apps Script → Gemini** architecture. This is a reviewable replacement for the original single-file app, not a certified clinical system. Release status: **requires real deployment testing and local clinical UAT before use with patients**.

## What changed

- One patient snapshot across medication review, clinical chat, DDI, dose review, renal/hepatic review, and patient-guide drafts.
- Deterministic CG / CKD-EPI 2021 / Mosteller arithmetic with explicit units, dates, and applicability checks. No automatic CKD diagnosis.
- A mg/kg/day versus mg/kg/dose calculator that requires explicit concentration and clinician-selected maximum doses. No drug regimen is selected by code.
- Authenticated gateway with per-user random access keys stored only as SHA-256 hashes server-side; user keys remain in browser memory. Public server functions are only `doGet` and `doPost`.
- Central audit, duplicate-request protection, quota limits, structured AI outputs, and rejection of truncated/malformed responses.
- Institution-managed reference excerpts, validity dates, and rejection of invented reference IDs. Attaching a reference does **not** verify claim support or clinical correctness.
- OCR review before replacing data, reviewed final orders, and deterministic label printing. AI drafts cannot directly become labels.
- Patient data in tab memory; explicitly encrypted case backup and full-snapshot restore. Logout clears cases and credentials. No old localStorage histories are imported automatically.
- Static local assets with no CDN scripts or raw model HTML. Responsive UI and Thai labels.

## Run checks

No production JavaScript dependencies or build step. Serve this folder as static files.

```sh
node --test tests/core.test.cjs tests/backend.test.cjs
node --check app.js
node --check core.js
```

Browser tests use Playwright and Chromium if installed in your development environment:

```sh
node tests/browser.cjs
```

`PLAYWRIGHT_MODULE` can point to an installed Playwright module. Tests mock the remote API. They do not test Gemini accuracy or live Apps Script CORS.

## Install and release

- [คู่มือติดตั้งภาษาไทย](docs/INSTALL_TH.md)
- [Clinical acceptance / UAT](docs/CLINICAL_UAT.md)
- [Architecture and limits](docs/ARCHITECTURE.md)
- [Validation results](docs/VALIDATION.md)

Copy both `apps-script/Code.gs` and `apps-script/Core.gs` to Apps Script. `Core.gs` must be byte-identical to `core.js`; tests enforce this. Use the provided manifest. GitHub Pages runs `index.html`, `app.js`, `core.js`, and `styles.css`; **it does not execute `.gs` files**.

The old deployment URL remains a default hint in the settings form, but version mismatch is rejected. Update the backend before using v5, preferably in a separate test Apps Script project. No production deployment is performed by this code change.
