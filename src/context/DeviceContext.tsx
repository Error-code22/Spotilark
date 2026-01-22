"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getDeviceInfo, getDeviceId, DeviceType } from '@/lib/device-utils';
import type { Track } from '@/lib/data';

interface Device {
    id: string;
    name: string;
    type: DeviceType;
    is_active: boolean;
    last_seen: string;
    current_track_json: Track | null;
    position_ms: number;
    is_playing: boolean;
    volume: number;
    queue_ids: string[];
}

interface DeviceContextType {
    devices: Device[];
    currentDevice: Device | null;
    activePlayerDevice: Device | null;
    registerDevice: () => Promise<void>;
    activateDevice: () => Promise<void>;
    updatePlaybackState: (state: Partial<Device>) => Promise<void>;
    transferPlayback: (targetDeviceId: string) => Promise<void>;
    sendCommand: (targetDeviceId: string, command: DeviceCommand) => Promise<void>;
    isDevicesMenuOpen: boolean;
    setIsDevicesMenuOpen: (open: boolean) => void;
}

export type DeviceCommand =
    | { type: 'PLAY_PAUSE'; value?: boolean }
    | { type: 'SEEK'; value: number }
    | { type: 'SKIP'; value: 'next' | 'prev' }
    | { type: 'VOLUME'; value: number }
    | { type: 'SET_TRACK'; value: Track };

const DeviceContext = createContext<DeviceContextType | undefined>(undefined);

export const DeviceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [devices, setDevices] = useState<Device[]>([]);
    const [isDevicesMenuOpen, setIsDevicesMenuOpen] = useState(false);
    const [user, setUser] = useState<any>(null);
    const supabase = createClient();

    // Safety check for broken localStorage sessions which cause "Cannot create property 'user' on string"
    useEffect(() => {
        if (typeof window === 'undefined') return;
        (window as any).__SPOTILARK_DEVICE_VERSION__ = "1.4.0";
        try {
            const keys = Object.keys(localStorage);
            for (const key of keys) {
                if (key.includes('supabase.auth.token')) {
                    const val = localStorage.getItem(key);
                    if (val && val.startsWith('"') && val.endsWith('"')) {
                        console.warn('Fixing double-encoded Supabase session...');
                        localStorage.setItem(key, JSON.parse(val));
                    }
                }
            }
        } catch (e) {
            console.error('Failed to sanitize localStorage:', e);
        }
    }, []);

    console.log("%c --- Spotilark Device Engine V1.5.0 --- ", "background: #7c3aed; color: #fff; font-weight: bold; padding: 4px 8px; border-radius: 4px;");
    const deviceId = getDeviceId();

    const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);

    const registerDevice = useCallback(async () => {
        try {
            const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
            if (authError || !currentUser) return;

            const info = await getDeviceInfo();
            const currentId = getDeviceId();

            // Check for active devices that have been seen RECENTLY (last 2 minutes)
            const twoMinutesAgo = new Date(Date.now() - 120000).toISOString();
            const { data: activeDevices } = await supabase
                .from('devices')
                .select('id, last_seen')
                .eq('user_id', currentUser.id)
                .eq('is_active', true)
                .gt('last_seen', twoMinutesAgo);

            const shouldBeActive = !activeDevices || activeDevices.length === 0 || activeDevices.some(d => d.id === currentId);

            const { error } = await supabase
                .from('devices')
                .upsert({
                    id: currentId,
                    user_id: currentUser.id,
                    name: info.name,
                    type: info.type,
                    last_seen: new Date().toISOString(),
                    is_active: shouldBeActive
                }, { onConflict: 'id' });

            if (error) {
                if (error.code === '42501' || error.message?.includes('permission denied')) {
                    console.warn('Device ID conflict detected. Generating fresh ID and retrying...');
                    localStorage.removeItem('spotilark_device_id');
                    setTimeout(registerDevice, 500);
                    return;
                }
                console.group('Spotilark Device Registration Failed');
                console.error('Message:', error.message);
                console.error('Code:', error.code);
                console.groupEnd();
            } else {
                console.log('Device registered successfully:', info.name, shouldBeActive ? '(ACTIVE)' : '(SLEEP)');
                sendHeartbeat(); // Immediate heartbeat after registration
            }
        } catch (err) {
            console.error('Critical error during device registration:', err);
        }
    }, [supabase]);

    const updatePlaybackState = useCallback(async (state: Partial<Device>) => {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (!currentUser) return;

        await supabase
            .from('devices')
            .update({
                ...state,
                last_seen: new Date().toISOString()
            })
            .eq('id', deviceId);
    }, [deviceId, supabase]);

    const currentDevice = devices.find(d => d.id === deviceId) || null;

    // activePlayerDevice must be both is_active AND recently seen
    const activePlayerDevice = devices.find(d => {
        if (!d.is_active) return false;
        const lastSeen = new Date(d.last_seen).getTime();
        return (Date.now() - lastSeen) < 300000; // 5 mins
    }) || null;

    const activateDevice = async () => {
        if (!user) return;
        // 1. Deactivate all other devices for this user
        await supabase
            .from('devices')
            .update({ is_active: false })
            .eq('user_id', user.id);

        // 2. Activate this device
        await supabase
            .from('devices')
            .update({ is_active: true })
            .eq('id', deviceId);

        console.log('--- Playback Takeover: This device is now ACTIVE ---');
    };

    const transferPlayback = async (targetDeviceId: string) => {
        if (!user || !currentDevice) return;
        await supabase.from('devices').update({ is_active: false }).eq('id', deviceId);
        await supabase.from('devices').update({
            is_active: true,
            current_track_json: currentDevice.current_track_json,
            position_ms: currentDevice.position_ms,
            is_playing: currentDevice.is_playing,
            volume: currentDevice.volume,
            queue_ids: currentDevice.queue_ids
        }).eq('id', targetDeviceId);
    };

    const sendCommand = async (targetDeviceId: string, command: DeviceCommand) => {
        if (!user) return;
        let update: any = {};
        switch (command.type) {
            case 'PLAY_PAUSE': update.is_playing = command.value; break;
            case 'SEEK': update.position_ms = command.value; break;
            case 'VOLUME': update.volume = command.value; break;
            case 'SET_TRACK': update.current_track_json = command.value; break;
            case 'SKIP':
                update.current_track_json = { ...currentDevice?.current_track_json, _command: command };
                break;
        }
        await supabase.from('devices').update(update).eq('id', targetDeviceId);
    };

    useEffect(() => {
        const initAuth = async () => {
            try {
                const { data: { user }, error } = await supabase.auth.getUser();
                if (!error && user) {
                    setUser(user);
                    registerDevice(); // Ensure registration on load
                }
            } catch (e) {
                console.error('Session corruption detected. Clearing auth storage...');
                // If it's the "Cannot create property 'user' on string" error, 
                // we need to clear the offending storage key.
                const storageKey = Object.keys(localStorage).find(k => k.includes('auth-token'));
                if (storageKey) localStorage.removeItem(storageKey);
                window.location.reload();
            }
        };

        initAuth();

        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            try {
                setUser(session?.user ?? null);
                if (session?.user) registerDevice();
            } catch (e) {
                console.error('Auth state change error handled:', e);
            }
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, [registerDevice, supabase.auth]);

    // Fetch and Subscribe to Devices
    useEffect(() => {
        if (!user || !isDevicesMenuOpen) return;

        const fetchDevices = async () => {
            const { data } = await supabase
                .from('devices')
                .select('*')
                .eq('user_id', user.id)
                .order('last_seen', { ascending: false });

            if (data) {
                setDevices(data);
                console.log(`Devices Sync: Found ${data.length} registered devices.`);
            }
        };

        fetchDevices();

        const channel = supabase
            .channel('devices_sync')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'devices',
                filter: `user_id=eq.${user.id}`
            }, (payload) => {
                fetchDevices();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, isDevicesMenuOpen]);

    const sendHeartbeat = useCallback(() => {
        if (!user) return;
        supabase
            .from('devices')
            .update({ last_seen: new Date().toISOString() })
            .eq('id', deviceId)
            .then(({ error }) => {
                if (error && error.code === 'PGRST116') {
                    registerDevice();
                }
            });
    }, [user, deviceId, registerDevice, supabase]);

    // Heartbeat Logic - keeps device 'online' in the DB
    useEffect(() => {
        if (!user) return;

        const interval = setInterval(() => {
            if (isDevicesMenuOpen || currentDevice?.is_active) {
                sendHeartbeat();
            }
        }, 30000);

        return () => clearInterval(interval);
    }, [user, isDevicesMenuOpen, currentDevice?.is_active, sendHeartbeat]);

    const onlineDevices = devices.filter(d => {
        const lastSeen = new Date(d.last_seen).getTime();
        const now = Date.now();
        // Allow up to 10 minutes for extreme robustness against clock drift/sleep modes
        const diff = Math.abs(now - lastSeen);
        return diff < 600000;
    });

    return (
        <DeviceContext.Provider value={{
            devices: onlineDevices,
            currentDevice,
            activePlayerDevice,
            registerDevice,
            activateDevice,
            updatePlaybackState,
            transferPlayback,
            sendCommand,
            isDevicesMenuOpen,
            setIsDevicesMenuOpen
        }}>
            {children}
        </DeviceContext.Provider>
    );
};

export const useDevices = () => {
    const context = useContext(DeviceContext);
    if (!context) throw new Error('useDevices must be used within a DeviceProvider');
    return context;
};
