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
