/**
 * Media and attachment utility functions for ARCO Workplace.
 * Handles normalization and resolution of file and image URLs across local development and production.
 */

export function resolveMediaUrl(url?: string | null): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  // Already a full or special URL (blob, data, http, https)
  if (
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://')
  ) {
    return trimmed;
  }

  // Normalize path
  const normalized = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;

  // If it already starts with /media/, return as-is (Vite proxies /media to Django)
  if (normalized.startsWith('/media/')) {
    return normalized;
  }

  // Prepend /media/
  return `/media${normalized}`;
}

export function isImageFile(filenameOrUrl?: string | null): boolean {
  if (!filenameOrUrl) return false;
  const clean = filenameOrUrl.split('?')[0].toLowerCase();
  return (
    clean.endsWith('.jpg') ||
    clean.endsWith('.jpeg') ||
    clean.endsWith('.png') ||
    clean.endsWith('.webp') ||
    clean.endsWith('.gif') ||
    clean.endsWith('.svg')
  );
}

export function isPdfFile(filenameOrUrl?: string | null): boolean {
  if (!filenameOrUrl) return false;
  const clean = filenameOrUrl.split('?')[0].toLowerCase();
  return clean.endsWith('.pdf');
}

export function getFilenameFromUrl(url?: string | null, fallback = 'Receipt Document'): string {
  if (!url) return fallback;
  try {
    const clean = url.split('?')[0];
    const parts = clean.split('/');
    const last = parts[parts.length - 1];
    return decodeURIComponent(last) || fallback;
  } catch {
    return fallback;
  }
}
