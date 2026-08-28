import React, { useState, useRef, useEffect, useCallback } from 'react';
import { POPULAR_TIMEZONES } from '../../lib/constants';
import { detectUserTimezone, getTimezoneAbbreviation } from '../../lib/timezone';
import { GroupMember, SlotIndex } from '../../types';
import { QuickPresets } from './QuickPresets';
import { RangeBuilder } from './RangeBuilder';
import { WeeklyGridPainter } from './WeeklyGridPainter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import {
  Globe,
  Check,
  Calendar,
  ListPlus,
  Sparkles,
  UserCheck,
  CircleDot,
  Cloud,
  ChevronRight,
  User,
  Edit2,
} from 'lucide-react';

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
  const [isEditingIdentity, setIsEditingIdentity] = useState<boolean>(!currentMember?.name);

  // Baseline of what has been successfully saved
  const lastSavedState = useRef<{ name: string; timezone: string; slotsUtc: SlotIndex[] }>({
    name: currentMember?.name || '',
    timezone: currentMember?.timezone || timezone,
    slotsUtc: currentMember?.slotsUtc || [],
  });

  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialMount = useRef<boolean>(true);
  const nameInputRef = useRef<HTMLInputElement>(null);

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
      setIsEditingIdentity(false);
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

    setSaveStatus('saving');

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    // Auto-save after 150ms debounce (very responsive, avoids missing saves)
    saveTimerRef.current = setTimeout(() => {
      performSave(name, timezone, slotsUtc);
    }, 150);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [name, timezone, slotsUtc, performSave]);

  const tzAbbr = getTimezoneAbbreviation(timezone);
  const hasValidIdentity = Boolean(name.trim());

  // State for collapse sections (expanded by default)
  const [isProfileCollapsed, setIsProfileCollapsed] = useState(false);
  const [isGridCollapsed, setIsGridCollapsed] = useState(false);

  return (
    <div className="space-y-6">
      {/* ================= STEP 1: YOUR PROFILE CARD ================= */}
      <Card className="border border-border bg-card shadow-sm transition-all rounded-lg overflow-hidden">
        <CardHeader 
          className="p-5 sm:p-6 cursor-pointer hover:bg-muted/30 transition-colors select-none flex flex-row items-center justify-between"
          onClick={() => setIsProfileCollapsed(!isProfileCollapsed)}
        >
          <div className="flex items-center gap-3">
            <UserCheck className="w-5 h-5 text-primary" />
            <div>
              <CardTitle className="text-lg font-bold tracking-tight text-foreground">
                Your Profile {hasValidIdentity && !isEditingIdentity ? `(${name})` : ''}
              </CardTitle>
              {!isProfileCollapsed && (
                <CardDescription className="text-sm font-medium text-muted-foreground mt-1">
                  Set your name and timezone to get started.
                </CardDescription>
              )}
            </div>
          </div>
          <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${isProfileCollapsed ? '' : 'rotate-90'}`} />
        </CardHeader>

        {!isProfileCollapsed && (
          <CardContent className="p-6 border-t border-border/40">
            {hasValidIdentity && !isEditingIdentity ? (
              /* Compact identity badge when already set */
              <div className="p-4 rounded-xl border border-border/80 bg-muted/20 flex flex-wrap items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-base">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-base text-foreground flex items-center gap-2">
                      <span>{name}</span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                        Active Profile
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground font-medium mt-0.5">
                      Timezone: {timezone} ({tzAbbr})
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditingIdentity(true);
                  }}
                  className="text-sm font-bold text-primary hover:underline flex items-center gap-1.5 cursor-pointer py-1.5 px-3 rounded-lg hover:bg-primary/10 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit Profile
                </button>
              </div>
            ) : (
              /* Expanded Step 1 Identity Form */
              <div className="space-y-5" onClick={(e) => e.stopPropagation()}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="text-sm font-bold text-foreground block mb-2">
                      Member Name or Nickname <span className="text-destructive">*</span>
                    </label>
                    <input
                      ref={nameInputRef}
                      type="text"
                      required
                      autoFocus
                      placeholder="e.g. Alex, Jordan, Sean"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full h-11 px-3.5 rounded-md border border-input bg-card text-base font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-xs"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-bold text-foreground">
                        Timezone
                      </label>
                      <button
                        type="button"
                        onClick={handleAutoDetectTimezone}
                        className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Globe className="w-3.5 h-3.5" />
                        Auto-detect
                      </button>
                    </div>
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full h-11 pl-3.5 pr-10 rounded-md border border-input bg-card text-base font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-xs cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22currentColor%22%3E%3Cpath%20d%3D%22M5.293%207.293a1%201%200%20011.414%200L10%2010.586l3.293-3.293a1%201%200%20111.414%201.414l-4%204a1%201%200%2001-1.414%200l-4-4a1%201%200%20010-1.414z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[position:right_0.5rem_center] bg-no-repeat"
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

                {isEditingIdentity && hasValidIdentity && (
                  <div className="flex justify-end pt-2">
                    <Button
                      size="sm"
                      onClick={() => setIsEditingIdentity(false)}
                      className="font-bold tracking-tight shadow-xs h-10 px-4 cursor-pointer"
                    >
                      Done Editing
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* ================= STEP 2: AVAILABILITY CARD ================= */}
      <Card className={`border border-border bg-card shadow-sm transition-all rounded-lg overflow-hidden ${!hasValidIdentity ? 'opacity-50 pointer-events-none' : ''}`}>
        <CardHeader 
          className="p-5 sm:p-6 cursor-pointer hover:bg-muted/30 transition-colors select-none flex flex-row items-center justify-between border-b border-border/40"
          onClick={() => hasValidIdentity && setIsGridCollapsed(!isGridCollapsed)}
        >
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-primary" />
            <div>
              <CardTitle className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                Member Availability
                {!hasValidIdentity && (
                  <span className="text-xs font-bold bg-muted text-muted-foreground px-2 py-0.5 rounded-sm uppercase tracking-wider">Requires Profile</span>
                )}
              </CardTitle>
              {!isGridCollapsed && (
                <CardDescription className="text-sm font-medium text-muted-foreground mt-1">
                  Select recurring weekly free hours. Everything translates to your friends' timezones.
                </CardDescription>
              )}
            </div>
          </div>
          <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${isGridCollapsed ? '' : 'rotate-90'}`} />
        </CardHeader>

        {!isGridCollapsed && hasValidIdentity && (
          <CardContent className="p-6 border-t border-border/40 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="text-xs font-bold text-muted-foreground tracking-wider uppercase">
                Select Your Free Hours
              </div>
              
              {/* Mode Switcher Tabs */}
              <div className="inline-flex rounded-xl border border-border bg-card p-1 shadow-xs" role="tablist" aria-label="Input mode">
                <button
                  type="button"
                  role="tab"
                  aria-selected={inputMode === 'grid'}
                  onClick={() => setInputMode('grid')}
                  className={`flex items-center gap-1.5 px-4 min-h-[36px] text-xs sm:text-sm font-bold rounded-lg tracking-tight transition-all cursor-pointer ${
                    inputMode === 'grid'
                      ? 'bg-primary text-primary-foreground shadow-xs border border-primary-foreground/20'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/40 border border-transparent'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Grid
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={inputMode === 'ranges'}
                  onClick={() => setInputMode('ranges')}
                  className={`flex items-center gap-1.5 px-4 min-h-[36px] text-xs sm:text-sm font-bold rounded-lg tracking-tight transition-all cursor-pointer ${
                    inputMode === 'ranges'
                      ? 'bg-primary text-primary-foreground shadow-xs border border-primary-foreground/20'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/40 border border-transparent'
                  }`}
                >
                  <ListPlus className="w-3.5 h-3.5" />
                  Form
                </button>
              </div>
            </div>

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
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-5 border-t border-border/40">
              <div className="text-sm text-muted-foreground font-semibold text-center sm:text-left">
                {slotsUtc.length > 0 ? (
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    {(slotsUtc.length * 0.5).toFixed(1)} hours of availability selected
                  </span>
                ) : (
                  'Click or drag slots on the grid above or tap a 1-tap preset'
                )}
              </div>

              {/* Live Auto-Save Status Badge */}
              <div className="flex items-center gap-2">
                {saveStatus === 'saving' && (
                  <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-bold tracking-tight bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/25 animate-pulse">
                    <CircleDot className="w-4 h-4 text-amber-600 animate-spin" />
                    Auto-saving changes...
                  </span>
                )}

                {saveStatus === 'saved' && (
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-bold tracking-tight bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/25">
                    <Check className="w-4 h-4 text-emerald-600" />
                    Saved to group
                  </span>
                )}

                {saveStatus === 'needs_name' && (
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-bold tracking-tight bg-primary/10 text-primary border border-primary/25">
                    <Cloud className="w-4 h-4 text-primary" />
                    Type your name above to save
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
};
