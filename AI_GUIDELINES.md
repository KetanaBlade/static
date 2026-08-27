# AI Guidelines & Engineering Standards

Welcome to the **SyncSquad** project repository. This document defines the architectural, accessibility, coding, and git hygiene standards that must be strictly followed across the entire codebase.

---

## 1. Project Philosophy & Core Objectives
* **Frictionless Collaboration**: Zero-login, instant room creation, and intuitive group link sharing.
* **Deterministic Timezone Precision**: All availability is stored in continuous UTC 30-minute blocks (336 slots for a 168-hour week). Circular week-wrapping seamlessly handles multi-day boundaries across global timezones (e.g. US Pacific vs Ireland/Tokyo).
* **Two-Way Synchronized Inputs**: Presets, custom range dropdowns, and visual grid painting all mutate the exact same underlying reactive availability state.

---

## 2. Accessibility (WCAG 2.1 AA Compliance)
Every user interface element must meet or exceed WCAG 2.1 Level AA criteria:
* **Color Contrast**: 
  * Normal text: Minimum **4.5:1** contrast ratio against its background.
  * Large text / Graphical components / Heatmap cells: Minimum **3.0:1** contrast ratio.
* **Touch Targets**: Minimum **44px × 44px** hit area for all interactive elements on mobile devices.
* **Keyboard Navigation**: All interactive components (dialogs, tooltips, dropdowns, preset buttons) must be fully navigable via `Tab`, `Space`, `Enter`, and Arrow keys with prominent focus rings (`focus-visible:ring-2`).
* **Screen Reader & ARIA Support**:
  * Heatmap cells must include descriptive ARIA labels (e.g. `aria-label="Saturday 2:00 PM, 4 of 4 members available"`).
  * Dynamic status updates must use `aria-live="polite"` regions.

---

## 3. Mobile-First & Responsive UX
* **Mobile-First Layout**: Design from 320px viewport upwards before scaling to tablet and desktop.
* **Tabular Numbers**: Always use `font-variant-numeric: tabular-nums` (or monospaced font classes) for times, hours, and timezone offsets to prevent UI layout shift.
* **Sticky Navigation & Headers**: Keep time columns and day headers pinned when scrolling on mobile devices.

---

## 4. Code Quality & Architectural Principles
* **DRY (Don't Repeat Yourself)**: Shared utilities (timezone math, string formatting, date-time manipulation) must be isolated into dedicated pure helper functions with zero side-effects.
* **Zero Hardcoding**: Days of the week, preset hour ranges, default settings, and supported IANA timezones must be defined in central configuration modules (`src/lib/constants.ts`).
* **Strict TypeScript**: No `any` types. All domain models (`Group`, `GroupMember`, `TimeWindow`, `SlotIndex`) must be strictly typed.
* **Component Modularity**: Keep components small, focused, and single-responsibility. Separate business/timezone calculation logic from presentational components.

---

## 5. Git & Commit Hygiene
* **Atomic Commits**: Each commit must represent a single, self-contained, logical unit of work.
* **Conventional Commits**: Use standardized prefixes:
  * `feat:` A new user-facing feature or capability.
  * `fix:` A bug fix.
  * `test:` Adding or updating automated test suites.
  * `refactor:` Code refactoring without changing functionality.
  * `docs:` Documentation or guideline updates.
  * `style:` Formatting, styling, and design system tweaks.
