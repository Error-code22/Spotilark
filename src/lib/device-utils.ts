import { Capacitor } from '@capacitor/core';
import { Device } from '@capacitor/device';

export type DeviceType = 'web' | 'desktop' | 'mobile';

export interface DeviceInfo {
    name: string;
    type: DeviceType;
}

export async function getDeviceInfo(): Promise<DeviceInfo> {
    const isNative = Capacitor.isNativePlatform();
    const isTauri = typeof window !== 'undefined' && (window as any).__TAURI__ !== undefined;

    let name = 'Unknown Device';
    let type: DeviceType = 'web';

    if (isNative) {
        const info = await Device.getInfo();
        const id = await Device.getId();
        name = `${info.model} (${info.operatingSystem})`;
        type = 'mobile';
    } else if (isTauri) {
        // In Tauri, we could fetch hostname via rust, but for now:
        name = `Desktop (${navigator.platform})`;
        type = 'desktop';
    } else {
        // Web
        const browser = getBrowserName();
        name = `${browser} on ${navigator.platform}`;
        type = 'web';
    }

    return { name, type };
}

function getBrowserName() {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('SamsungBrowser')) return 'Samsung Browser';
    if (userAgent.includes('Opera') || userAgent.includes('OPR')) return 'Opera';
    if (userAgent.includes('Edge')) return 'Edge';
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Safari')) return 'Safari';
    return 'Web Browser';
}

export function getDeviceId(): string {
    if (typeof window === 'undefined') return '';

    let id = localStorage.getItem('spotilark_device_id');
    if (!id) {
        id = generateUUID();
        localStorage.setItem('spotilark_device_id', id);
    }
    return id;
}

function generateUUID(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // Fallback for non-secure contexts or older browsers
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}
