# The Commissary — AI handoff

## Project and source map

React/TypeScript inventory and warehouse UI in `src/`; Express/Vite backend in `server.ts`. The current README describes a web simulator and Android source previews in `src/data/androidProjectFiles.ts` and `src/components/AndroidFilesViewer.tsx`. Treat these previews as source specifications; do not claim a packaged Android app without a verified native project and build.

## Setup and verification

Use Node.js 22 and npm as a development baseline. The original README lists Node 18+, while the package does not pin an engine; verify dependency requirements when setting up a new environment.

```sh
npm ci
npm run lint
npm run build
npm run dev
```

Open the local server URL printed by the app (the README documents port 3000). `lint` runs TypeScript checking; there is no `test` script in the inspected package manifest. After building, `npm start` starts `dist/server.cjs`.

Copy `.env.example` to an ignored local `.env` and configure Gemini only when live OCR is needed. Keep credentials out of commits. Use test inventory and invoices for manual UI checks.

## Known boundaries and next step

Voice input depends on browser permissions and device support; OCR requires credentials for live use. Verify persistence, roles, and audit behavior against actual code before describing the simulator as production-ready. Use Git/GitHub tooling to synchronize source; do not paste a GitHub token into the app merely to switch coding assistants.

Start with type checking/build and the affected inventory or voice workflow, and record any pre-existing errors.

## Opening this project with another assistant

1. Clone this repository, or open its existing clean checkout. Confirm the origin and branch before making changes.
2. Antigravity: open the repository folder as the project. It can discover root `AGENTS.md` and `GEMINI.md`; explicitly ask it to read `AI_HANDOFF.md`.
3. ChatGPT/Codex: use a coding environment with this repository connected or checked out. For a chat-only session, provide the relevant source files plus this guide; do not assume the chat can edit or push GitHub.
4. Gemini CLI: start in the repository root and read `GEMINI.md`. For Gemini chat, provide the relevant source and this guide using the file/repository access available to that product.
5. Authenticate each service separately for private repositories. App runtime API keys are separate from an assistant subscription or GitHub login.

Suggested first prompt:

> Read AGENTS.md, AI_HANDOFF.md, and README.md. Inspect the current branch and working tree. Summarize the architecture and known blockers, verify the documented development commands for the requested task, then implement the requested change. Preserve existing work and update the handoff with actual verification results. Commit and push the intended source changes when access is available.

## Handoff maintenance

After a work session, record the date, branch, completed changes, checks and results, unresolved issues, next concrete step, and whether the last push succeeded. Retrieve exact commit IDs with Git rather than maintaining a self-referencing commit hash inside this file. Do not include credentials or private user data.

## Verification of this guide

Prepared September 26, 2026 from repository documentation and manifests. This is a documentation and assistant-context update. Application builds, live API integrations, and execution inside each assistant were not tested as part of this update. Before feature work, run the relevant checks below and record the result.

## Tool documentation

- [Antigravity project rules](https://www.antigravity.google/docs/rules/)
- [Gemini CLI project context](https://geminicli.com/docs/cli/gemini-md/)
- [Codex AGENTS.md instructions](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
