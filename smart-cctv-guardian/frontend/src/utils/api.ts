/**
 * Dynamic API Base URL resolver for cross-platform support:
 * - Local PC Browser (localhost:5173)
 * - Mobile Phone Browser & PWA (e.g. 192.168.x.x:5173)
 * - Electron Desktop Application
 */

export function getApiBase(): string {
  if (typeof window === 'undefined') {
    return 'http://localhost:8000';
  }
  const hostname = window.location.hostname || 'localhost';
  return `http://${hostname}:8000`;
}

export function getApiUrl(path: string): string {
  const base = getApiBase();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
}
