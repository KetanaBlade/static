import React, { useState } from 'react';
import { getTimezoneAbbreviation } from '../lib/timezone';
import { GroupMember } from '../types';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Users, UserX, Edit3, ShieldAlert, Crown, Lock, KeyRound, Check, Copy, User } from 'lucide-react';

interface MemberListProps {
  members: GroupMember[];
  currentMemberId?: string | null;
  isCreator: boolean;
  adminPin?: string;
  onEditMember: (member: GroupMember) => void;
  onRemoveMember: (memberId: string) => void;
  selectedMemberId?: string | null;
  onSelectMember: (memberId: string | null) => void;
  onUnlockWithPin?: (pin: string) => boolean;
}

export const MemberList: React.FC<MemberListProps> = ({
  members,
  currentMemberId,
  isCreator,
  adminPin,
  onEditMember,
  onRemoveMember,
  selectedMemberId,
  onSelectMember,
  onUnlockWithPin,
}) => {
  const [memberToRemove, setMemberToRemove] = useState<GroupMember | null>(null);
  const [isPinDialogOpen, setIsPinDialogOpen] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');
  const [pinSuccess, setPinSuccess] = useState<boolean>(false);
  const [copiedPin, setCopiedPin] = useState<boolean>(false);

  const handleCopyPin = () => {
    if (!adminPin) return;
    navigator.clipboard.writeText(adminPin);
    setCopiedPin(true);
    setTimeout(() => setCopiedPin(false), 2000);
  };

  const handleConfirmRemove = () => {
    if (memberToRemove) {
      onRemoveMember(memberToRemove.id);
      setMemberToRemove(null);
    }
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUnlockWithPin) return;

    const success = onUnlockWithPin(pinInput.trim());
    if (success) {
      setPinSuccess(true);
      setPinError('');
      setTimeout(() => {
        setIsPinDialogOpen(false);
        setPinSuccess(false);
        setPinInput('');
      }, 1000);
    } else {
      setPinError('Incorrect 4-digit Admin PIN. Please try again.');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
          <Users className="w-4 h-4 text-primary" />
          Group Members ({members.length})
        </span>

        {/* Organizer PIN Unlock or Creator Status */}
        <div>
          {isCreator ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm font-semibold">
              <Crown className="w-3.5 h-3.5 text-amber-500" />
              <span>Organizer</span>
              {adminPin && (
                <button
                  type="button"
                  onClick={handleCopyPin}
                  title="Click to copy Admin PIN"
                  className="ml-1 px-2 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-900 dark:text-emerald-100 font-mono text-xs flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <span>PIN: <strong className="font-bold">{adminPin}</strong></span>
                  {copiedPin ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 opacity-70" />}
                </button>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setIsPinDialogOpen(true);
                setPinError('');
                setPinInput('');
              }}
              className="text-xs sm:text-sm font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1.5 py-1 px-2.5 rounded-md hover:bg-muted transition-colors cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Organizer Login</span>
            </button>
          )}
        </div>
      </div>

      {members.length === 0 ? (
        <div className="text-sm sm:text-base text-muted-foreground italic p-5 rounded-xl border border-dashed text-center">
          No members yet. Add your name and availability below to get started!
        </div>
      ) : (
        <div className="flex flex-wrap gap-2.5">
          {members.map((member) => {
            const isMe = member.id === currentMemberId;
            const isSelected = selectedMemberId === member.id;
            const tzAbbr = getTimezoneAbbreviation(member.timezone);
            const totalHours = (member.slotsUtc.length * 0.5).toFixed(1);

            return (
              <div
                key={member.id}
                className={`inline-flex items-center gap-2.5 px-3.5 py-2 rounded-xl border text-sm transition-all shadow-xs ${
                  isSelected
                    ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary/20 font-semibold'
                    : 'border-border bg-card hover:border-primary/40 text-foreground'
                }`}
              >
                {/* Clickable name to filter heatmap */}
                <button
                  type="button"
                  onClick={() => onSelectMember(isSelected ? null : member.id)}
                  title={`Click to highlight ${member.name}'s schedule on the heatmap`}
                  className="font-semibold text-foreground hover:text-primary transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <span className="w-6 h-6 rounded-full bg-primary/15 text-primary text-xs font-semibold flex items-center justify-center">
                    {member.name.charAt(0).toUpperCase()}
                  </span>
                  <span>{member.name}</span>
                  {isMe && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded bg-primary/15 text-primary">
                      <User className="w-3 h-3" /> You
                    </span>
                  )}
                </button>

                <span className="text-xs sm:text-sm font-mono font-medium text-muted-foreground tabular-nums">
                  {tzAbbr} • {totalHours}h
                </span>

                {/* Edit Button for current user */}
                {isMe && (
                  <button
                    type="button"
                    onClick={() => onEditMember(member)}
                    title="Edit my availability"
                    aria-label={`Edit availability for ${member.name}`}
                    className="p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Remove Button (Visible to creator or for self) */}
                {(isCreator || isMe) && (
                  <button
                    type="button"
                    onClick={() => setMemberToRemove(member)}
                    title={`Remove ${member.name} from group`}
                    aria-label={`Remove ${member.name} from group`}
                    className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                  >
                    <UserX className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Organizer PIN Unlock Dialog */}
      <Dialog open={isPinDialogOpen} onOpenChange={setIsPinDialogOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handlePinSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
                <KeyRound className="w-5 h-5 text-primary" />
                Organizer PIN Login
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground pt-1">
                Enter this group's 4-digit Admin PIN to unlock organizer controls (like removing members) on this device.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-3">
              <label className="text-sm sm:text-base font-semibold text-foreground block">
                4-Digit Admin PIN
              </label>
              <input
                type="password"
                maxLength={8}
                autoFocus
                required
                placeholder="e.g. 8492"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                className="w-full h-11 px-4 text-center font-mono tracking-widest text-lg font-semibold rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-xs"
              />
              {pinError && (
                <p className="text-sm font-semibold text-destructive">{pinError}</p>
              )}
              {pinSuccess && (
                <p className="text-sm font-semibold text-emerald-600 flex items-center gap-1">
                  <Check className="w-4 h-4" /> Organizer access unlocked!
                </p>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsPinDialogOpen(false)} className="font-semibold">
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={!pinInput.trim()} className="font-semibold">
                Unlock Controls
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for Member Removal */}
      <Dialog open={!!memberToRemove} onOpenChange={(open) => !open && setMemberToRemove(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive font-semibold text-lg">
              <ShieldAlert className="w-5 h-5" />
              Remove Member?
            </DialogTitle>
            <DialogDescription className="text-sm sm:text-base pt-2 text-muted-foreground">
              Are you sure you want to remove <strong className="text-foreground font-semibold">{memberToRemove?.name}</strong> from this group? Their weekly availability will be removed from the overlap heatmap.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setMemberToRemove(null)} className="font-semibold">
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={handleConfirmRemove} className="font-semibold">
              Yes, Remove Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
