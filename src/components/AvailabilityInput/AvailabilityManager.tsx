import React, { useState, useRef, useEffect } from 'react';
import { POPULAR_TIMEZONES } from '../../lib/constants';
import { detectUserTimezone, getTimezoneAbbreviation } from '../../lib/timezone';
import { GroupMember, SlotIndex } from '../../types';
import { QuickPresets } from './QuickPresets';
import { RangeBuilder } from './RangeBuilder';
import { WeeklyGridPainter } from './WeeklyGridPainter';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Globe, Check, Calendar, ListPlus, Sparkles, UserCheck, CircleDot } from 'lucide-react';

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
  const [isRecentlySaved, setIsRecentlySaved] = useState<boolean>(false);

  // Track the baseline saved state to know if user made changes
  const lastSavedState = useRef<{ name: string; timezone: string; slotsUtc: SlotIndex[] }>({
    name: currentMember?.name || '',
    timezone: currentMember?.timezone || timezone,
    slotsUtc: currentMember?.slotsUtc || [],
  });

  // When switching member or loading member
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
    }
  }, [currentMember]);

  const isDirty =
    name.trim() !== lastSavedState.current.name.trim() ||
    timezone !== lastSavedState.current.timezone ||
    !areSlotsEqual(slotsUtc, lastSavedState.current.slotsUtc);

  const handleAutoDetectTimezone = () => {
    const detected = detectUserTimezone();
    setTimezone(detected);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSaveMember(name.trim(), timezone, slotsUtc);
    lastSavedState.current = {
      name: name.trim(),
      timezone,
      slotsUtc: [...slotsUtc],
    };
    setIsRecentlySaved(true);
    setTimeout(() => setIsRecentlySaved(false), 4000);
  };

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
              Paint your free hours or tap a preset. Everything translates to your friends' timezones automatically.
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

        {/* Save Bar with Dynamic Status Indicator */}
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

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
            {/* Live Pending / Saved Status Pill */}
            {isDirty && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/25 animate-fade-in">
                <CircleDot className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                Changes Pending
              </span>
            )}

            {!isDirty && isRecentlySaved && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/25 animate-fade-in">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                Saved & Synced!
              </span>
            )}

            {!isDirty && !isRecentlySaved && lastSavedState.current.slotsUtc.length > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-muted-foreground bg-muted/30 border border-border/60">
                <Check className="w-3.5 h-3.5 text-muted-foreground" />
                All Saved
              </span>
            )}

            {/* Save Button */}
            <Button
              onClick={handleSave}
              disabled={!name.trim() || slotsUtc.length === 0 || (!isDirty && !isRecentlySaved && lastSavedState.current.slotsUtc.length > 0)}
              variant={isDirty ? 'default' : isRecentlySaved ? 'success' : 'outline'}
              className="w-full sm:w-auto h-12 px-8 text-sm sm:text-base font-semibold shadow-md cursor-pointer transition-all"
            >
              {isRecentlySaved ? (
                <>
                  <Check className="w-5 h-5 mr-2 text-white" />
                  Saved!
                </>
              ) : isDirty ? (
                'Save My Availability'
              ) : (
                'Saved & Up to Date'
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
