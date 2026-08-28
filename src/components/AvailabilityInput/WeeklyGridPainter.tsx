import React, { useState, useRef, useCallback, useEffect } from 'react';
import { DAYS_OF_WEEK, HOURS_PER_DAY, SLOTS_PER_HOUR } from '../../lib/constants';
import { formatSlotTime, localToUtcSlot, utcToLocalSlot } from '../../lib/timezone';
import { SlotIndex } from '../../types';
import { Sparkles, MousePointerClick } from 'lucide-react';

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
  const [localRender, setLocalRender] = useState(0); // Forces local UI updates during drag

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
    if (isDrawingRef.current) {
      isDrawingRef.current = false;
      lastTouchKeyRef.current = null;
      onSlotsChange(Array.from(localSlotsRef.current).sort((a, b) => a - b));
    }
  }, [onSlotsChange]);

  // Mouse handlers (Desktop)
  const handleMouseDown = (e: React.MouseEvent, dayIndex: number, slotInDay: number) => {
    // Ignore synthetic mouse events generated right after a touch
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
    const mode = activeLocalSlots.has(key) ? 'erase' : 'select';

    isDrawingRef.current = true;
    drawModeRef.current = mode;
    lastTouchKeyRef.current = key;

    toggleSlot(dayIndex, slotInDay, mode);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDrawingRef.current) return;
    const touch = e.touches[0];
    if (!touch) return;

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
      {/* Minimalist Status & Guide Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs sm:text-sm text-muted-foreground font-medium">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span>
            <strong className="font-mono text-foreground font-bold px-1.5 py-0.5 rounded-sm bg-muted/60 border border-border/80">{totalHoursSelected} hrs</strong> selected
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MousePointerClick className="w-3.5 h-3.5 text-primary" />
          <span>Click or drag across the grid to toggle hours</span>
        </div>
      </div>

      {/* 7-Day Interactive Grid (Full 24-Hour Day) */}
      <div className="border border-border rounded-md bg-card shadow-xs overflow-hidden">
        <div
          ref={gridContainerRef}
          onTouchMove={handleTouchMove}
          onTouchEnd={commitChanges}
          onTouchCancel={commitChanges}
          className="overflow-x-auto"
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
                            style={{ touchAction: 'none' }}
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
                            style={{ touchAction: 'none' }}
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
