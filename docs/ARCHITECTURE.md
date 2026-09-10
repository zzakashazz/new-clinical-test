# Architecture and boundaries

## Flow

Static GitHub Pages → POST text/plain JSON → Apps Script authenticated dispatcher → optional Gemini call → validated structured response → draft rendered as DOM text. Google Sheets stores audit metadata and institution-approved reference excerpts. Approved orders print deterministically without another model call.

## Safety invariants

1. One patient object per case. New-case and restore replace every field and invalidate approvals.
2. Patient or reference edits invalidate results and chat context. Requests capture an epoch; stale responses are discarded.
3. Each model request has a unique ID and server fingerprint. Repeating the same ID cannot repeat a completed model call during its 24h retention window, even after cache eviction. Response cache TTL is 10 minutes and is best effort.
4. Unknown allergy status is distinct from no allergy. No AI label generation exists.
5. Renal calculations carry formula, units, SCr date, and applicability. CG weight is explicitly chosen by the clinician. Adult equations reject pregnancy, under-18s, AKI, dialysis, and unknown stability.
6. Only `STOP` responses with valid schema are displayed; all text parts are joined and model thoughts excluded.
7. Claims with unknown reference IDs are rejected; missing references remain explicitly incomplete. This validates provenance identifiers, not semantic correctness.
8. All patient/model/file text uses `textContent`/form values. No Markdown HTML, innerHTML, document.write, CDN script, or direct SVG injection.
9. Auth keys are 256-bit random per user. Server stores SHA-256 only. No API keys are returned to the client; helpers end with `_`.
10. Audit failure prevents successful completion/approval. Audit stores hashes and metadata, not raw clinical narratives. Approval hashes also bind reference versions and excerpt digests.

## Privacy and persistence

Patient cases and credentials live in browser memory only; configuration URL and user ID are the only localStorage values. Explicit backups use AES-256-GCM, a random 96-bit IV and 128-bit salt, and PBKDF2-HMAC-SHA256 (310,000 iterations). A backup contains one whole case, not auth secrets or a reusable approval.

AI receives pseudonymized clinical context. Regex redaction is incomplete: it does not reliably remove names, addresses, or identifiers in images. Users must review data before transmission; free text and images remain sensitive. Browser speech recognition may use the browser vendor's service.

Apps Script response cache temporarily contains generated response text for up to 10 minutes (best effort). Gemini data handling depends on the institution's service agreement and account configuration; this change does not establish regulatory compliance. Audit and reference Sheets are accessible to their editors and are **not tamper-proof**.

## Scope limitations

- This is a controlled-pilot architecture, not a replacement for HIS/EMR, enterprise SSO/MFA, prescribing, dispensing inventory, medication administration, or a complete licensed drug database.
- No central longitudinal patient database; no cross-device case sync. Patient persistence is an explicit encrypted export. Existing unencrypted v4 history is not silently imported.
- No drug-specific regimen is preapproved. No automatic pediatric/neonatal/obesity dosing policy or IV compatibility database.
- Reference excerpts must be supplied, licensed, and clinically reviewed by the institution; no automatic online retrieval or paywalled access is claimed.
- No semantic guarantee of citations, no calibrated model confidence score, no clinical accuracy percentage.
- Rate limit: 6 non-health requests/min and 80/day/user. Apps Script/Sheets/Properties have platform quotas; repeated polling health and invalid auth are not a network DDoS defense. A gateway/WAF and enterprise identity are needed for an untrusted large public rollout.
- Health reports configuration and version; it does not perform a paid model call or prove model health. Live POST, CORS, model behavior, and account policy require deployment testing.
- No automatic AI retries on uncertain upstream execution; the user can request a cached result or intentionally start a new request. Stopping the browser wait cannot cancel UrlFetchApp work already running.
- Draft reports are always marked draft. Approval represents the authenticated clinician's attestation of final orders, not a certification that AI is correct. Share/print targets and patient identity must be checked in the institution's dispensing workflow.

## Formula and API sources reviewed 2026-09-10

- NIDDK adult equations: https://www.niddk.nih.gov/research-funding/research-programs/kidney-clinical-research-epidemiology/laboratory/glomerular-filtration-rate-equations/adults
- NIDDK drug dosing and indexed GFR: https://www.niddk.nih.gov/research-funding/research-programs/kidney-clinical-research-epidemiology/laboratory/ckd-drug-dosing-providers
- NKF Cockcroft-Gault limitations: https://www.kidney.org/professionals/kdoqi/cockcroft-gault-equation-estimating-creatinine-clearance
- NKF CKD stages/chronicity: https://www.kidney.org/kidney-topics/stages-chronic-kidney-disease-ckd
- Gemini structured generateContent: https://ai.google.dev/gemini-api/docs/generate-content/structured-output
- Apps Script private functions: https://developers.google.com/apps-script/guides/html/communication

No clinical claims from the old demo or hard-coded drug prompts were carried over as validated prescribing rules.
