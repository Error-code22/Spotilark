export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined' && window.location.protocol === 'capacitor:') {
    return process.env.NEXT_PUBLIC_API_URL || 'https://web-production-e0831.up.railway.app';
  }
  return '';
}
