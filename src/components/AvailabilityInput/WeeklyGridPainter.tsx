import React, { useState, useRef, useCallback } from 'react';
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
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [drawMode, setDrawMode] = useState<'select' | 'erase'>('select');
  const gridContainerRef = useRef<HTMLDivElement>(null);

  const localSlotsRef = useRef<Set<number>>(new Set(currentSlots));
  const [localRender, setLocalRender] = useState(0); // Forces local UI updates during drag

  // Sync ref from parent when NOT drawing
  React.useEffect(() => {
    if (!isDrawing) {
      localSlotsRef.current = new Set(currentSlots);
      setLocalRender(r => r + 1); // Ensure local UI matches new parent state
    }
  }, [currentSlots, isDrawing]);

  // Set of active local slots for fast O(1) lookup during render
  const activeLocalSlots = React.useMemo(() => {
    const set = new Set<string>();
    for (const slot of localSlotsRef.current) {
      const { dayIndex, slotInDay } = utcToLocalSlot(slot, timezone);
      set.add(`${dayIndex}-${slotInDay}`);
    }
    return set;
  }, [timezone, localRender]); // Recomputes instantly on localRender

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
        // FAST LOCAL UPDATE ONLY: Do NOT call onSlotsChange here!
        // This prevents the main thread from blocking on App-level reconciliations during a fast drag.
        setLocalRender(r => r + 1);
      }
    },
    [timezone]
  );

  const handleMouseDown = (dayIndex: number, slotInDay: number) => {
    const key = `${dayIndex}-${slotInDay}`;
    const mode = activeLocalSlots.has(key) ? 'erase' : 'select';
    
    setIsDrawing(true);
    setDrawMode(mode);
    toggleSlot(dayIndex, slotInDay, mode);
  };

  const handleMouseEnter = (dayIndex: number, slotInDay: number) => {
    if (!isDrawing) return;
    toggleSlot(dayIndex, slotInDay, drawMode);
  };

  const handleMouseUp = () => {
    if (isDrawing) {
      setIsDrawing(false);
      // Now that the drag is over, dispatch the fully accumulated array to the parent to save/sync
      onSlotsChange(Array.from(localSlotsRef.current).sort((a, b) => a - b));
    }
  };

  // Touch support for mobile dragging
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDrawing) return;
    const touch = e.touches[0];
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!target) return;

    const dayStr = target.getAttribute('data-day');
    const slotStr = target.getAttribute('data-slot');
    if (dayStr !== null && slotStr !== null) {
      const d = parseInt(dayStr, 10);
      const s = parseInt(slotStr, 10);
      toggleSlot(d, s, drawMode);
    }
  };

  const totalHoursSelected = (localSlotsRef.current.size * 0.5).toFixed(1);

  return (
    <div
      className="space-y-3 select-none"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
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
          onTouchEnd={handleMouseUp}
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
                            onMouseDown={() => handleMouseDown(day.index, topSlot)}
                            onMouseEnter={() => handleMouseEnter(day.index, topSlot)}
                            title={`${day.name} ${formatSlotTime(topSlot, timeFormat)}`}
                            className={`h-6 border-b border-border/20 cursor-pointer transition-colors ${
                              isTopActive
                                ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                                : 'hover:bg-primary/25'
                            }`}
                          />

                          {/* Bottom 30-min slot (:30) */}
                          <div
                            data-day={day.index}
                            data-slot={bottomSlot}
                            onMouseDown={() => handleMouseDown(day.index, bottomSlot)}
                            onMouseEnter={() => handleMouseEnter(day.index, bottomSlot)}
                            title={`${day.name} ${formatSlotTime(bottomSlot, timeFormat)}`}
                            className={`h-6 cursor-pointer transition-colors ${
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
