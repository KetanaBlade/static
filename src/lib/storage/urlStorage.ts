import LZString from 'lz-string';
import { Group } from '../../types';

/**
 * Encodes a Group object into a safe, compact URL hash string
 */
export function encodeGroupToUrl(group: Group): string {
  try {
    const jsonStr = JSON.stringify(group);
    return LZString.compressToEncodedURIComponent(jsonStr);
  } catch (err) {
    console.error('Failed to encode group state to URL:', err);
    return '';
  }
}

/**
 * Decodes a compressed URL hash string into a Group object
 */
export function decodeGroupFromUrl(encoded: string): Group | null {
  if (!encoded) return null;
  try {
    const decompressed = LZString.decompressFromEncodedURIComponent(encoded);
    if (!decompressed) return null;
    return JSON.parse(decompressed) as Group;
  } catch (err) {
    console.error('Failed to decode group state from URL:', err);
    return null;
  }
}
