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
