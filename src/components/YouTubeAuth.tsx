"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Upload, CheckCircle2, Trash2, Shield, ExternalLink, LogIn } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface YouTubeAuthProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function YouTubeAuth({ open, onOpenChange }: YouTubeAuthProps) {
    const [hasCookies, setHasCookies] = useState(false);
    const [entryCount, setEntryCount] = useState(0);
    const [uploading, setUploading] = useState(false);
    const [electronLogin, setElectronLogin] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;

    useEffect(() => {
        if (open) checkCookies();
    }, [open]);

    const checkCookies = async () => {
        try {
            if (isElectron) {
                const status = await (window as any).electronAPI.ytAuthStatus();
                setHasCookies(status.authenticated);
                setEntryCount(status.authenticated ? 1 : 0);
            } else {
                const res = await fetch("/api/youtube/cookies");
                const data = await res.json();
                setHasCookies(data.hasCookies);
                setEntryCount(data.entryCount || 0);
            }
        } catch {}
    };

    const handleElectronLogin = async () => {
        const api = (window as any).electronAPI;
        if (!api) return;

        setElectronLogin(true);
        try {
            const result = await api.ytLoginYouTube();
            if (result.success) {
                setHasCookies(true);
                setEntryCount(result.cookieCount);
                toast({ title: "YouTube Authenticated", description: `Logged in successfully with ${result.cookieCount} cookies.` });
            } else {
                toast({ title: "Login Failed", description: result.error || "Could not complete login.", variant: "destructive" });
            }
        } catch (err: any) {
            toast({ title: "Error", description: err.message || "Login failed", variant: "destructive" });
        } finally {
            setElectronLogin(false);
        }
    };

    const handleElectronLogout = async () => {
        const api = (window as any).electronAPI;
        if (!api) return;
        await api.ytLogoutYouTube();
        setHasCookies(false);
        setEntryCount(0);
        toast({ title: "Logged out" });
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append("cookies", file);

            const res = await fetch("/api/youtube/cookies", { method: "POST", body: formData });
            const data = await res.json();

            if (data.success) {
                setHasCookies(true);
                setEntryCount(data.entryCount);
                toast({ title: "YouTube Authenticated", description: data.message });
            } else {
                toast({ title: "Error", description: data.error, variant: "destructive" });
            }
        } catch {
            toast({ title: "Error", description: "Failed to upload cookies", variant: "destructive" });
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleDelete = async () => {
        if (isElectron) {
            await handleElectronLogout();
            return;
        }
        try {
            await fetch("/api/youtube/cookies", { method: "DELETE" });
            setHasCookies(false);
            setEntryCount(0);
            toast({ title: "Cookies Removed" });
        } catch {}
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-primary" />
                        YouTube Authentication
                    </DialogTitle>
                    <DialogDescription>
                        {isElectron
                            ? "Sign in with your Google account for unlimited YouTube access."
                            : "Upload cookies to bypass bot detection and get unlimited YouTube access."}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 pt-2">
                    {hasCookies ? (
                        <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                            <CheckCircle2 className="h-8 w-8 text-green-500 shrink-0" />
                            <div className="flex-1">
                                <p className="font-semibold text-sm">Authenticated</p>
                                <p className="text-xs text-muted-foreground">
                                    {isElectron ? "Google account linked" : `${entryCount} cookie entries active`}
                                </p>
                            </div>
                            <Button variant="ghost" size="icon" onClick={handleDelete} className="text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    ) : isElectron ? (
                        <div className="space-y-3">
                            <Button
                                onClick={handleElectronLogin}
                                disabled={electronLogin}
                                className="w-full rounded-full font-bold gap-2 py-6"
                            >
                                <LogIn className="h-5 w-5" />
                                {electronLogin ? "Opening login window..." : "Sign in with Google"}
                            </Button>
                            <p className="text-xs text-muted-foreground text-center">
                                A browser window will open for you to sign in. Your cookies are stored locally.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="flex flex-col items-center gap-3 p-8 rounded-xl border-2 border-dashed border-muted-foreground/20 hover:border-primary/50 hover:bg-primary/5 cursor-pointer transition-all"
                            >
                                <Upload className="h-8 w-8 text-muted-foreground" />
                                <div className="text-center">
                                    <p className="font-semibold text-sm">Upload cookies.txt</p>
                                    <p className="text-xs text-muted-foreground mt-1">Click to select file</p>
                                </div>
                            </div>
                            <input ref={fileInputRef} type="file" accept=".txt" className="hidden" onChange={handleUpload} />

                            <div className="text-xs text-muted-foreground space-y-2 p-3 rounded-lg bg-muted/50">
                                <p className="font-semibold">How to get cookies:</p>
                                <ol className="list-decimal list-inside space-y-1">
                                    <li>Install <a href="https://chromewebstore.google.com/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc" target="_blank" className="text-primary hover:underline inline-flex items-center gap-1">Get cookies.txt LOCALLY <ExternalLink className="h-3 w-3" /></a></li>
                                    <li>Go to youtube.com and sign in</li>
                                    <li>Click the extension icon → Export</li>
                                    <li>Upload the downloaded file here</li>
                                </ol>
                            </div>
                        </div>
                    )}

                    <p className="text-[10px] text-muted-foreground/50 text-center">
                        {isElectron
                            ? "Your login is stored locally on your device."
                            : "Cookies are stored locally on the server and used only for YouTube requests."}
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}
