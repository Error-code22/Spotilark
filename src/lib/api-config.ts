export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined' && (window as any).Capacitor) {
    return process.env.NEXT_PUBLIC_API_URL || '';
  }
  return '';
}

export function apiUrl(path: string): string {
  return `${getApiBaseUrl()}${path}`;
}
