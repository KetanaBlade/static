import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { POPULAR_TIMEZONES } from '../../lib/constants';
import { detectUserTimezone, getTimezoneAbbreviation } from '../../lib/timezone';
import { GroupMember, SlotIndex } from '../../types';
import { QuickPresets } from './QuickPresets';
import { RangeBuilder } from './RangeBuilder';
import { WeeklyGridPainter } from './WeeklyGridPainter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from '../ui/select';

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

  const prevMemberIdRef = useRef<string | undefined>(currentMember?.id);

  // When switching member or loading member from outside
  useEffect(() => {
    if (currentMember) {
      if (currentMember.id !== prevMemberIdRef.current) {
        prevMemberIdRef.current = currentMember.id;
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
    } else if (prevMemberIdRef.current !== undefined) {
      prevMemberIdRef.current = undefined;
      setName('');
      setSlotsUtc([]);
      lastSavedState.current = {
        name: '',
        timezone: detectUserTimezone(),
        slotsUtc: [],
      };
      setSaveStatus('idle');
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

  // Handle explicit Step 1 identity submission
  const handleIdentitySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      nameInputRef.current?.focus();
      return;
    }
    performSave(trimmedName, timezone, slotsUtc);
    setIsEditingIdentity(false);
  };

  // Debounced Auto-Save trigger for Step 2 Availability Painting
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // Do NOT auto-save while actively editing/typing identity in Step 1!
    if (isEditingIdentity) {
      return;
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      setSaveStatus('needs_name');
      return;
    }

    const hasChanges =
      trimmedName !== lastSavedState.current.name.trim() ||
      timezone !== lastSavedState.current.timezone ||
      !areSlotsEqual(slotsUtc, lastSavedState.current.slotsUtc);

    if (!hasChanges) {
      return;
    }

    setSaveStatus('saving');

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    // Auto-save availability modifications (slots painting) after 300ms debounce
    saveTimerRef.current = setTimeout(() => {
      performSave(trimmedName, timezone, slotsUtc);
    }, 300);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [name, timezone, slotsUtc, isEditingIdentity, performSave]);

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
            <div className="w-9 h-9 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold tracking-tight text-foreground">
                Your Profile {hasValidIdentity && !isEditingIdentity ? `(${name})` : ''}
              </CardTitle>
              <CardDescription className="text-sm font-medium text-muted-foreground mt-0.5">
                Set your name and timezone to get started.
              </CardDescription>
            </div>
          </div>
          <motion.div
            animate={{ rotate: isProfileCollapsed ? 0 : 90 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
          </motion.div>
        </CardHeader>

        <AnimatePresence initial={false}>
          {!isProfileCollapsed && (
            <motion.div
              key="profile-content"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <CardContent className="p-6 border-t border-border/40">
                {hasValidIdentity && !isEditingIdentity ? (
                  /* Compact identity badge when already set */
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-md bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-sm text-foreground flex items-center gap-2">
                          <span>{name}</span>
                          <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded-sm bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                            Active Profile
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground font-medium mt-0.5">
                          Timezone: {timezone} ({tzAbbr})
                        </div>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsEditingIdentity(true);
                      }}
                      className="text-xs font-bold gap-1.5 cursor-pointer h-9 px-3"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Edit Profile
                    </Button>
                  </div>
                ) : (
                  /* Expanded Step 1 Identity Form */
                  <form onSubmit={handleIdentitySubmit} className="space-y-5" onClick={(e) => e.stopPropagation()}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className="text-sm font-bold text-foreground block mb-2">
                          Member Name or Nickname <span className="text-destructive">*</span>
                        </label>
                        <Input
                          ref={nameInputRef}
                          type="text"
                          required
                          autoFocus
                          placeholder="e.g. Alex, Jordan, Sean"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full h-10 text-sm"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm font-bold text-foreground block">
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
                        <Select value={timezone} onValueChange={setTimezone}>
                          <SelectTrigger className="w-full h-10 text-sm">
                            <SelectValue placeholder="Select timezone" />
                          </SelectTrigger>
                          <SelectContent className="max-h-80">
                            {POPULAR_TIMEZONES.map((group) => (
                              <SelectGroup key={group.group}>
                                <SelectLabel>{group.group}</SelectLabel>
                                {group.timezones.map((tz) => (
                                  <SelectItem key={tz.value} value={tz.value}>
                                    {tz.label}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Profile Confirmation Action */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                      <p className="text-xs text-muted-foreground font-medium text-center sm:text-left">
                        {currentMember?.name 
                          ? 'Update your name or timezone, then click Save.' 
                          : 'Enter your name and click Save to unlock your weekly availability schedule.'}
                      </p>
                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        {currentMember?.name && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setName(currentMember.name);
                              setTimezone(currentMember.timezone);
                              setIsEditingIdentity(false);
                            }}
                            className="font-bold h-9 px-4 cursor-pointer text-xs"
                          >
                            Cancel
                          </Button>
                        )}
                        <Button
                          type="submit"
                          size="sm"
                          disabled={!name.trim()}
                          className="font-bold tracking-tight shadow-xs h-9 px-5 cursor-pointer w-full sm:w-auto text-xs"
                        >
                          {currentMember?.name ? 'Save Changes' : 'Save & Continue →'}
                        </Button>
                      </div>
                    </div>
                  </form>
                )}
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* ================= STEP 2: AVAILABILITY CARD ================= */}
      <Card className={`border border-border bg-card shadow-sm transition-all rounded-lg overflow-hidden ${!hasValidIdentity ? 'opacity-50 pointer-events-none' : ''}`}>
        <CardHeader 
          className="p-5 sm:p-6 cursor-pointer hover:bg-muted/30 transition-colors select-none flex flex-row items-center justify-between"
          onClick={() => hasValidIdentity && setIsGridCollapsed(!isGridCollapsed)}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                Member Availability
                {!hasValidIdentity && (
                  <span className="text-[10px] font-bold bg-muted text-muted-foreground px-2 py-0.5 rounded-sm uppercase tracking-wider">Requires Profile</span>
                )}
              </CardTitle>
              <CardDescription className="text-sm font-medium text-muted-foreground mt-0.5">
                Select recurring weekly free hours. Everything translates to your friends' timezones.
              </CardDescription>
            </div>
          </div>
          <motion.div
            animate={{ rotate: isGridCollapsed ? 0 : 90 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
          </motion.div>
        </CardHeader>

        <AnimatePresence initial={false}>
          {!isGridCollapsed && hasValidIdentity && (
            <motion.div
              key="grid-content"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <CardContent className="p-6 border-t border-border/40 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="text-xs font-bold text-muted-foreground tracking-wider uppercase">
                    Select Your Free Hours
                  </div>
                  
                  {/* Mode Switcher Tabs */}
                  <Tabs value={inputMode} onValueChange={(val) => setInputMode(val as 'grid' | 'ranges')}>
                    <TabsList aria-label="Input mode">
                      <TabsTrigger value="grid" className="gap-1.5 px-4 min-h-[36px]">
                        <Calendar className="w-3.5 h-3.5" />
                        Grid
                      </TabsTrigger>
                      <TabsTrigger value="ranges" className="gap-1.5 px-4 min-h-[36px]">
                        <ListPlus className="w-3.5 h-3.5" />
                        Form
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                {/* Quick Presets */}
                <QuickPresets
                  timezone={timezone}
                  currentSlots={slotsUtc}
                  onSlotsChange={setSlotsUtc}
                />

                {/* Active Input Mode with Smooth Fade/Slide */}
                <AnimatePresence mode="wait">
                  {inputMode === 'grid' ? (
                    <motion.div
                      key="grid"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15 }}
                    >
                      <WeeklyGridPainter
                        timezone={timezone}
                        currentSlots={slotsUtc}
                        onSlotsChange={setSlotsUtc}
                        timeFormat={timeFormat}
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="ranges"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15 }}
                    >
                      <RangeBuilder
                        timezone={timezone}
                        currentSlots={slotsUtc}
                        onSlotsChange={setSlotsUtc}
                        timeFormat={timeFormat}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

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
                    <AnimatePresence mode="wait">
                      {saveStatus === 'saving' && (
                        <motion.span
                          key="saving"
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-bold tracking-tight bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/25 animate-pulse"
                        >
                          <CircleDot className="w-4 h-4 text-amber-600 animate-spin" />
                          Auto-saving changes...
                        </motion.span>
                      )}

                      {saveStatus === 'saved' && (
                        <motion.span
                          key="saved"
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-bold tracking-tight bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/25 shadow-xs"
                        >
                          <Check className="w-4 h-4 text-emerald-600" />
                          Saved to group
                        </motion.span>
                      )}

                      {saveStatus === 'needs_name' && (
                        <motion.span
                          key="needs_name"
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-bold tracking-tight bg-primary/10 text-primary border border-primary/25"
                        >
                          <Cloud className="w-4 h-4 text-primary" />
                          Type your name above to save
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </div>
  );
};
