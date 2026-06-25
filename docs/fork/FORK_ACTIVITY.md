# Fork activity & decision log

> **This is the standing jumping-off point for any agent or human resuming work on
> this fork.** Read this file FIRST, then prepend a new dated entry for your session.

## Purpose & scope

This is a living, append-only record of everything done to the **`TojotheTerror/gbrain`
fork** — the decisions made and *why*, the blockers/conflicts hit and how they were
resolved, and the commits/branches that resulted.

It is **specific to this fork** and **separate from upstream `CHANGELOG.md`**. The
upstream changelog tracks released gbrain features; this log tracks the *fork's* divergence
from upstream and the operational context a future session needs to avoid re-deriving it
from scratch.

**Convention for future sessions:**

1. **Read this file first** — especially the *Standing fork facts* below.
2. **Prepend a new dated entry** at the top of the *Entries* section (newest on top).
3. Each entry should carry: **date**, a one-line **summary**, the **decisions + rationale**,
   any **blockers + resolution**, and the **resulting commits/branches**.
4. If a *Standing fork fact* changes (mission un-pauses, a patch lands upstream, `/ship`
   becomes available), update the quick-reference block in the same commit.

---

## Standing fork facts (quick reference)

Durable, load-bearing facts. Update in place when they change.

- **Remotes:** `origin = TojotheTerror/gbrain` (this fork) · `upstream = garrytan/gbrain`.
- **`b750d3f` is the load-bearing fork patch** — nomic-embed-text asymmetric prefixes for
  local embedding via LM Studio:
  - `search_document:` / `search_query:` **string prefix** applied in `gateway.ts` (the real
    LM Studio mechanism),
  - `input_type:'document'` set in `dims.ts`,
  - plus an ollama expansion touchpoint.
  - **Local fork only — NOT intended for an upstream PR.** Treat it as deliberate,
    forward-compat divergence; do not "fix" it by reverting.
- **Corpus-import mission is paused at Phase A (canary).** Gated on DP1 privacy clearance +
  the corpus directory. Note: **docling is an external pre-conversion step**, NOT on gbrain's
  import path; `gbrain import` enumerates only its supported types.
- **`/ship` is not installed locally** (memory `[[ship-not-installed-locally]]`). Fork work
  lands via direct `git` + `gh pr create`. Docs-only fork changes do **not** take a VERSION
  bump (the fork log is separate from upstream releases).
- **Runtime executes `node_modules/gbrain/src/cli.ts` via a Bun shim** — the `b750d3f` patch
  is live at runtime (`bin → src/cli.ts`).

---

## Entries

### Entry 1 — 2026-06-25

**Summary:** Resumed the corpus-import mission after a crashed session; ran a read-only Phase 0
audit; landed two fork fixes (warn-on-unsupported-docs + a `dims` test-drift reconciliation);
unified, pushed, and verified fork state. Then created this log + its CLAUDE.md/AGENTS.md
pointers.

**1. Mission & Phase 0 audit (read-only — no fork change).**
Goal: resume importing the corpus into the local PGLite brain using `b750d3f`'s nomic
asymmetric prefixes. The audit confirmed the environment was intact: docling `2.104.0`
installed, the patch live at runtime (`bin → src/cli.ts`), `b750d3f` pushed to origin, the
brain clean (1 test page), LM Studio serving both models, and backups present.
**Discoveries:** (a) docling is NOT on gbrain's import path → it must be an *external*
pre-conversion step; (b) `gbrain import` silently dropped PDF/EPUB/DOCX (an enumeration gap that
produced a false canary "Fail").

**2. Cloud ultraplan / ultrathink.**
Planning was offloaded to a cloud session, which produced the warn-fix.
**Blocker:** the cloud sandbox couldn't push (403 egress); the branch never reached the remote.
**Resolution:** the user pasted the exact, verified diffs inline so they could be applied locally.

**3. Change 1 — warn-unsupported-docs fix** (`import.ts` / `sync.ts` / `import-walker.test.ts`).
*Why:* silent enumeration of unsupported types produced a false canary "Fail." *Decision:* keep
the change at the CLI / observability layer only (warn instead of silently dropping) — no import
behavior change. *Verification:* typecheck clean, 4 new tests, stderr/stdout smoke checks.
**Blocker:** `/ship` not installed locally. **Resolution:** committed to a local branch.
Landed as `223b17e`.

**4. Change 2 — dims test-drift fix** (`test/ai/gateway.test.ts`, `recipe-minimax.test.ts`).
CI surfaced 2 failing `dimsProviderOptions` tests during the merge.
*Root cause:* `b750d3f` changed nomic → `input_type:'document'` but did not update the two
upstream tests that asserted the old shape.
*Blast-radius proof:* a with/without-patch diff (365 pass without the patch, 363 with — exactly
those 2 tests), plus a grep showing every `dimsProviderOptions` assertion lives in `test/ai/`
and no test asserts the embed string prefix.
**Decision: reconcile the tests, NOT revert `dims.ts`.** The patch is intentional and
load-bearing for the corpus-import asymmetry; the `gateway.ts` string prefix is the real LM
Studio mechanism; reverting would undo deliberate forward-compat. Production code was left
untouched; the AI test scope ended at 365 pass / 0 fail. Landed as `6a10c26`.

**5. Unify + push + cleanup.**
Cherry-picked both fixes onto `warn-docs-and-test-drift` (the two changes touch disjoint files →
conflict-free, linear history). Verified: typecheck clean; the only failing tests were the 3
pre-existing Windows symlink-EPERM cases (green on Linux/CI). **Pushed to origin.** Deleted the
two now-redundant local branches.

**6. Divergence check.**
`4372d059` / `v0.42.56.0` turned out to be `upstream/garrytan/pglite-incident-2348`, NOT
`origin/master` → false alarm. Confirmed `local master == origin/master == c7727e6`; merge base
clean.

**7. Net fork state.**
The unified `warn-docs-and-test-drift` branch was **merged into `master` via PR #2** (merge
commit `6cf6729e`); `origin/master == 6cf6729e` and the warn + test-drift fixes are now in the
mainline. The corpus import remains paused at Phase A.

**8. Meta.**
This entry, the log file itself, and the `CLAUDE.md` / `AGENTS.md` pointers to it were created
this session on a `fork-activity-log` branch off `master` — so the doc records its own creation.

**Resulting commits/branches:** `223b17e` (warn fix) → `6a10c26` (test-drift fix), unified on
origin branch `warn-docs-and-test-drift`, **merged to `master` via PR #2 (merge `6cf6729e`)**;
this log on branch `fork-activity-log`.
