# Validation record — 2026-09-10

Version: 5.0.0-rc1. Baseline: GitHub commit `6eb17bd1cde4cef9ead160c3197e6d6905fc6f80` plus the supplied `code.gs.txt` review. Replaced v4 clinical prompts and demo path with a structured, authenticated v5 candidate.

## Verified locally

- 41 deterministic/core and mocked Apps Script tests passed at first complete test run.
- JavaScript parsing checked with Node; shared core will be checked byte-for-byte against Apps Script copy.
- Formula cases: CG SCr 1→2 yields 77.7778→38.8889 mL/min; mg/dL/µmol/L equivalent; eGFR coefficients; applicability blocks; BSA-indexed vs absolute GFR; mg/kg/day vs dose; max-dose validation.
- Backend cases: auth failure cannot reach AI; public helper closure; no secrets in health; idempotency including cache eviction; malformed/truncated/blocked outputs; unknown/expired reference IDs; per-user rate limits; consent, release flag, audit configuration.
- Tests use fictitious credentials and nonclinical fixtures only. No real API key or patient data was used.

## Browser verification

`tests/browser.cjs` tests actual Chromium with the remote service mocked: initial load, renal updates, XSS text rendering, stale-response rejection, case replacement/restore, dosing, OCR review, approval invalidation, encrypted backup round trip, responsive overflow, and logout.

Local browser execution was blocked: Chromium was not installed and its download timed out. Browser results are **not claimed as passed** until the GitHub Actions run completes. See the PR checks for current status.

## Still required before clinical release

- Deploy both new Apps Script files and manifest; configure per-user access, audit sheet, and institution-approved references.
- Live browser POST to the deployed `/exec`: authentication, redirects/CORS, actual Gemini schema behavior, quota/error handling, and central audit under concurrent users.
- Clinical UAT with independently reviewed cases and the actual model/reference bundle (see CLINICAL_UAT.md). No sensitivity/specificity, clinical accuracy percentage, or claim of zero errors has been established.
- Privacy/security approval for real health data and the institution's Gemini service configuration.
- Actual label printer/PDF Thai font and paper-size checks.

`CLINICAL_RELEASE_APPROVED` remains false by default. Code tests alone must not be used to enable it.
