import type { AssetType } from '../types';

/**
 * Standard business display order for ARCO Workplace IT asset types.
 *
 * Requirements:
 * 1. Laptop
 * 2. Monitor
 * 3. Keyboard
 * 4. Mouse
 * 5. Headphone / Headset
 * 6. HDMI Cable
 * (HDMI must NEVER be shown first)
 */
export const ASSET_TYPE_ORDER: string[] = [
  'laptop',
  'monitor',
  'keyboard',
  'mouse',
  'headphone',
  'headset',
  'hdmi cable',
  'hdmi',
  'docking station',
  'desktop',
  'printer',
  'ups & power',
  'furniture',
  'facilities',
  'mobile & tablet',
  'server & networking',
  'other',
];

/**
 * Get the ordering priority index for a given asset type name.
 */
export function getAssetTypePriority(name: string): number {
  if (!name) return 999;
  const lower = name.toLowerCase().trim();
  for (let i = 0; i < ASSET_TYPE_ORDER.length; i++) {
    const key = ASSET_TYPE_ORDER[i];
    if (lower === key || lower.includes(key)) {
      return i;
    }
  }
  return 999;
}

/**
 * Sorts an array of AssetType objects in accordance with the ARCO Workplace business display order.
 */
export function sortAssetTypes(types: AssetType[]): AssetType[] {
  if (!Array.isArray(types)) return [];
  return [...types].sort((a, b) => {
    const priorityA = getAssetTypePriority(a.name);
    const priorityB = getAssetTypePriority(b.name);
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    return a.name.localeCompare(b.name);
  });
}
