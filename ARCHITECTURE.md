# Static — Technical Architecture & Engineering Documentation

This document provides in-depth technical documentation of the core systems powering **Static**, including the deterministic timezone calculation engine, Supabase real-time multi-client synchronization, data flow, and design system tokens.

---

## 1. Core Domain: The 336-Slot UTC Timezone Engine

### 1.1 The Discrete Slot Model
A standard week consists of:
$$\text{7 days} \times \text{24 hours/day} = \text{168 hours} = \text{336 discrete 30-minute intervals}$$

Each 30-minute block is uniquely identified by an integer index $i \in [0, 335]$:
- $i = 0$: Sunday 00:00 – 00:30 UTC
- $i = 1$: Sunday 00:30 – 01:00 UTC
- ...
- $i = 48$: Monday 00:00 – 00:30 UTC
- ...
- $i = 335$: Saturday 23:30 – 24:00 UTC

### 1.2 Local to UTC Projection (Circular Week Arithmetic)
When a user paints or selects an interval in their local timezone $T$ on Day $D_{\text{local}}$ at hour $H_{\text{local}}$ and minute $M_{\text{local}}$:
1. The local slot index is calculated:
   $$\text{localSlot} = (D_{\text{local}} \times 48) + (H_{\text{local}} \times 2) + \lfloor M_{\text{local}} / 30 \rfloor$$
2. The UTC offset in 30-minute slots is computed using standard IANA timezone databases via `Intl.DateTimeFormat`:
   $$\Delta_{\text{slots}} = \frac{\text{offsetMinutes}}{30}$$
3. The corresponding UTC slot $S_{\text{UTC}}$ is projected using circular modulo arithmetic:
   $$S_{\text{UTC}} = (\text{localSlot} - \Delta_{\text{slots}} + 336) \pmod{336}$$

This mathematical property guarantees that boundary crossings (such as Sunday 01:00 AM JST converting to Saturday 16:00 PM UTC) wrap around the week seamlessly without data loss or negative indices.

### 1.3 Overlap Aggregation & Golden Windows
To find overlapping meeting times across $N$ members:
1. For each slot $s \in [0, 335]$, the attendance count is calculated:
   $$\text{count}(s) = \sum_{m=1}^N \mathbf{1}_{s \in \text{slots}_{\text{UTC}}(m)}$$
2. Contiguous runs of slots where $\frac{\text{count}(s)}{N} \ge \text{threshold}$ are merged into `OverlappingWindow` records.
3. Windows meeting the duration criterion ($\text{duration} \ge \text{minDuration}$) are sorted by:
   - Overlap ratio (descending)
   - Duration (descending)
   - Day of week & time (chronological)

---

## 2. Real-Time Cloud Architecture (Supabase)

Static uses a hybrid local-first cloud architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                      Client State                           │
│        (React useState / useMemo / useCallback)             │
└──────────────┬───────────────────────────────▲──────────────┘
               │ Write (Debounced CRUD)        │ Realtime Payload
               ▼                               │ (postgres_changes)
┌──────────────────────────────────────────────┴──────────────┐
│                      Supabase Service                       │
│                   (src/lib/supabase.ts)                     │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    PostgreSQL Tables                        │
│   • groups (id, name, admin_pin, created_at, updated_at)    │
│   • group_members (id, group_id, name, timezone, slots_utc) │
└─────────────────────────────────────────────────────────────┘
```

### 2.1 Database Schema
```sql
CREATE TABLE groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  admin_pin TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE group_members (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  timezone TEXT NOT NULL,
  slots_utc JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.2 Optimistic Updates & Debouncing
- When a user paints their availability on the weekly grid, local state updates at **60fps** with zero UI latency.
- Database writes to `group_members.slots_utc` are debounced to prevent network thrashing.
- Real-time WebSocket channel subscriptions (`supabase.channel('group-sync')`) listen for `postgres_changes` to merge modifications from other members in real time.

---

## 3. Discord Dynamic Timestamp Integration

Static generates dynamic Discord timestamps using standard Unix timestamp format tags:
- `<t:UNIX:t>`: Short time (e.g. `2:00 PM`)
- `<t:UNIX:F>`: Full date and time (e.g. `Saturday, August 29, 2026 2:00 PM`)
- `<t:UNIX:R>`: Relative time (e.g. `in 2 days`)

Because the Discord client parses `<t:UNIX:t>` natively against the local device timezone of each viewing user, posting a single Static timestamp link in a global Discord server ensures every member across America, Europe, Asia, and Oceania reads their exact local start time without manual time conversion.

---

## 4. Design System & Typographic Scale

Static adheres to a strict 5-tier typographic hierarchy designed with **Space Grotesk** for geometric readability and **JetBrains Mono** for tabular numbers and timestamps:

| Tier | Token | Size | Role |
| :--- | :--- | :--- | :--- |
| **Tier 1** | Hero / Page Title | `text-2xl sm:text-3xl font-extrabold` | Group Title & Landing Hero |
| **Tier 2** | Card & Dialog Titles | `text-lg font-bold` | All Card Headers & Modal Titles |
| **Tier 3** | Subtitles & Form Inputs | `text-sm font-medium` | Card Subtitles, Input fields, Dropdowns |
| **Tier 4** | Controls & Action Labels | `text-xs font-semibold` | Buttons, Tabs, Filter Toggles |
| **Tier 5** | Data Tags & Timezone Pills | `text-[10px] font-mono font-bold` | Status Badges, Avatar Glyphs, Timezone Chips |

---

## 5. Accessibility (WCAG 2.1 Level AA)

1. **Contrast Compliance**: 
   - Primary copy meets $\ge 4.5:1$ contrast against `bg-background` and `bg-card`.
   - Secondary badges and inactive controls maintain $\ge 3.0:1$ graphical contrast.
2. **Keyboard Focusability**:
   - All interactive controls have distinct `focus-visible:ring-2 focus-visible:ring-primary` focus indicators.
3. **Screen Readers**:
   - Timezone pickers, weekly grid slots, and threshold tabs feature semantic ARIA roles (`aria-label`, `aria-live="polite"`).
