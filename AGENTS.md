# Somaterm Architectural Rules (AGENTS.md)

This document contains the persistent system instructions and architectural rules for all AI agents, code assistants, and local orchestrators interacting with the Somaterm project.

## The Tauri Boundary (Separation of Concerns)
* React/TypeScript is exclusively for UI rendering, grid state management, and event listening.
* Rust handles ALL OS-level operations, PTY processes, global shortcuts, native system menus, and file system access.

## The IPC Bridge (Zero Crashes)
* All IPC communication (`invoke`/`listen`) must use strictly typed contracts in TypeScript.
* Rust must return clean `Result::Err` for failures. React must gracefully catch these errors and log them to the debug console without crashing the application.

## Test-Driven Execution
* No new UI feature or critical flow is complete without Playwright E2E test coverage.
* E2E tests must be capable of running in a mocked browser environment (simulating IPC) to test responsive UI and modals without the Rust binary.

## UI/UX Minimalism
* Strictly use Tailwind CSS for styling. Avoid bloated third-party UI libraries if it can be solved with clean logic.
* HUD elements (labels, menus, floating buttons) must be non-obstructive, utilizing transparency (`opacity`), glassmorphism (`backdrop-blur`), and hover states to keep the console output visible.

## The Agent Sandbox
* External scripts or agents connecting to Somaterm must use predefined IPC channels.
* Raw shell access/execution must require explicit user confirmation. The terminal is a secure execution environment.

---

**Reminder for AI Assistants:** Before implementing new features, always verify if a Playwright test needs to be created or updated.

# [DEFINITION OF DONE & AUTONOMOUS QA DIRECTIVE]

You are strictly bound by a Test-Driven / Post-Implementation Testing workflow. Before you consider any feature complete, and explicitly BEFORE you stage (`git add`), commit (`git commit`), or push (`git push`) any changes to the `master` or `main` branch, you MUST autonomously execute the following pipeline:

1. **Self-Analysis & Test Generation:** 
   - Analyze the code modifications you just made.
   - Automatically write or update the corresponding E2E Playwright tests in the `tests/` directory to cover the new logic, UI components, or edge cases.
2. **Test Execution:** 
   - Run the test suite locally using `npx playwright test`.
3. **Autonomous Self-Correction:** 
   - If ANY test fails, you are explicitly FORBIDDEN from committing the code. 
   - You must read the error logs, debug your implementation (or the test itself), and re-run the suite until you achieve a 100% pass rate.
4. **Integration:** 
   - Only when the entire test suite is green are you authorized to commit both the feature code and the generated test files, and push them to the repository.

# [ANTI-TAMPERING & INTEGRITY PROTOCOL]
You are strictly prohibited from engaging in "Reward Hacking" or "Specification Gaming" to force a failing test to pass.
1. **Immutable Assertions:** Once a test is written to verify a specific behavior, you CANNOT modify, remove, or comment out its core assertions (`expect` statements) just because the test is failing.
2. **Fix the Code, Not the Test:** If a test fails, your focus must be entirely on debugging and fixing the implementation code (the application logic).
3. **Valid Test Modifications:** You may only modify a failing test IF AND ONLY IF you determine the test itself was fundamentally written wrong (e.g., querying the wrong DOM selector). In such cases, you must add a comment above the modified test explaining exactly why the test logic was flawed.
4. **Flaky Tests & Synchronization:** If a test fails due to a race condition or asynchronous rendering (flakiness), you must solve the underlying synchronization issue using proper Web-First auto-retrying assertions (e.g., `expect(locator).toBeVisible()`). Do not rely on arbitrary `waitForTimeout` delays unless mocking complex external events.

# [VERSION CONTROL & PUSH DIRECTIVE]
You are strictly forbidden from executing `git push` automatically after completing a task or fixing a test. 

1. **Local Commits Only:** Once you finish an implementation, run the tests, and verify that the Playwright test suite passes at 100%, you are authorized to stage (`git add`) and commit (`git commit`) your changes locally. 
2. **Explicit Push Consent:** You MUST NOT push code to any remote branch (e.g., `master`, `main`) under any circumstances, unless the user explicitly commands you to do so with phrases like "push to master" or "push the changes".
3. **End of Task State:** Upon completing a task and committing locally, simply report your status, summarize the test results, and wait for the user's explicit next instruction.
