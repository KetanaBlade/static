# Static ⏳

> **Find the perfect weekly hangout window across any timezone — zero logins, zero servers, zero friction.**

Static is a fast, multi-timezone group availability coordinator designed for friends, gaming squads, and remote teams distributed across different cities and timezones.

---

## ✨ Features

- **⚡ Zero Accounts & Zero Logins**: Everything is stored and encoded in the URL hash via compressed state (`lz-string`). No sign-ups, passwords, or database setup needed.
- **🌐 Deterministic Timezone Engine**: Converts recurring weekly availability across 336 discrete 30-minute UTC slots, wrapping seamlessly around circular week boundaries (e.g. PST Saturday night = Dublin Sunday morning).
- **🎨 Interactive Week Grid Painter**: Paint your free hours with desktop click-and-drag or mobile touch gestures.
- **⚡ 1-Tap Presets & Range Selector**: Instantly add `Weekend Afternoons`, `Weekend Evenings`, or custom dropdown ranges.
- **💬 1-Click Discord Export with Dynamic Unix Timestamps**: Copies `<t:UNIX:t>` timestamps so the meeting window automatically formats in every recipient's local clock when pasted in Discord.
- **📊 Master Group Overlap Heatmap**: Visual 24-hour heatmap showing what percentage of friends are free at any hour of the week.
- **🔐 4-Digit Admin PIN Moderation**: The group organizer can remove members or moderate entries from any device using an optional 4-digit PIN.
- **🌓 Light & Dark Modes**: Modern, accessible UI with WCAG 2.1 AA compliant color contrast and 44px+ touch ergonomics.

---

## 🚀 Quick Start (Local Development)

```bash
# Clone the repository
git clone https://github.com/ketanablade/static.git
cd static

# Install dependencies
npm install

# Run the development server
npm run dev

# Run unit tests
npm test

# Build for production
npm run build
```

---

## 🛠️ Tech Stack

- **Framework**: React 18 + Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui design primitives
- **Icons**: Lucide React
- **Typography**: Inter + JetBrains Mono
- **State Compression**: LZ-String
- **Testing**: Vitest

---

## 📄 License

MIT © 2026
