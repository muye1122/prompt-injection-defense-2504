# Operations assistance prompt injection defense

A runnable proof of concept for the operations-assistance module (proposals, copywriting and post-meeting summaries). It demonstrates four defense layers around employee-entered constraints and uploaded meeting minutes. Everything runs locally with fictional data: there is no real model call, no external send, no client name and no monetary calculation.

## Defense layers

1. **Input isolation** - `escapeDelimiters()` converts every `<` and `>` into literal `\u003C` / `\u003E` sequences before user content is placed between `<<<INPUT>>>` and `<<<END>>>`. The system prompt explicitly says content in the block is data only, not instructions. An embedded `<<<END>>>` therefore cannot close the block early.
2. **Injection pre-scan** - `InjectionDetector` (implemented as `scanForInjection()`) matches English and Chinese override phrases, role takeovers, system-prompt reveal requests and base64 fragments over 200 characters. Each hit writes a `warn` / `INJECTION_SUSPECTED` issue into `lint_issues` and one security audit record. Generation is not blocked.
3. **Canary leak probe** - `generateCanary()` creates a random token per render and embeds it in the system prompt. If the token appears anywhere in the draft, the draft carries an `error` / `PROMPT_LEAK` post-check issue.
4. **Output post-checker** - `scanOutput()` intercepts external links, overreaching expressions such as "has been sent" or "已发送", and monetary expressions. `sanitizeDraft()` produces the sanitized review copy. Every draft enters the in-memory review queue and `externalSendAllowed` is always false.

## Files

| File | Purpose |
| --- | --- |
| `package.json` | Node 22 scripts and pinned dependencies |
| `server.js` | Express API plus static hosting of the built demo |
| `mock-server/defense.js` | escaping, delimiter rendering, detector, canary and post-checker |
| `mock-server/index.js` | in-memory store, deterministic gateway stub, evaluation runner |
| `data/attack-samples.json` | 30 fictional attack samples, ten per feature |
| `src/App.jsx`, `src/main.jsx`, `src/styles.css` | React 18 operator demo |
| `index.html`, `vite.config.js` | Vite 6 entry and build/test configuration |
| `playwright.config.js` | msedge channel, no browser download |
| `tests/defense.test.js` | unit tests for the four acceptance criteria and supporting behavior |
| `tests/flow.spec.js` | browser flow tests against the built demo |
| `Dockerfile`, `docker-compose.yml` | container recipe |
| `README.md` | this document |
| `验证记录.md` | executed commands and real output |

## Run and test

```bash
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install
npm run dev          # http://127.0.0.1:5173, API proxied to 3001
npm run build
npm start            # http://127.0.0.1:3001
npm test             # unit tests then msedge browser tests
```

`npm test` builds the demo, starts the Express server on port 4173 through the Playwright web server hook, runs 8 unit tests and 4 browser tests, then shuts the server down. On Windows, run the commands in Git Bash or another shell that supports the environment-variable prefix. To use PowerShell, set the variable with `$env:PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = '1'` before installing.

Container alternative:

```bash
docker compose up --build
```

## Evaluation set and result

`data/attack-samples.json` contains ten samples for each of the three features. Categories are benign, injection, base64, link, overreach, probe and schema. The report runner executes all 30 samples with a fresh canary per sample and computes:

- canary leak count
- schema pass rate
- link injection interception rate

Observed result from `npm test` on this machine: 30 samples, 0 leaks, 29 schema passes (96.67%), 3 of 3 link attacks intercepted (100%), 12 injection suspects, 12 audit records, 30 review-queue entries, 30 expected/actual matches, gate PASS. Thresholds are 0 leaks, schema at least 95% and link interception 100%. Full command output is in `验证记录.md`.

## API

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/health` | liveness |
| GET | `/api/samples` | the 30 fictional samples |
| GET | `/api/features` | supported feature keys |
| POST | `/api/render` | render one draft with all four layers |
| POST | `/api/evaluate` | run the full attack set and store a report |
| GET | `/api/reports` | report index |
| GET | `/api/reports/:id` | one full report |
| GET | `/api/audit` | security audit log |
| GET | `/api/review-queue` | drafts awaiting human review |
| GET | `/api/stats` | current in-memory counters |

## Integration point for the model gateway

The dependency on the model gateway and AI review queue is represented by two stubs in `mock-server/index.js`. `mockGenerate()` stands in for the gateway call and is the single place to replace with a real client; it returns a draft object keyed by feature. `store.enqueueReview()` stands in for the review-queue submission. The defense contract in `mock-server/defense.js` does not change when those stubs are replaced: the real gateway response still goes through `processDraft()`, and the review queue still receives the sanitized draft with a flag. No network endpoint or credential is required for this build.

## Honest limitations

- State is in memory only; a process restart clears reports, audit records and the review queue.
- The model is a deterministic stub, not a language model; canary leakage is proven by a unit test that supplies a leaking draft, not by a live generation.
- The review queue is an interface stub. No human decision service, persistence layer or external delivery exists in this build.
- Monetary calculation and external sending are intentionally out of scope and disabled.
- All names, codes, notes and tokens are fictional or synthetic. No real personal or enterprise information is used.
