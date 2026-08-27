import { Group } from '../../types';

const STORAGE_KEYS = {
  USER_PROFILE: 'static_user_profile',
  CREATOR_TOKENS: 'static_creator_tokens',
  RECENT_GROUPS: 'static_recent_groups',
  GROUP_MEMBERS: 'static_group_members', // Map of groupId -> memberId
  THEME: 'static_theme',
  TIME_FORMAT: 'static_time_format',
};

export interface UserProfile {
  name: string;
  timezone: string;
}

export interface RecentGroupSummary {
  id: string;
  name: string;
  lastVisited: string;
}

export function getSavedUserProfile(): UserProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveUserProfile(profile: UserProfile): void {
  try {
    localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
  } catch (err) {
    console.error('Failed to save user profile:', err);
  }
}

export function saveCreatorToken(groupId: string, token: string): void {
  try {
    const tokens = getCreatorTokens();
    tokens[groupId] = token;
    localStorage.setItem(STORAGE_KEYS.CREATOR_TOKENS, JSON.stringify(tokens));
  } catch (err) {
    console.error('Failed to save creator token:', err);
  }
}

export function getCreatorTokens(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CREATOR_TOKENS);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function isGroupCreator(groupId: string, groupCreatorToken?: string): boolean {
  if (!groupCreatorToken) return false;
  const tokens = getCreatorTokens();
  return tokens[groupId] === groupCreatorToken;
}

export function unlockCreatorWithPin(group: Group, enteredPin: string): boolean {
  if (!group.adminPin || !enteredPin) return false;
  if (group.adminPin.trim() === enteredPin.trim()) {
    if (group.creatorToken) {
      saveCreatorToken(group.id, group.creatorToken);
    }
    return true;
  }
  return false;
}

export function saveRecentGroup(groupId: string, name: string): void {
  try {
    const recents = getRecentGroups().filter((g) => g.id !== groupId);
    recents.unshift({
      id: groupId,
      name,
      lastVisited: new Date().toISOString(),
    });
    localStorage.setItem(STORAGE_KEYS.RECENT_GROUPS, JSON.stringify(recents.slice(0, 8)));
  } catch (err) {
    console.error('Failed to save recent group:', err);
  }
}

export function getRecentGroups(): RecentGroupSummary[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RECENT_GROUPS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Saves which member ID belongs to the current user in a specific group
 */
export function saveMyMemberId(groupId: string, memberId: string): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.GROUP_MEMBERS);
    const map = raw ? JSON.parse(raw) : {};
    map[groupId] = memberId;
    localStorage.setItem(STORAGE_KEYS.GROUP_MEMBERS, JSON.stringify(map));
  } catch (err) {
    console.error('Failed to save group member id:', err);
  }
}

/**
 * Retrieves the member ID for the current user in a specific group
 */
export function getMyMemberId(groupId: string): string | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.GROUP_MEMBERS);
    if (!raw) return null;
    const map = JSON.parse(raw);
    return map[groupId] || null;
  } catch {
    return null;
  }
}
