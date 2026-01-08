
"use client";

import { WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OfflinePage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-4 text-center">
            <div className="bg-zinc-900 p-8 rounded-2xl shadow-2xl border border-zinc-800 animate-in fade-in zoom-in duration-500">
                <div className="flex justify-center mb-6">
                    <div className="p-4 bg-zinc-800 rounded-full">
                        <WifiOff className="w-12 h-12 text-zinc-400" />
                    </div>
                </div>
                <h1 className="text-3xl font-bold mb-2">You're Offline</h1>
                <p className="text-zinc-400 mb-8 max-w-xs">
                    It looks like you don't have an internet connection. Don't worry, your cached music and local files are still available!
                </p>
                <div className="space-y-3">
                    <Button
                        className="w-full bg-zinc-100 text-black hover:bg-white"
                        onClick={() => window.location.reload()}
                    >
                        Try Refreshing
                    </Button>
                    <Button
                        variant="ghost"
                        className="w-full text-zinc-400 hover:text-white"
                        onClick={() => window.location.href = '/folders'}
                    >
                        Go to Folders
                    </Button>
                </div>
            </div>
        </div>
    );
}
