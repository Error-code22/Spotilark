'use client';

import { useEffect, useState } from 'react';
import { check } from '@tauri-apps/plugin-updater';
import { ask, message } from '@tauri-apps/plugin-dialog';
import { relaunch } from '@tauri-apps/plugin-process';

export function TauriUpdater() {
    useEffect(() => {
        // Only run if we are in a Tauri environment
        if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
            checkForUpdates();
        }
    }, []);

    const checkForUpdates = async () => {
        try {
            console.log('[Updater] Checking for updates...');
            const update = await check();

            if (update) {
                console.log(`[Updater] Update available: ${update.version} from ${update.date}`);

                const shouldInstall = await ask(
                    `A new version (${update.version}) of Spotilark is available. Would you like to download and install it now?`,
                    {
                        title: 'Update Available',
                        kind: 'info',
                        okLabel: 'Update Now',
                        cancelLabel: 'Later'
                    }
                );

                if (shouldInstall) {
                    let downloaded = 0;
                    let contentLength: number | undefined = 0;

                    await update.downloadAndInstall((event) => {
                        switch (event.event) {
                            case 'Started':
                                contentLength = event.data.contentLength;
                                console.log(`started downloading ${event.data.contentLength} bytes`);
                                break;
                            case 'Progress':
                                downloaded += event.data.chunkLength;
                                console.log(`downloaded ${downloaded} from ${contentLength}`);
                                break;
                            case 'Finished':
                                console.log('download finished');
                                break;
                        }
                    });

                    await message('Update installed successfully. The application will now restart.', {
                        title: 'Update Complete',
                        kind: 'info'
                    });

                    await relaunch();
                }
            } else {
                console.log('[Updater] App is up to date.');
            }
        } catch (error) {
            // Silence the typical "release JSON" error in dev/missing remote
            const errorMsg = String(error);
            if (!errorMsg.includes('Could not fetch a valid release JSON')) {
                console.error('[Updater] Error checking for updates:', error);
            } else {
                console.warn('[Updater] No update JSON found at remote. Skipping update check.');
            }
        }
    };

    return null; // This component doesn't render anything
}
