# Somaterm - A Minimalist, AI-Powered Terminal Emulator

Somaterm is a next-generation terminal emulator built with Tauri v2 and React. It is designed to combine the power of a traditional command-line interface with a minimalist, aesthetically pleasing UI, seamlessly integrating an AI Agent and powerful native features. 

The philosophy behind Somaterm is to keep you in the flow. By running background multimedia (like YouTube Music) natively within the app alongside your terminal and AI assistant, Somaterm eliminates the need to context-switch between browser windows and your development environment.

## Key Features

- **High-Performance Terminal:** Powered by `xterm.js` and a fully functional Rust PTY backend, offering a robust and snappy command-line experience.
- **AI Agent Integration:** A floating, responsive Agent widget allows you to quickly query an AI assistant without leaving your terminal.
- **Persistent Native Webviews:** Replaces traditional iframes with Tauri v2 native macOS child webviews, bypassing X-Frame-Options restrictions. Enjoy uninterrupted background audio and state persistence even while switching between widgets.
- **Responsive UI & Container Queries:** Built with modern TailwindCSS container queries, the application elegantly squishes into a minimalist "Pseudo-Dock" when resized, leaving only essential icons and controls visible.
- **Beautiful Glassmorphism Aesthetic:** A curated dark theme with liquid glass effects, smooth gradients, micro-animations, and a paw-print mascot.

## Development Setup

To get started with Somaterm development locally, you will need Node.js and Rust installed on your machine.

1. Clone the repository and install the Node dependencies:
   ```bash
   npm install
   ```

2. Run the Tauri development server (this will start both Vite and the Rust backend):
   ```bash
   npm run tauri dev
   ```

## Build Instructions

When you are ready to distribute Somaterm, you can compile an optimized release build. To generate a macOS `.dmg` installer and the compiled `.app` bundle, run:

```bash
npm run tauri build
```

The compiled output will be placed in the `src-tauri/target/release/bundle/` directory.
