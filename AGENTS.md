# Project instructions

## Work across coding assistants

This project must remain editable with Antigravity, ChatGPT/Codex, Gemini, and ordinary development tools. The repository files are the shared project memory.

- Start by reading `README.md`, `AI_HANDOFF.md`, and applicable nested instructions. Use the existing source and architecture.
- Inspect `git status`, branch, origin, and recent commits before editing. Fetch origin when authenticated; pull with `--ff-only` only when the working tree is clean. Preserve uncommitted and divergent work.
- Keep editable source, dependency manifests/lockfiles, setup instructions, and useful verification commands in the repository. Document platform-specific prerequisites and external services.
- Keep real credentials, private app/user data, local databases, generated builds, and caches out of commits. Preserve existing exclusions. Configuration examples must contain placeholders.
- Run checks appropriate to the change. Report actual results, skipped checks, and environment limitations; never claim an app runs on a platform that was not tested.
- Update `AI_HANDOFF.md` after substantial work with the date, completed changes, checks/results, known blockers, and next steps. Keep decisions in files rather than only in chat.
- Save changes locally, inspect the intended diff, commit, and push to the established GitHub repository. Verify the local branch and the corresponding remote branch have the same commit ID. If access, network, or conflicts block synchronization, clearly report it.
- Never force-push, discard someone else's edits, or automatically overwrite divergent work. Use separate branches/checkouts for simultaneous assistants.
- On another computer, pull before work and push afterward. Scheduled checks cannot synchronize a sleeping or offline machine.
- These files do not grant repository access, deploy the application, or transfer chat history. Honor the user's task scope and each tool's access permissions.
