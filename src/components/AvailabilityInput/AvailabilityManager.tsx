import React, { useState } from 'react';
import { POPULAR_TIMEZONES } from '../../lib/constants';
import { detectUserTimezone, getTimezoneAbbreviation } from '../../lib/timezone';
import { GroupMember, SlotIndex } from '../../types';
import { QuickPresets } from './QuickPresets';
import { RangeBuilder } from './RangeBuilder';
import { WeeklyGridPainter } from './WeeklyGridPainter';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Globe, Check, Calendar, ListPlus, Sparkles, UserCheck } from 'lucide-react';

interface AvailabilityManagerProps {
  currentMember?: GroupMember;
  onSaveMember: (name: string, timezone: string, slotsUtc: SlotIndex[]) => void;
  timeFormat?: '12h' | '24h';
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
  const [isSaved, setIsSaved] = useState<boolean>(false);

  const handleAutoDetectTimezone = () => {
    const detected = detectUserTimezone();
    setTimezone(detected);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSaveMember(name.trim(), timezone, slotsUtc);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const tzAbbr = getTimezoneAbbreviation(timezone);

  return (
    <Card className="border-border bg-card shadow-sm">
      <CardHeader className="p-5 sm:p-6 pb-4 border-b border-border/60">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="text-xl sm:text-2xl font-extrabold text-foreground flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-primary" />
              {currentMember ? `Edit Availability for ${currentMember.name}` : 'Your Weekly Availability'}
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Paint your free hours or tap a preset. Everything translates to your friends' timezones automatically.
            </CardDescription>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="inline-flex rounded-xl border border-border bg-muted/50 p-1 self-start md:self-auto shrink-0">
            <button
              type="button"
              onClick={() => setInputMode('grid')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                inputMode === 'grid'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              Interactive Grid
            </button>
            <button
              type="button"
              onClick={() => setInputMode('ranges')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                inputMode === 'ranges'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ListPlus className="w-3.5 h-3.5" />
              Time Range Form
            </button>
          </div>
        </div>

        {/* User Identity & Timezone Form Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-4">
          <div>
            <label className="text-xs font-bold text-foreground block mb-1">
              Your Name / Nickname <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Alex"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-11 px-3.5 rounded-lg border border-border bg-background text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-xs"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-foreground">
                Your Timezone
              </label>
              <button
                type="button"
                onClick={handleAutoDetectTimezone}
                className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Globe className="w-3 h-3" />
                Auto-detect
              </button>
            </div>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full h-11 px-3.5 rounded-lg border border-border bg-background text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-xs cursor-pointer"
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

      <CardContent className="p-5 sm:p-6 space-y-6">
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

        {/* Save Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border/80">
          <div className="text-xs sm:text-sm text-muted-foreground font-medium text-center sm:text-left">
            {slotsUtc.length > 0 ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                {(slotsUtc.length * 0.5).toFixed(1)} hours of availability painted
              </span>
            ) : (
              'Paint your hours above or tap a 1-tap preset to choose when you are free'
            )}
          </div>

          <Button
            onClick={handleSave}
            disabled={!name.trim() || slotsUtc.length === 0}
            variant={isSaved ? 'success' : 'default'}
            className="w-full sm:w-auto h-11 px-8 text-sm font-bold shadow-md cursor-pointer"
          >
            {isSaved ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Saved & Synced to Group!
              </>
            ) : (
              'Save My Availability'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
