# Static ⏳

> **Find the perfect weekly hangout window across any timezone — zero friction, instant cloud sync, and deterministic timezone accuracy.**

**Static** is a modern, high-performance group availability coordinator designed for distributed teams, gaming squads, and global friend circles. It maps continuous weekly schedules to discrete 30-minute UTC time slots, eliminating scheduling confusion across day and date lines.

---

## ✨ Key Features

- 🌐 **Deterministic 336-Slot UTC Timezone Engine**
  - Continuous weekly time is divided into 336 discrete 30-minute slots.
  - Seamlessly handles circular week-wrapping across multi-day timezone boundaries (e.g., Saturday night in Los Angeles is Sunday morning in Dublin/Tokyo).
  - Accurate DST conversions and dynamic timezone viewer filtering.

- ⚡ **Multi-Modal Availability Input**
  - **Interactive 7-Day Grid Painter**: Touch and drag paint across a 24-hour visual weekly schedule.
  - **1-Tap Instant Presets**: Quickly add presets like *Weekend Afternoons*, *Weekend Evenings*, or *Weekday Lunch*.
  - **Custom Range Builder**: Dropdown-based range selector for precise start and end times.
  - All input modes are bidirectional and update the same reactive schedule state.

- 🔄 **Real-Time Multiplayer Cloud Sync (Supabase)**
  - Groups and member schedules synchronize instantly across devices via real-time WebSocket subscriptions.
  - Offline/URL fallback: State can be compressed into URL query strings (`lz-string`) when offline.
  - Local device cache (`localStorage`) retains recently visited groups and personal profile settings.

- 💬 **Discord-Ready Export with Dynamic Unix Timestamps**
  - 1-click formatted Discord export using dynamic `<t:UNIX:t>` timestamps.
  - When posted in Discord, every server member automatically sees the meeting time formatted in their own device's local clock.

- 📊 **Intelligent Match Finder & Heatmap**
  - **Top Matching Windows**: Automatically surfaces the largest contiguous blocks where 100%, 75%+, or 50%+ of group members are free.
  - **Member Local Clocks**: Clear breakdown of what each match time translates to for every individual in their local time.
  - **Visual Group Heatmap**: 24/7 overlap visualization with real-time attendee percentage highlights.
  - **Roster Filter**: Temporarily toggle specific members in or out of the calculation without deleting their data.

- 🔐 **Organizer PIN Moderation**
  - Creators can set a 4-digit PIN to moderate member rosters and manage group settings from any device.

- 🎨 **Modern Design System & Motion Physics**
  - Strict 5-tier typographic scale using **Space Grotesk** and **JetBrains Mono**.
  - Physics-based animations and layout transitions powered by **Framer Motion**.
  - Accessible, WCAG 2.1 AA compliant color contrast in both **Light** and **Dark** modes.

---

## 🏗️ Architecture & Technical Design

For an in-depth breakdown of timezone algorithms, Supabase schemas, and UI design tokens, see [ARCHITECTURE.md](./ARCHITECTURE.md).

```
┌─────────────────────────────────────────────────────────────┐
│                       Static Frontend                       │
│     (React 18 + Vite + TypeScript + Tailwind + Framer)      │
└──────────────┬───────────────────────────────┬──────────────┘
               │                               │
      Realtime Subscriptions           Deterministic Math
               │                               │
┌──────────────▼──────────────┐ ┌──────────────▼──────────────┐
│       Supabase Cloud        │ │    336-Slot UTC Engine      │
│  (PostgreSQL + Realtime)    │ │   (Circular Week Offsets)   │
└─────────────────────────────┘ └─────────────────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm / yarn / pnpm

### Installation

```bash
# Clone the repository
git clone git@github.com:KetanaBlade/static.git
cd static

# Install dependencies
npm install

# Start development server
npm run dev
```

### Running Tests

```bash
# Run unit & integration test suites
npm test
```

### Production Build

```bash
# Compile TypeScript and bundle with Vite
npm run build

# Preview production build locally
npm run preview
```

---

## 🛠️ Tech Stack

- **Core Framework**: React 18, Vite, TypeScript
- **State & Backend**: Supabase (PostgreSQL + Realtime WebSockets), LZ-String compression
- **Animation & Motion**: Framer Motion
- **UI & Primitives**: Tailwind CSS, Radix UI Primitives, Lucide Icons
- **Typography**: Space Grotesk (Primary), JetBrains Mono (Code & Tabular Data)
- **Testing**: Vitest

---

## 📄 License

MIT © 2026 Static
