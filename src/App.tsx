import React, { useState, useEffect, useRef } from 'react';
import { detectUserTimezone } from './lib/timezone';
import { findOverlappingWindows } from './lib/overlap';
import {
  createGroup,
  fetchGroup,
  saveMemberAvailability,
  removeMemberFromGroup,
  subscribeToGroup,
} from './lib/groupService';
import {
  getSavedUserProfile,
  isGroupCreator,
  saveCreatorToken,
  saveUserProfile,
  unlockCreatorWithPin,
  saveRecentGroup,
  getRecentGroups,
  RecentGroupSummary,
  saveMyMemberId,
  getMyMemberId,
} from './lib/storage/localStorage';
import { Group, GroupMember, SlotIndex } from './types';
import { Header } from './components/Header';
import { MemberList } from './components/MemberList';
import { AvailabilityManager } from './components/AvailabilityInput/AvailabilityManager';
import { GoldenWindowsList } from './components/OverlapSummary/GoldenWindowsList';
import { OverlapHeatmap } from './components/OverlapSummary/OverlapHeatmap';
import { OverlapThresholdFilter } from './components/OverlapSummary/OverlapThresholdFilter';
import { ShareLinkModal } from './components/ShareExport/ShareLinkModal';
import { DiscordExportModal } from './components/ShareExport/DiscordExportModal';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './components/ui/dialog';
import { Sparkles, Layers, KeyRound, ArrowRight, Clock, Users, Globe, Plus } from 'lucide-react';

export const App: React.FC = () => {
  // Theme & Viewer settings - Persistent theme preference
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('static_theme');
      if (saved) return saved === 'dark';
      return false; // Default to clean light mode
    } catch {
      return false;
    }
  });
  const [viewerTimezone, setViewerTimezone] = useState<string>(detectUserTimezone());
  
  // Persistent 12H vs 24H clock format preference
  const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>(() => {
    try {
      const saved = localStorage.getItem('static_time_format');
      if (saved === '12h' || saved === '24h') return saved;
      return '12h';
    } catch {
      return '12h';
    }
  });

  // Sync dark mode class to document
  useEffect(() => {
    try {
      if (isDarkMode) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('static_theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('static_theme', 'light');
      }
    } catch (err) {
      console.error('Failed to save theme preference:', err);
    }
  }, [isDarkMode]);

  const handleTimeFormatToggle = () => {
    const next = timeFormat === '12h' ? '24h' : '12h';
    setTimeFormat(next);
    try {
      localStorage.setItem('static_time_format', next);
    } catch (err) {
      console.error('Failed to save time format preference:', err);
    }
  };
  
  // Group state
  const [group, setGroup] = useState<Group | null>(null);
  const [isLoadingGroup, setIsLoadingGroup] = useState<boolean>(true);
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null);
  const [selectedFilterMemberId, setSelectedFilterMemberId] = useState<string | null>(null);
  const [editingMember, setEditingMember] = useState<GroupMember | undefined>(undefined);
  const [recentGroups, setRecentGroups] = useState<RecentGroupSummary[]>([]);

  // Filters & Modals
  const [minRatioFilter, setMinRatioFilter] = useState<number>(1.0);
  const [minDurationMinutes, setMinDurationMinutes] = useState<number>(120);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [isDiscordModalOpen, setIsDiscordModalOpen] = useState<boolean>(false);
  const [isNewGroupModalOpen, setIsNewGroupModalOpen] = useState<boolean>(false);
  const [newGroupNameInput, setNewGroupNameInput] = useState<string>('');
  const [newGroupPinInput, setNewGroupPinInput] = useState<string>(() =>
    Math.floor(1000 + Math.random() * 9000).toString()
  );

  // Force re-render on unlock
  const [, setAuthTick] = useState<number>(0);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Helper to resolve the user's member ID in a loaded group
  const resolveCurrentMember = (loadedGroup: Group) => {
    const savedUser = getSavedUserProfile();
    const storedMemberId = getMyMemberId(loadedGroup.id);

    const matchingMember = loadedGroup.members.find(
      (m) =>
        m.id === storedMemberId ||
        (savedUser?.name && m.name.toLowerCase() === savedUser.name.toLowerCase())
    );

    if (matchingMember) {
      setCurrentMemberId(matchingMember.id);
      saveMyMemberId(loadedGroup.id, matchingMember.id);
    }
  };

  // Load Group on Mount from ?g=<groupId>
  const loadGroupFromUrl = async () => {
    setIsLoadingGroup(true);
    const urlParams = new URLSearchParams(window.location.search);
    const groupId = urlParams.get('g');

    if (groupId) {
      try {
        const cloudGroup = await fetchGroup(groupId);
        if (cloudGroup) {
          setGroup(cloudGroup);
          saveRecentGroup(cloudGroup.id, cloudGroup.name);
          resolveCurrentMember(cloudGroup);

          // Subscribe to live WebSocket changes
          if (unsubscribeRef.current) unsubscribeRef.current();
          unsubscribeRef.current = subscribeToGroup(cloudGroup.id, (updated) => {
            setGroup(updated);
            resolveCurrentMember(updated);
          });
          setIsLoadingGroup(false);
          return;
        }
      } catch (err) {
        console.warn('Could not fetch cloud group:', err);
      }
    }

    // No group in URL -> Show landing screen
    setGroup(null);
    setIsLoadingGroup(false);
    setRecentGroups(getRecentGroups());
  };

  useEffect(() => {
    loadGroupFromUrl();

    const savedUser = getSavedUserProfile();
    if (savedUser) {
      setViewerTimezone(savedUser.timezone);
    }

    // Listen for browser popstate back/forward
    const handlePopState = () => {
      loadGroupFromUrl();
    };
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (unsubscribeRef.current) unsubscribeRef.current();
    };
  }, []);

  // Toggle Dark Mode
  const handleToggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
  };

  // Save / Add Member
  const handleSaveMember = async (name: string, timezone: string, slotsUtc: SlotIndex[]) => {
    if (!group) return;

    saveUserProfile({ name, timezone });
    setViewerTimezone(timezone);

    const now = new Date().toISOString();
    const existingIndex = group.members.findIndex(
      (m) => m.id === currentMemberId || m.name.toLowerCase() === name.toLowerCase()
    );

    const targetMemberId = existingIndex >= 0 ? group.members[existingIndex].id : `member-${Date.now()}`;
    const targetMember: GroupMember = {
      id: targetMemberId,
      name,
      timezone,
      slotsUtc,
      createdAt: existingIndex >= 0 ? group.members[existingIndex].createdAt : now,
      updatedAt: now,
    };

    setCurrentMemberId(targetMember.id);
    saveMyMemberId(group.id, targetMember.id);
    setEditingMember(undefined);

    // Optimistically update local state immediately
    const updatedMembers = [...group.members];
    if (existingIndex >= 0) {
      updatedMembers[existingIndex] = targetMember;
    } else {
      updatedMembers.push(targetMember);
    }
    const updatedGroup = { ...group, members: updatedMembers, updatedAt: now };
    setGroup(updatedGroup);

    // Sync to Supabase Cloud
    try {
      const synced = await saveMemberAvailability(group.id, targetMember);
      if (synced) {
        setGroup(synced);
        resolveCurrentMember(synced);
      }
    } catch (err) {
      console.error('Failed to sync availability to cloud:', err);
    }
  };

  // Remove Member
  const handleRemoveMember = async (memberId: string) => {
    if (!group) return;

    const updatedMembers = group.members.filter((m) => m.id !== memberId);
    if (currentMemberId === memberId) {
      setCurrentMemberId(null);
      setEditingMember(undefined);
    }
    const updatedGroup = { ...group, members: updatedMembers, updatedAt: new Date().toISOString() };
    setGroup(updatedGroup);

    // Sync removal to Supabase Cloud
    try {
      const synced = await removeMemberFromGroup(group.id, memberId);
      if (synced) setGroup(synced);
    } catch (err) {
      console.error('Failed to remove member from cloud:', err);
    }
  };

  // Create New Group
  const handleCreateNewGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupNameInput.trim()) return;

    const pin = newGroupPinInput.trim() || Math.floor(1000 + Math.random() * 9000).toString();

    try {
      const newGroup = await createGroup(newGroupNameInput.trim(), pin);
      saveCreatorToken(newGroup.id, newGroup.creatorToken || '');
      saveRecentGroup(newGroup.id, newGroup.name);
      setGroup(newGroup);

      // Clean permanent URL
      const newUrl = `${window.location.origin}${window.location.pathname}?g=${newGroup.id}`;
      window.history.pushState(null, '', newUrl);

      // Subscribe to real-time updates for this new group
      if (unsubscribeRef.current) unsubscribeRef.current();
      unsubscribeRef.current = subscribeToGroup(newGroup.id, (updated) => {
        setGroup(updated);
        resolveCurrentMember(updated);
      });

      setCurrentMemberId(null);
      setEditingMember(undefined);
      setIsNewGroupModalOpen(false);
      setNewGroupNameInput('');
      setNewGroupPinInput(Math.floor(1000 + Math.random() * 9000).toString());
    } catch (err) {
      console.error('Failed to create group in cloud:', err);
      alert('Could not create group. Please check database connection.');
    }
  };

  const handleUnlockWithPin = (enteredPin: string): boolean => {
    if (!group) return false;
    const success = unlockCreatorWithPin(group, enteredPin);
    if (success) {
      setAuthTick((prev) => prev + 1);
    }
    return success;
  };

  // Calculate Overlapping Windows
  const overlappingWindows = React.useMemo(() => {
    if (!group || group.members.length === 0) return [];
    return findOverlappingWindows(group.members, viewerTimezone, {
      ...group.settings,
      timeFormat,
      minDurationMinutes,
    });
  }, [group, viewerTimezone, timeFormat, minDurationMinutes]);

  const isCreator = group ? isGroupCreator(group.id, group.creatorToken) : false;
  const currentMember = group?.members.find((m) => m.id === currentMemberId) || editingMember;

  const cleanShareUrl = group
    ? `${window.location.origin}${window.location.pathname}?g=${group.id}`
    : window.location.href;

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-primary/20">
      {/* Navigation Header */}
      <Header
        groupName={group ? group.name : 'Hangout Scheduler'}
        timeFormat={timeFormat}
        onTimeFormatToggle={handleTimeFormatToggle}
        isDarkMode={isDarkMode}
        onDarkModeToggle={handleToggleDarkMode}
        onOpenShareModal={() => setIsShareModalOpen(true)}
        onOpenDiscordModal={() => setIsDiscordModalOpen(true)}
        onNewGroup={() => setIsNewGroupModalOpen(true)}
      />

      {/* Main Content Dashboard */}
      <main className="flex-1 container mx-auto max-w-5xl px-4 py-8">
        {isLoadingGroup ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            <p className="text-sm font-semibold text-muted-foreground">Connecting to Live Group...</p>
          </div>
        ) : !group ? (
          /* ================= ROOT LANDING SCREEN ================= */
          <div className="max-w-2xl mx-auto py-8 sm:py-16 space-y-8">
            {/* Hero */}
            <div className="text-center space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                <Sparkles className="w-3.5 h-3.5" />
                Zero-Friction Weekly Scheduling
              </div>
              <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight text-foreground">
                Find the perfect hangout window across any timezone.
              </h1>
              <p className="text-base sm:text-lg text-muted-foreground max-w-lg mx-auto leading-relaxed">
                Zero logins, zero passwords. Create a group, paint your free hours, and share the live link with your friends.
              </p>
            </div>

            {/* Feature Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
              <div className="p-4 rounded-xl bg-card border border-border/80 shadow-xs space-y-1">
                <Globe className="w-5 h-5 text-primary mx-auto" />
                <div className="text-sm font-semibold text-foreground">Timezone Magic</div>
                <div className="text-xs text-muted-foreground">Seamless UTC conversions across US & Europe</div>
              </div>
              <div className="p-4 rounded-xl bg-card border border-border/80 shadow-xs space-y-1">
                <Users className="w-5 h-5 text-emerald-600 mx-auto" />
                <div className="text-sm font-semibold text-foreground">Zero Sign-ups</div>
                <div className="text-xs text-muted-foreground">Share the link and start painting instantly</div>
              </div>
              <div className="p-4 rounded-xl bg-card border border-border/80 shadow-xs space-y-1">
                <Clock className="w-5 h-5 text-indigo-500 mx-auto" />
                <div className="text-sm font-semibold text-foreground">Discord Ready</div>
                <div className="text-xs text-muted-foreground">1-click dynamic Unix timestamp copy</div>
              </div>
            </div>

            {/* Quick Create Group Card */}
            <Card className="border-border bg-card shadow-sm">
              <CardHeader className="p-6 pb-3">
                <CardTitle className="text-xl font-semibold text-foreground flex items-center gap-2">
                  <Plus className="w-5 h-5 text-primary" />
                  Create a New Group
                </CardTitle>
                <CardDescription className="text-sm text-muted-foreground">
                  Give your group a name and choose an optional 4-digit Admin PIN to manage members.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 pt-2">
                <form onSubmit={handleCreateNewGroup} className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold text-foreground block mb-1.5">
                      Group Name <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Arcadion, Weekend Gaming, Book Club"
                      value={newGroupNameInput}
                      onChange={(e) => setNewGroupNameInput(e.target.value)}
                      className="w-full h-12 px-4 rounded-xl border border-border bg-background text-base font-medium focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-xs"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-foreground block mb-1.5 flex items-center gap-1.5">
                      <KeyRound className="w-4 h-4 text-primary" />
                      Organizer 4-Digit Admin PIN
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      placeholder="4-digit PIN"
                      value={newGroupPinInput}
                      onChange={(e) => setNewGroupPinInput(e.target.value)}
                      className="w-full h-11 px-4 rounded-xl border border-border bg-background font-mono text-sm font-semibold tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-xs"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Save this PIN to manage members from other devices.
                    </p>
                  </div>

                  <Button
                    type="submit"
                    disabled={!newGroupNameInput.trim() || !newGroupPinInput.trim()}
                    className="w-full h-12 text-base font-semibold shadow-md cursor-pointer"
                  >
                    Create Live Group Schedule <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Recent Groups List */}
            {recentGroups.length > 0 && (
              <div className="space-y-2.5">
                <div className="text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-primary" />
                  Your Recent Groups on this Device:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {recentGroups.map((rg) => (
                    <a
                      key={rg.id}
                      href={`?g=${rg.id}`}
                      className="p-3.5 rounded-xl border border-border bg-card hover:border-primary/50 hover:bg-primary/[0.02] flex items-center justify-between transition-all shadow-xs group"
                    >
                      <div className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors truncate">
                        {rg.name}
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-0.5" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ================= ACTIVE GROUP DASHBOARD ================= */
          <div className="space-y-8">
            {/* Group Header & Member List Strip */}
            <div className="rounded-2xl border border-border bg-card p-6 sm:p-7 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
                    {group.name}
                  </h1>
                  <p className="text-base text-muted-foreground mt-1">
                    Find recurring weekly meeting windows where everyone's schedule overlaps.
                  </p>
                </div>
              </div>

              <MemberList
                members={group.members}
                currentMemberId={currentMemberId}
                isCreator={isCreator}
                adminPin={group.adminPin}
                onEditMember={(m) => {
                  setEditingMember(m);
                  setCurrentMemberId(m.id);
                  saveMyMemberId(group.id, m.id);
                  // Smooth scroll up to editor
                  window.scrollTo({ top: 180, behavior: 'smooth' });
                }}
                onRemoveMember={handleRemoveMember}
                selectedMemberId={selectedFilterMemberId}
                onSelectMember={setSelectedFilterMemberId}
                onUnlockWithPin={handleUnlockWithPin}
              />
            </div>

            {/* SECTION 1: TOP ENTRY (Your Weekly Availability) */}
            <section aria-labelledby="section-availability">
              <AvailabilityManager
                key={currentMember?.id || 'new'}
                currentMember={currentMember}
                onSaveMember={handleSaveMember}
                timeFormat={timeFormat}
              />
            </section>

            {/* SECTION 2: RESULTS & GROUP OVERLAP */}
            <section aria-labelledby="section-results" className="space-y-6 pt-4 border-t border-border">
              <div>
                <h2 className="text-xl sm:text-2xl font-semibold text-foreground flex items-center gap-2.5">
                  <Layers className="w-5 h-5 text-primary" />
                  Group Overlap Results
                </h2>
                <p className="text-base text-muted-foreground mt-1">
                  The optimal meeting windows where members' schedules align across timezones.
                </p>
              </div>

              {/* Filter & Threshold Bar with Timezone Selector */}
              <OverlapThresholdFilter
                viewerTimezone={viewerTimezone}
                onTimezoneChange={setViewerTimezone}
                minRatio={minRatioFilter}
                onMinRatioChange={setMinRatioFilter}
                minDurationMinutes={minDurationMinutes}
                onMinDurationChange={setMinDurationMinutes}
              />

              {/* Ranked Best Hangout Times (Large, Scannable Cards) */}
              <GoldenWindowsList
                windows={overlappingWindows}
                groupName={group.name}
                viewerTimezone={viewerTimezone}
                minRatioFilter={minRatioFilter}
              />

              {/* Master Visual Heatmap */}
              <div className="pt-4">
                <OverlapHeatmap
                  members={group.members}
                  viewerTimezone={viewerTimezone}
                  timeFormat={timeFormat}
                  highlightedMemberId={selectedFilterMemberId}
                />
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Modals */}
      {group && (
        <>
          <ShareLinkModal
            isOpen={isShareModalOpen}
            onClose={() => setIsShareModalOpen(false)}
            groupName={group.name}
            shareUrl={cleanShareUrl}
            adminPin={group.adminPin}
          />

          <DiscordExportModal
            isOpen={isDiscordModalOpen}
            onClose={() => setIsDiscordModalOpen(false)}
            groupName={group.name}
            windows={overlappingWindows}
            shareUrl={cleanShareUrl}
          />
        </>
      )}

      {/* Create New Group Modal */}
      <Dialog open={isNewGroupModalOpen} onOpenChange={setIsNewGroupModalOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleCreateNewGroup}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
                <Sparkles className="w-5 h-5 text-primary" />
                Create New Group Schedule
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground pt-1">
                Name your group and choose a 4-digit Admin PIN to manage members.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4">
              <div>
                <label className="text-sm font-semibold text-foreground block mb-1.5">
                  Group Name <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Arcadion"
                  value={newGroupNameInput}
                  onChange={(e) => setNewGroupNameInput(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-lg border border-border bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground block mb-1.5 flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-primary" />
                  Organizer 4-Digit Admin PIN
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  placeholder="4-digit PIN"
                  value={newGroupPinInput}
                  onChange={(e) => setNewGroupPinInput(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-lg border border-border bg-background font-mono text-sm font-semibold tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Save this PIN to moderate members if you open the link on another device.
                </p>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsNewGroupModalOpen(false)} className="font-semibold">
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={!newGroupNameInput.trim() || !newGroupPinInput.trim()} className="font-semibold">
                Create Live Group
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
