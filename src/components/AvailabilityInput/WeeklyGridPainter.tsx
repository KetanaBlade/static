import React, { useState, useRef, useCallback, useEffect } from 'react';
import { DAYS_OF_WEEK, HOURS_PER_DAY, SLOTS_PER_HOUR } from '../../lib/constants';
import { formatSlotTime, localToUtcSlot, utcToLocalSlot } from '../../lib/timezone';
import { SlotIndex } from '../../types';
import { Sparkles, Paintbrush, Hand, ArrowUp, Sun, Sunset, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
  const gridRootRef = useRef<HTMLDivElement>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);

  const localSlotsRef = useRef<Set<number>>(new Set(currentSlots));
  const isDrawingRef = useRef<boolean>(false);
  const drawModeRef = useRef<'select' | 'erase'>('select');
  const lastTouchKeyRef = useRef<string | null>(null);
  const lastTouchTimestampRef = useRef<number>(0);
  const [localRender, setLocalRender] = useState(0);

  // Interaction Mode on mobile: 'paint' (drag to paint) vs 'scroll' (pan/scroll freely)
  const [touchMode, setTouchMode] = useState<'paint' | 'scroll'>('paint');

  // Floating Back-to-Top visibility state
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Horizontal Edge auto-scrolling refs
  const autoScrollSpeedRef = useRef<number>(0);
  const autoScrollAnimRef = useRef<number | null>(null);

  // Vertical Edge auto-scrolling refs (for drag painting across screen height)
  const vScrollSpeedRef = useRef<number>(0);
  const vScrollAnimRef = useRef<number | null>(null);

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

  const startVerticalAutoScroll = useCallback((speed: number) => {
    vScrollSpeedRef.current = speed;
    if (vScrollAnimRef.current === null) {
      const vStep = () => {
        if (vScrollSpeedRef.current !== 0) {
          window.scrollBy(0, vScrollSpeedRef.current);
          vScrollAnimRef.current = requestAnimationFrame(vStep);
        } else {
          vScrollAnimRef.current = null;
        }
      };
      vScrollAnimRef.current = requestAnimationFrame(vStep);
    }
  }, []);

  const stopVerticalAutoScroll = useCallback(() => {
    vScrollSpeedRef.current = 0;
    if (vScrollAnimRef.current !== null) {
      cancelAnimationFrame(vScrollAnimRef.current);
      vScrollAnimRef.current = null;
    }
  }, []);

  // Monitor window scroll to show floating "Back to Top" button
  useEffect(() => {
    const handleWindowScroll = () => {
      if (!gridRootRef.current) return;
      const rect = gridRootRef.current.getBoundingClientRect();
      // Show button if top of grid is scrolled more than 180px above viewport
      setShowScrollTop(rect.top < -180 && rect.bottom > 200);
    };

    window.addEventListener('scroll', handleWindowScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleWindowScroll);
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
    stopVerticalAutoScroll();
    if (isDrawingRef.current) {
      isDrawingRef.current = false;
      lastTouchKeyRef.current = null;
      onSlotsChange(Array.from(localSlotsRef.current).sort((a, b) => a - b));
    }
  }, [onSlotsChange, stopAutoScroll, stopVerticalAutoScroll]);

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

  // Quick jump to specific time row
  const scrollToHour = (hour: number) => {
    if (hour === 0) {
      if (gridRootRef.current) {
        gridRootRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return;
    }

    const rowEl = gridContainerRef.current?.querySelector(`[data-hour-row="${hour}"]`) as HTMLElement;
    if (rowEl) {
      rowEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
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

    // 1. Horizontal Edge Auto-scroll when dragging near horizontal container boundaries
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

    // 2. Vertical Edge Auto-scroll when dragging near viewport top/bottom edges
    const V_EDGE_ZONE = 70; // px threshold
    if (touch.clientY < V_EDGE_ZONE) {
      const intensity = Math.min(1, (V_EDGE_ZONE - touch.clientY) / V_EDGE_ZONE);
      startVerticalAutoScroll(-Math.max(4, intensity * 16));
    } else if (touch.clientY > window.innerHeight - V_EDGE_ZONE) {
      const intensity = Math.min(1, (touch.clientY - (window.innerHeight - V_EDGE_ZONE)) / V_EDGE_ZONE);
      startVerticalAutoScroll(Math.max(4, intensity * 16));
    } else {
      stopVerticalAutoScroll();
    }

    // 3. Cell painting detection under finger
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
      ref={gridRootRef}
      className="space-y-3 select-none relative"
      onMouseLeave={() => {
        if (isDrawingRef.current) commitChanges();
      }}
    >
      {/* Sticky Controls Header: Keeps Mode & Navigation instantly accessible anywhere in the grid */}
      <div className="sticky top-0 z-30 -mx-1 px-2 py-2 rounded-md bg-card/95 backdrop-blur-md border border-border/70 shadow-xs flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Total Hours Badge */}
          <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground font-medium">
            <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
            <span>
              <strong className="font-mono text-foreground font-bold px-1.5 py-0.5 rounded-sm bg-muted/60 border border-border/80">{totalHoursSelected} hrs</strong> selected
            </span>
          </div>

          {/* Mode Switcher: Paint vs Scroll */}
          <div className="flex items-center gap-1 bg-muted/40 p-0.5 rounded-md border border-border/50">
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
        </div>

        {/* Quick-Jump Toolbar (Day & Time Jumps) */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/40 text-xs">
          {/* Day Jumpers */}
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
            <span className="text-[10px] font-mono font-bold text-muted-foreground mr-0.5 shrink-0 uppercase tracking-wider">Day:</span>
            {DAYS_OF_WEEK.map((day) => (
              <button
                key={day.index}
                type="button"
                onClick={() => scrollToDay(day.index)}
                title={`Jump horizontal view to ${day.name}`}
                className={`px-1.5 py-0.5 text-[11px] font-bold rounded-sm border cursor-pointer transition-all shrink-0 ${
                  day.isWeekend
                    ? 'bg-primary/10 border-primary/25 text-primary hover:bg-primary/20'
                    : 'bg-card border-border hover:border-primary/40 text-foreground'
                }`}
              >
                {day.shortName}
              </button>
            ))}
          </div>

          {/* Time Jumpers (Vertical Quick Navigation) */}
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
            <span className="text-[10px] font-mono font-bold text-muted-foreground mr-0.5 shrink-0 uppercase tracking-wider">Time:</span>
            <button
              type="button"
              onClick={() => scrollToHour(0)}
              title="Jump to Top (Midnight)"
              className="flex items-center gap-0.5 px-1.5 py-0.5 text-[11px] font-bold rounded-sm border border-border bg-card hover:border-primary/40 text-foreground cursor-pointer"
            >
              <ArrowUp className="w-3 h-3 text-primary" />
              <span>Top</span>
            </button>
            <button
              type="button"
              onClick={() => scrollToHour(8)}
              title="Jump to Morning (8:00 AM)"
              className="flex items-center gap-0.5 px-1.5 py-0.5 text-[11px] font-bold rounded-sm border border-border bg-card hover:border-primary/40 text-foreground cursor-pointer"
            >
              <Sun className="w-3 h-3 text-amber-500" />
              <span>8 AM</span>
            </button>
            <button
              type="button"
              onClick={() => scrollToHour(12)}
              title="Jump to Afternoon (12:00 PM)"
              className="flex items-center gap-0.5 px-1.5 py-0.5 text-[11px] font-bold rounded-sm border border-border bg-card hover:border-primary/40 text-foreground cursor-pointer"
            >
              <Sunset className="w-3 h-3 text-orange-500" />
              <span>12 PM</span>
            </button>
            <button
              type="button"
              onClick={() => scrollToHour(18)}
              title="Jump to Evening (6:00 PM)"
              className="flex items-center gap-0.5 px-1.5 py-0.5 text-[11px] font-bold rounded-sm border border-border bg-card hover:border-primary/40 text-foreground cursor-pointer"
            >
              <Moon className="w-3 h-3 text-indigo-400" />
              <span>6 PM</span>
            </button>
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
            {/* Day Headers */}
            <div className="grid grid-cols-[100px_repeat(7,1fr)] bg-card border-b border-border text-sm font-semibold">
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
                  <div
                    key={hour}
                    data-hour-row={hour}
                    className="grid grid-cols-[100px_repeat(7,1fr)] group hover:bg-muted/10"
                  >
                    {/* Time label column (100px wide touch-scroll track for vertical scrolling) */}
                    <div
                      style={{ touchAction: 'pan-y' }}
                      title="Swipe on this column to scroll up and down"
                      className="p-2 text-center text-xs font-mono font-semibold text-muted-foreground tabular-nums whitespace-nowrap border-r border-border/60 flex items-center justify-center bg-card select-none"
                    >
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

      {/* Floating Action Button: 1-Tap Quick Scroll to Top */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            className="fixed bottom-5 right-5 z-40"
          >
            <button
              type="button"
              onClick={() => scrollToHour(0)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-lg hover:shadow-xl transition-all cursor-pointer border border-primary/20"
            >
              <ArrowUp className="w-3.5 h-3.5" />
              <span>Back to Top</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
WeeklyGridPainter.displayName = 'WeeklyGridPainter';
