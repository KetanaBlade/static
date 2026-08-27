import { Group } from '../../types';

const STORAGE_KEYS = {
  USER_PROFILE: 'syncsquad_user_profile',
  CREATOR_TOKENS: 'syncsquad_creator_tokens',
  RECENT_GROUPS: 'syncsquad_recent_groups',
};

export interface UserProfile {
  name: string;
  timezone: string;
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
