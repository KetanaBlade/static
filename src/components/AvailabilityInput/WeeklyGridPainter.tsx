import React, { useState, useRef, useCallback, useEffect } from 'react';
import { DAYS_OF_WEEK, HOURS_PER_DAY, SLOTS_PER_HOUR } from '../../lib/constants';
import { formatSlotTime, localToUtcSlot, utcToLocalSlot } from '../../lib/timezone';
import { SlotIndex } from '../../types';
import { Sparkles, Paintbrush, Hand } from 'lucide-react';

interface WeeklyGridPainterProps {
  timezone: string;
  currentSlots: SlotIndex[];
  onSlotsChange: (slots: SlotIndex[]) => void;
  timeFormat?: '12h' | '24h';
}

export const WeeklyGridPainter: React.FC<WeeklyGridPainterProps> = React.memo(({
  timezone,
  currentSlots,
  onSlotsChange,
  timeFormat = '12h',
}) => {
  const gridContainerRef = useRef<HTMLDivElement>(null);

  const localSlotsRef = useRef<Set<number>>(new Set(currentSlots));
  const isDrawingRef = useRef<boolean>(false);
  const drawModeRef = useRef<'select' | 'erase'>('select');
  const lastTouchKeyRef = useRef<string | null>(null);
  const lastTouchTimestampRef = useRef<number>(0);
  const [localRender, setLocalRender] = useState(0);

  // Interaction Mode on mobile: 'paint' (drag to paint) vs 'scroll' (pan/scroll freely)
  const [touchMode, setTouchMode] = useState<'paint' | 'scroll'>('paint');

  // Edge auto-scrolling refs
  const autoScrollSpeedRef = useRef<number>(0);
  const autoScrollAnimRef = useRef<number | null>(null);

  const startAutoScroll = useCallback((speed: number) => {
    autoScrollSpeedRef.current = speed;
    if (autoScrollAnimRef.current === null) {
      const scrollStep = () => {
        if (gridContainerRef.current && autoScrollSpeedRef.current !== 0) {
          gridContainerRef.current.scrollLeft += autoScrollSpeedRef.current;
          autoScrollAnimRef.current = requestAnimationFrame(scrollStep);
        } else {
          autoScrollAnimRef.current = null;
        }
      };
      autoScrollAnimRef.current = requestAnimationFrame(scrollStep);
    }
  }, []);

  const stopAutoScroll = useCallback(() => {
    autoScrollSpeedRef.current = 0;
    if (autoScrollAnimRef.current !== null) {
      cancelAnimationFrame(autoScrollAnimRef.current);
      autoScrollAnimRef.current = null;
    }
  }, []);

  // Sync ref from parent when NOT drawing
  useEffect(() => {
    if (!isDrawingRef.current) {
      localSlotsRef.current = new Set(currentSlots);
      setLocalRender((r) => r + 1);
    }
  }, [currentSlots]);

  // Set of active local slots for fast O(1) lookup during render
  const activeLocalSlots = React.useMemo(() => {
    const set = new Set<string>();
    for (const slot of localSlotsRef.current) {
      const { dayIndex, slotInDay } = utcToLocalSlot(slot, timezone);
      set.add(`${dayIndex}-${slotInDay}`);
    }
    return set;
  }, [timezone, localRender]);

  const toggleSlot = useCallback(
    (dayIndex: number, slotInDay: number, forceMode?: 'select' | 'erase') => {
      const utcSlot = localToUtcSlot(dayIndex, slotInDay, timezone);
      const isAlreadyActive = localSlotsRef.current.has(utcSlot);
      const mode = forceMode || (isAlreadyActive ? 'erase' : 'select');

      let changed = false;
      if (mode === 'select' && !isAlreadyActive) {
        localSlotsRef.current.add(utcSlot);
        changed = true;
      } else if (mode === 'erase' && isAlreadyActive) {
        localSlotsRef.current.delete(utcSlot);
        changed = true;
      }

      if (changed) {
        setLocalRender((r) => r + 1);
      }
    },
    [timezone]
  );

  // Commit changes to parent
  const commitChanges = useCallback(() => {
    stopAutoScroll();
    if (isDrawingRef.current) {
      isDrawingRef.current = false;
      lastTouchKeyRef.current = null;
      onSlotsChange(Array.from(localSlotsRef.current).sort((a, b) => a - b));
    }
  }, [onSlotsChange, stopAutoScroll]);

  // Quick jump to day column
  const scrollToDay = (dayIndex: number) => {
    if (!gridContainerRef.current) return;
    const dayCol = gridContainerRef.current.querySelector(`[data-day-header="${dayIndex}"]`) as HTMLElement;
    if (dayCol) {
      const containerRect = gridContainerRef.current.getBoundingClientRect();
      const colRect = dayCol.getBoundingClientRect();
      const targetScroll = gridContainerRef.current.scrollLeft + (colRect.left - containerRect.left) - 100;
      gridContainerRef.current.scrollTo({ left: Math.max(0, targetScroll), behavior: 'smooth' });
    }
  };

  // Mouse handlers (Desktop)
  const handleMouseDown = (e: React.MouseEvent, dayIndex: number, slotInDay: number) => {
    if (Date.now() - lastTouchTimestampRef.current < 600 || e.button !== 0) {
      return;
    }

    const key = `${dayIndex}-${slotInDay}`;
    const mode = activeLocalSlots.has(key) ? 'erase' : 'select';

    isDrawingRef.current = true;
    drawModeRef.current = mode;
    lastTouchKeyRef.current = key;

    toggleSlot(dayIndex, slotInDay, mode);
  };

  const handleMouseEnter = (dayIndex: number, slotInDay: number) => {
    if (!isDrawingRef.current) return;
    const key = `${dayIndex}-${slotInDay}`;
    if (key !== lastTouchKeyRef.current) {
      lastTouchKeyRef.current = key;
      toggleSlot(dayIndex, slotInDay, drawModeRef.current);
    }
  };

  // Touch handlers (Mobile)
  const handleTouchStartCell = (dayIndex: number, slotInDay: number) => {
    lastTouchTimestampRef.current = Date.now();
    const key = `${dayIndex}-${slotInDay}`;

    if (touchMode === 'scroll') {
      // In scroll mode, single tap toggles the cell without dragging
      toggleSlot(dayIndex, slotInDay);
      onSlotsChange(Array.from(localSlotsRef.current).sort((a, b) => a - b));
      return;
    }

    // In paint mode, start drag painting
    const mode = activeLocalSlots.has(key) ? 'erase' : 'select';
    isDrawingRef.current = true;
    drawModeRef.current = mode;
    lastTouchKeyRef.current = key;

    toggleSlot(dayIndex, slotInDay, mode);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDrawingRef.current || touchMode === 'scroll') return;
    const touch = e.touches[0];
    if (!touch) return;

    // 1. Horizontal Edge Auto-scroll when dragging near viewport boundaries
    if (gridContainerRef.current) {
      const containerRect = gridContainerRef.current.getBoundingClientRect();
      const EDGE_ZONE = 48; // px threshold
      const MAX_SPEED = 14;

      if (touch.clientX > containerRect.right - EDGE_ZONE) {
        const intensity = Math.min(1, (touch.clientX - (containerRect.right - EDGE_ZONE)) / EDGE_ZONE);
        startAutoScroll(Math.max(4, intensity * MAX_SPEED));
      } else if (touch.clientX < containerRect.left + EDGE_ZONE) {
        const intensity = Math.min(1, ((containerRect.left + EDGE_ZONE) - touch.clientX) / EDGE_ZONE);
        startAutoScroll(-Math.max(4, intensity * MAX_SPEED));
      } else {
        stopAutoScroll();
      }
    }

    // 2. Cell painting detection under finger
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!target) return;

    const cell = (target as HTMLElement).closest('[data-day][data-slot]');
    if (!cell) return;

    const dayStr = cell.getAttribute('data-day');
    const slotStr = cell.getAttribute('data-slot');
    if (dayStr !== null && slotStr !== null) {
      const d = parseInt(dayStr, 10);
      const s = parseInt(slotStr, 10);
      const key = `${d}-${s}`;
      if (key !== lastTouchKeyRef.current) {
        lastTouchKeyRef.current = key;
        toggleSlot(d, s, drawModeRef.current);
      }
    }
  };

  // Global pointer release safety
  useEffect(() => {
    const handleGlobalEnd = () => {
      if (isDrawingRef.current) {
        commitChanges();
      }
    };

    window.addEventListener('mouseup', handleGlobalEnd);
    window.addEventListener('touchend', handleGlobalEnd);
    window.addEventListener('touchcancel', handleGlobalEnd);

    return () => {
      window.removeEventListener('mouseup', handleGlobalEnd);
      window.removeEventListener('touchend', handleGlobalEnd);
      window.removeEventListener('touchcancel', handleGlobalEnd);
    };
  }, [commitChanges]);

  const totalHoursSelected = (localSlotsRef.current.size * 0.5).toFixed(1);

  return (
    <div
      className="space-y-3 select-none"
      onMouseLeave={() => {
        if (isDrawingRef.current) commitChanges();
      }}
    >
      {/* Status & Interaction Controls Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-1">
        {/* Total Hours Badge */}
        <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground font-medium">
          <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
          <span>
            <strong className="font-mono text-foreground font-bold px-1.5 py-0.5 rounded-sm bg-muted/60 border border-border/80">{totalHoursSelected} hrs</strong> selected
          </span>
        </div>

        {/* Mobile/Touch Toolbar: Mode Switcher + Day Jump Navigation */}
        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2.5">
          {/* Mode Switcher: Paint vs Scroll */}
          <div className="flex items-center gap-1.5 bg-muted/30 p-1 rounded-md border border-border/50">
            <button
              type="button"
              onClick={() => setTouchMode('paint')}
              title="Drag finger to paint availability"
              className={`flex items-center gap-1 px-2.5 py-1 rounded-sm text-xs font-bold transition-all cursor-pointer ${
                touchMode === 'paint'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Paintbrush className="w-3 h-3" />
              <span>Paint</span>
            </button>
            <button
              type="button"
              onClick={() => setTouchMode('scroll')}
              title="Pan and scroll freely across days and hours"
              className={`flex items-center gap-1 px-2.5 py-1 rounded-sm text-xs font-bold transition-all cursor-pointer ${
                touchMode === 'scroll'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Hand className="w-3 h-3" />
              <span>Pan / Scroll</span>
            </button>
          </div>

          {/* Day Jump Pills (Quick navigation across days) */}
          <div className="flex items-center gap-1 overflow-x-auto">
            <span className="text-[11px] font-semibold text-muted-foreground mr-0.5 shrink-0 hidden sm:inline">Jump:</span>
            {DAYS_OF_WEEK.map((day) => (
              <button
                key={day.index}
                type="button"
                onClick={() => scrollToDay(day.index)}
                title={`Jump view to ${day.name}`}
                className={`px-2 py-1 text-[11px] font-bold rounded-sm border cursor-pointer transition-all shrink-0 ${
                  day.isWeekend
                    ? 'bg-primary/10 border-primary/25 text-primary hover:bg-primary/20'
                    : 'bg-card border-border hover:border-primary/40 text-foreground'
                }`}
              >
                {day.shortName}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 7-Day Interactive Grid (Full 24-Hour Day) */}
      <div className="border border-border rounded-md bg-card shadow-xs overflow-hidden">
        <div
          ref={gridContainerRef}
          onTouchMove={handleTouchMove}
          onTouchEnd={commitChanges}
          onTouchCancel={commitChanges}
          className="overflow-x-auto scrollbar-thin"
        >
          <div className="min-w-[680px]">
            {/* Day Headers (Sticky Top) */}
            <div className="grid grid-cols-[100px_repeat(7,1fr)] sticky top-0 z-20 bg-card border-b border-border text-sm font-semibold">
              <div className="p-3 text-center text-muted-foreground border-r border-border/60 flex items-center justify-center bg-card font-mono text-xs uppercase tracking-wider">
                Time
              </div>
              {DAYS_OF_WEEK.map((day) => (
                <div
                  key={day.index}
                  data-day-header={day.index}
                  className={`p-2.5 text-center border-r border-border/60 last:border-r-0 ${
                    day.isWeekend ? 'bg-primary/5 text-primary' : 'text-foreground'
                  }`}
                >
                  <div className="font-bold text-sm tracking-tight whitespace-nowrap">{day.shortName}</div>
                  <div className="font-mono text-[10px] font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                    {day.isWeekend ? 'Weekend' : 'Weekday'}
                  </div>
                </div>
              ))}
            </div>

            {/* Hour & Half-Hour Rows */}
            <div className="divide-y divide-border/40">
              {Array.from({ length: HOURS_PER_DAY }).map((_, hour) => {
                const topSlot = hour * SLOTS_PER_HOUR;
                const bottomSlot = topSlot + 1;
                const timeLabel = formatSlotTime(topSlot, timeFormat);

                return (
                  <div key={hour} className="grid grid-cols-[100px_repeat(7,1fr)] group hover:bg-muted/10">
                    {/* Time label column */}
                    <div className="p-2 text-center text-xs font-mono font-semibold text-muted-foreground tabular-nums whitespace-nowrap border-r border-border/60 flex items-center justify-center bg-card">
                      {timeLabel}
                    </div>

                    {/* 7 Days Columns for this hour */}
                    {DAYS_OF_WEEK.map((day) => {
                      const topKey = `${day.index}-${topSlot}`;
                      const bottomKey = `${day.index}-${bottomSlot}`;
                      const isTopActive = activeLocalSlots.has(topKey);
                      const isBottomActive = activeLocalSlots.has(bottomKey);

                      return (
                        <div
                          key={day.index}
                          className={`border-r border-border/40 last:border-r-0 flex flex-col ${
                            day.isWeekend ? 'bg-primary/[0.02]' : ''
                          }`}
                        >
                          {/* Top 30-min slot (:00) */}
                          <div
                            data-day={day.index}
                            data-slot={topSlot}
                            onMouseDown={(e) => handleMouseDown(e, day.index, topSlot)}
                            onMouseEnter={() => handleMouseEnter(day.index, topSlot)}
                            onTouchStart={() => handleTouchStartCell(day.index, topSlot)}
                            title={`${day.name} ${formatSlotTime(topSlot, timeFormat)}`}
                            style={{ touchAction: touchMode === 'paint' ? 'none' : 'auto' }}
                            className={`h-6 border-b border-border/20 cursor-pointer select-none ${
                              isTopActive
                                ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                                : 'hover:bg-primary/25'
                            }`}
                          />

                          {/* Bottom 30-min slot (:30) */}
                          <div
                            data-day={day.index}
                            data-slot={bottomSlot}
                            onMouseDown={(e) => handleMouseDown(e, day.index, bottomSlot)}
                            onMouseEnter={() => handleMouseEnter(day.index, bottomSlot)}
                            onTouchStart={() => handleTouchStartCell(day.index, bottomSlot)}
                            title={`${day.name} ${formatSlotTime(bottomSlot, timeFormat)}`}
                            style={{ touchAction: touchMode === 'paint' ? 'none' : 'auto' }}
                            className={`h-6 cursor-pointer select-none ${
                              isBottomActive
                                ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                                : 'hover:bg-primary/25'
                            }`}
                          />
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
WeeklyGridPainter.displayName = 'WeeklyGridPainter';
