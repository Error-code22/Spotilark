"use client";

import { SpotilarkLayout } from "@/components/spotilark-layout";
import dynamic from 'next/dynamic';
import { CloudUpload, Info } from "lucide-react";

const MusicUploadForm = dynamic(() => import("@/components/MusicUploadForm"), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-muted h-[400px] rounded-3xl" />
});

export default function UploadPage() {
  return (
    <SpotilarkLayout>
      <div className="flex-1 p-6 md:p-12 overflow-y-auto pb-48 scrollbar-hide">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-2xl">
                <CloudUpload className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight">Cloud Sync</h1>
                <p className="text-muted-foreground font-medium">Backup your music and listen across all your devices</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="md:col-span-3">
              <MusicUploadForm />
            </div>

            <div className="space-y-4">
              <div className="p-6 rounded-3xl bg-primary/5 border border-primary/10 space-y-4">
                <div className="flex items-center gap-2 text-primary">
                  <Info className="h-4 w-4" />
                  <span className="text-xs font-black uppercase tracking-widest">How it works</span>
                </div>
                <ul className="space-y-2 text-sm text-foreground/80 font-medium">
                  <li className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span>Upload files to your personal cloud storage.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span>Metadata is extracted automatically.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span>Access songs from Home on any device.</span>
                  </li>
                </ul>
              </div>

              <div className="p-6 rounded-[40px] bg-primary/5 border border-primary/10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-16 -mt-16 opacity-50" />
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-3">Cloud Protocol</p>
                <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                  SpotiLark leverages a globally distributed, high-performance cloud infrastructure to ensure your audio assets are delivered with zero-latency. Your repository is strictly private and vaulted for your ears only.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SpotilarkLayout>
  );
}
