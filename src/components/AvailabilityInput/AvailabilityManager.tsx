import React, { useState, useRef, useEffect, useCallback } from 'react';
import { POPULAR_TIMEZONES } from '../../lib/constants';
import { detectUserTimezone, getTimezoneAbbreviation } from '../../lib/timezone';
import { GroupMember, SlotIndex } from '../../types';
import { QuickPresets } from './QuickPresets';
import { RangeBuilder } from './RangeBuilder';
import { WeeklyGridPainter } from './WeeklyGridPainter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Globe, Check, Calendar, ListPlus, Sparkles, UserCheck, CircleDot, Cloud } from 'lucide-react';

interface AvailabilityManagerProps {
  currentMember?: GroupMember;
  onSaveMember: (name: string, timezone: string, slotsUtc: SlotIndex[]) => void;
  timeFormat?: '12h' | '24h';
}

function areSlotsEqual(a: SlotIndex[], b: SlotIndex[]): boolean {
  if (a.length !== b.length) return false;
  const setA = new Set(a);
  for (const s of b) {
    if (!setA.has(s)) return false;
  }
  return true;
}

export const AvailabilityManager: React.FC<AvailabilityManagerProps> = ({
  currentMember,
  onSaveMember,
  timeFormat = '12h',
}) => {
  const [name, setName] = useState<string>(currentMember?.name || '');
  const [timezone, setTimezone] = useState<string>(
    currentMember?.timezone || detectUserTimezone()
  );
  const [slotsUtc, setSlotsUtc] = useState<SlotIndex[]>(
    currentMember?.slotsUtc || []
  );
  const [inputMode, setInputMode] = useState<'grid' | 'ranges'>('grid');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle' | 'needs_name'>('saved');

  // Baseline of what has been successfully saved
  const lastSavedState = useRef<{ name: string; timezone: string; slotsUtc: SlotIndex[] }>({
    name: currentMember?.name || '',
    timezone: currentMember?.timezone || timezone,
    slotsUtc: currentMember?.slotsUtc || [],
  });

  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialMount = useRef<boolean>(true);

  // When switching member or loading member from outside
  useEffect(() => {
    if (currentMember) {
      setName(currentMember.name);
      setTimezone(currentMember.timezone);
      setSlotsUtc(currentMember.slotsUtc);
      lastSavedState.current = {
        name: currentMember.name,
        timezone: currentMember.timezone,
        slotsUtc: currentMember.slotsUtc,
      };
      setSaveStatus('saved');
    }
  }, [currentMember]);

  const handleAutoDetectTimezone = () => {
    const detected = detectUserTimezone();
    setTimezone(detected);
  };

  // Perform the actual save
  const performSave = useCallback(
    (saveName: string, saveTz: string, saveSlots: SlotIndex[]) => {
      if (!saveName.trim()) {
        setSaveStatus('needs_name');
        return;
      }

      onSaveMember(saveName.trim(), saveTz, saveSlots);
      lastSavedState.current = {
        name: saveName.trim(),
        timezone: saveTz,
        slotsUtc: [...saveSlots],
      };
      setSaveStatus('saved');
    },
    [onSaveMember]
  );

  // Debounced Auto-Save trigger
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const trimmedName = name.trim();
    const hasChanges =
      trimmedName !== lastSavedState.current.name.trim() ||
      timezone !== lastSavedState.current.timezone ||
      !areSlotsEqual(slotsUtc, lastSavedState.current.slotsUtc);

    if (!hasChanges) {
      return;
    }

    if (!trimmedName) {
      setSaveStatus('needs_name');
      return;
    }

    // Indicate saving state immediately
    setSaveStatus('saving');

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    // Auto-save after 500ms debounce
    saveTimerRef.current = setTimeout(() => {
      performSave(name, timezone, slotsUtc);
    }, 500);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [name, timezone, slotsUtc, performSave]);

  const tzAbbr = getTimezoneAbbreviation(timezone);

  return (
    <Card className="border-border bg-card shadow-sm">
      <CardHeader className="p-6 sm:p-7 pb-5 border-b border-border/60">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="text-xl sm:text-2xl font-semibold text-foreground flex items-center gap-2.5">
              <UserCheck className="w-6 h-6 text-primary" />
              {currentMember ? `Edit Availability for ${currentMember.name}` : 'Your Weekly Availability'}
            </CardTitle>
            <CardDescription className="text-sm sm:text-base text-muted-foreground mt-1.5 leading-relaxed">
              Paint your free hours or tap a preset. Changes automatically save in real time.
            </CardDescription>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="inline-flex rounded-xl border border-border bg-muted/60 p-1 self-start md:self-auto shrink-0 shadow-inner" role="tablist" aria-label="Input mode">
            <button
              type="button"
              role="tab"
              aria-selected={inputMode === 'grid'}
              onClick={() => setInputMode('grid')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors cursor-pointer ${
                inputMode === 'grid'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Calendar className="w-4 h-4" />
              Interactive Grid
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={inputMode === 'ranges'}
              onClick={() => setInputMode('ranges')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors cursor-pointer ${
                inputMode === 'ranges'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ListPlus className="w-4 h-4" />
              Time Range Form
            </button>
          </div>
        </div>

        {/* User Identity & Timezone Form Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-5">
          <div>
            <label className="text-sm sm:text-base font-semibold text-foreground block mb-1.5">
              Your Name / Nickname <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Alex"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-11 px-3.5 rounded-lg border border-border bg-background text-sm sm:text-base font-medium focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-xs"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm sm:text-base font-semibold text-foreground">
                Your Timezone
              </label>
              <button
                type="button"
                onClick={handleAutoDetectTimezone}
                className="text-xs sm:text-sm font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Globe className="w-3.5 h-3.5" />
                Auto-detect
              </button>
            </div>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full h-11 px-3.5 rounded-lg border border-border bg-background text-sm sm:text-base font-medium focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-xs cursor-pointer"
            >
              <option value={timezone}>Current: {timezone} ({tzAbbr})</option>
              {POPULAR_TIMEZONES.map((group) => (
                <optgroup key={group.group} label={group.group}>
                  {group.timezones.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 sm:p-7 space-y-6">
        {/* Quick Presets */}
        <QuickPresets
          timezone={timezone}
          currentSlots={slotsUtc}
          onSlotsChange={setSlotsUtc}
        />

        {/* Active Input Mode */}
        {inputMode === 'grid' ? (
          <WeeklyGridPainter
            timezone={timezone}
            currentSlots={slotsUtc}
            onSlotsChange={setSlotsUtc}
            timeFormat={timeFormat}
          />
        ) : (
          <RangeBuilder
            timezone={timezone}
            currentSlots={slotsUtc}
            onSlotsChange={setSlotsUtc}
            timeFormat={timeFormat}
          />
        )}

        {/* Bottom Bar: Hours Count & Live Auto-Save Status */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-5 border-t border-border/80">
          <div className="text-sm sm:text-base text-muted-foreground font-medium text-center sm:text-left">
            {slotsUtc.length > 0 ? (
              <span className="text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                {(slotsUtc.length * 0.5).toFixed(1)} hours of availability painted
              </span>
            ) : (
              'Paint your hours above or tap a 1-tap preset to choose when you are free'
            )}
          </div>

          {/* Live Auto-Save Status Badge */}
          <div className="flex items-center gap-2">
            {saveStatus === 'saving' && (
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/25 animate-pulse">
                <CircleDot className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                Auto-saving changes...
              </span>
            )}

            {saveStatus === 'saved' && (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/25">
                <Check className="w-4 h-4 text-emerald-600" />
                Saved to group
              </span>
            )}

            {saveStatus === 'needs_name' && (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold bg-primary/10 text-primary border border-primary/25">
                <Cloud className="w-3.5 h-3.5 text-primary" />
                Type your name above to save
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
