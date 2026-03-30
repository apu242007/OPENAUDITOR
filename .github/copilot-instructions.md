# Copilot Workspace Instructions for Auditor Libre

## Purpose
This file provides essential guidance for AI agents and contributors working in the Auditor Libre codebase. It summarizes project conventions, architecture, and best practices to ensure productive, safe, and consistent contributions.

---

## Key Principles
- **Local-first**: Prioritize local data storage and offline operation.
- **Open source**: All code is visible, modifiable, and MIT-licensed.
- **Simplicity**: Avoid unnecessary dependencies and keep flows easy to run and understand.
- **Portability**: Data is stored in JSON, easy to back up and move.
- **Operational value**: Features must solve real-world inspection/audit needs, not just demo scenarios.
- **Link, don’t embed**: Reference detailed docs (README.md, MOTION_GUIDE.md, CONTRIBUTING.md) instead of duplicating content.

---

## Architecture Overview
- **Backend**: Node.js + Express, with key modules in `lib/` (auth, db, scoring, validation, storage, SSRF/Puppeteer, etc.).
- **Frontend**: Vanilla HTML/CSS/JS in `public/`, no heavy frameworks.
- **PDF/Excel Export**: Uses Puppeteer and ExcelJS.
- **Data Storage**: Uses `env-paths` for OS-specific data folders. Main files: `config.json`, `templates.json`, `inspections.json`, `library.json`, `inspection_tokens.json`, plus `uploads/` and `backups/` folders.
- **Security**: Local-first, with optional PIN, session cookies, and strict validation/sanitization (see `security.js`).
- **Testing**: Run with `npm test` (see scripts in package.json).

---

## Conventions & Best Practices
- **Small, testable, reversible changes** (see CONTRIBUTING.md)
- **Avoid breaking data compatibility** unless documented
- **Sensitive areas**: JSON persistence, PDF/Excel export, conditional logic, scoring, local security, LAN use
- **Motion/animation**: Follow MOTION_GUIDE.md (opt-in, accessible, separated from business logic)
- **Validation**: Use provided validators in `security.js` for templates, inspections, webhooks, config, and actions
- **Uploads**: Only allow safe file types/extensions (see `security.js`)
- **Backups**: Ensure atomic writes and backup/restore flows are not broken

---

## Build & Test Commands
- **Install**: `npm install`
- **Start**: `npm start` (production), `npm run dev` (development)
- **Test**: `npm test` (includes base, security, and SSRF tests)

---

## Documentation
- **Project overview**: [README.md](README.md)
- **Contribution guide**: [CONTRIBUTING.md](CONTRIBUTING.md)
- **Motion/animation**: [MOTION_GUIDE.md](MOTION_GUIDE.md)
- **Roadmap**: [ROADMAP.md](ROADMAP.md)

---

## Example Prompts
- "How do I add a new export format?"
- "What are the security best practices for uploads?"
- "How do I add a new animation to the UI?"
- "Where are backups stored and how are they restored?"

---

## Next Steps
- For complex areas (e.g., frontend, backend, tests), consider splitting instructions using `applyTo` fields.
- Propose new agent customizations or hooks as needed (e.g., `/create-instruction`, `/create-skill`).

---

*For more details, always link to the relevant documentation file instead of duplicating content here.*
