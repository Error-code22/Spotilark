'use client';

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { useTheme } from "@/context/ThemeContext";
import { Menu, MoreVertical, User, Settings, LogOut, LogIn, Sun, Moon, Search, Folder, Home, ListMusic, Music, Music2, UserRound, X, RotateCw, ChevronLeft, Download, CloudUpload } from "lucide-react";

import { LeftSidebar } from "./layout/left-sidebar";
import { MainContent } from "./layout/main-content";
import { RightPanel } from "./layout/right-panel";
import { NowPlaying } from "./layout/now-playing";
import { PlayerControls } from "./layout/player-controls";
import { LyricsView } from "./layout/lyrics-view";
import type { Track } from "@/lib/data";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { usePlayer } from "@/context/PlayerContext";
import { initCapacitor } from "@/lib/capacitor-init";
import { DownloadManager } from "@/components/DownloadManager";

const menuItems = [
  { icon: Home, label: "Home", href: "/" },
  { icon: ListMusic, label: "Playlists", href: "/playlists" },
  { icon: Folder, label: "Folders", href: "/folders" },
  { icon: User, label: "Artists", href: "/artist" },
  { icon: Music, label: "Albums", href: "/albums" },
  { icon: Music, label: "Video", href: "/video" },
];

export const SpotilarkLayout = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(false);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return true;
  });
  const [rightPanelWidth, setRightPanelWidth] = useState(320);
  const isResizingRef = useRef(false);
  const { theme, setTheme } = useTheme();
  const [session, setSession] = useState<Session | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();
  const { playTrack, unifiedLibrary } = usePlayer();

  useEffect(() => {
    setMounted(true);
    setIsOnline(typeof window !== 'undefined' ? navigator.onLine : true);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
    };
    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      authListener.subscription.unsubscribe();
    };
  }, [supabase.auth]);

  useEffect(() => {
    initCapacitor(
      playTrack,
      (path) => router.push(path),
      (trackId) => unifiedLibrary.find((t) => t.id === trackId)
    );
  }, [playTrack, router, unifiedLibrary]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current) return;
      const newWidth = window.innerWidth - e.clientX;
      setRightPanelWidth(Math.max(240, Math.min(600, newWidth)));
    };
    const handleMouseUp = () => {
      isResizingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Render a minimal UI on the server to prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="flex h-screen bg-background text-foreground font-sans overflow-hidden">
        <div className="hidden md:flex flex-col w-64 bg-card border-r border-border">
          <div className="h-16 border-b border-border"></div>
          <div className="flex-1 overflow-y-auto"></div>
        </div>
        <div className="flex-1 flex flex-col">
          <div className="h-16 border-b border-border bg-card"></div>
          <div className="flex-1 overflow-y-auto"></div>
          <div className="h-24 border-t border-border bg-card"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] w-full bg-background overflow-hidden font-sans selection:bg-primary/20">
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between px-5 pt-[calc(12px+env(safe-area-inset-top,0px))] pb-3 border-b border-border/50 bg-background/80 backdrop-blur-xl sticky top-0 z-40 w-full animate-in fade-in slide-in-from-top duration-500">
        <div className="flex items-center gap-2">
          {pathname !== '/' && (
            <Button
              variant="ghost"
              size="icon"
              className="-ml-2 h-10 w-10 rounded-full active:scale-90 transition-all text-muted-foreground"
              onClick={() => router.back()}
              title="Go Back"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
          )}

          <Sheet open={isLeftSidebarOpen} onOpenChange={setIsLeftSidebarOpen}>
            <SheetTrigger asChild>
              <div className="group p-2.5 cursor-pointer flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-primary/40 group-hover:bg-primary transition-all shadow-[0_0_12px_rgba(var(--primary-rgb),0.6)]"></div>
              </div>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 border-r-none w-72">
              <LeftSidebar />
            </SheetContent>
          </Sheet>

          <div className="flex items-center gap-2.5">
            <div className="h-2.5 w-2.5 rounded-full relative">
              <div className={cn(
                "absolute inset-0 rounded-full animate-ping opacity-75",
                isOnline ? "bg-emerald-500" : "bg-red-500"
              )}></div>
              <div className={cn(
                "relative h-2.5 w-2.5 rounded-full",
                isOnline ? "bg-emerald-500" : "bg-red-500"
              )}></div>
            </div>
            <span className="text-xl font-black italic tracking-tighter text-foreground/90">
              Spotilark
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Link href="/search" passHref>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full h-10 w-10 hover:bg-primary/5 active:scale-90 transition-all text-muted-foreground"
            >
              <Search className="h-5 w-5" />
            </Button>
          </Link>

          <Button
            variant="ghost"
            size="icon"
            className="rounded-full h-10 w-10 hover:bg-primary/5 active:scale-90 transition-all"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>

          <DownloadManager />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='ghost' size='icon' className='rounded-full'>
                <MoreVertical className='h-5 w-5 text-muted-foreground' />
              </Button>
            </DropdownMenuTrigger>
              <DropdownMenuContent align='end' className="w-48 p-2 rounded-2xl shadow-2xl border-primary/5">
                <DropdownMenuItem onClick={() => window.location.reload()} className="rounded-xl">
                  <div className="flex items-center gap-2">
                    <RotateCw className='h-4 w-4' />
                    <span>Refresh App</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="rounded-xl">
                  <Link href='/upload' className="flex items-center gap-2">
                    <CloudUpload className='h-4 w-4' />
                    <span>Upload</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="rounded-xl">
                  <Link href='/settings' className="flex items-center gap-2">
                    <Settings className='h-4 w-4' />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                {session ? (
                  <>
                    <DropdownMenuItem asChild className="rounded-xl">
                      <Link href='/profile' className="flex items-center gap-2">
                        <User className='h-4 w-4' />
                        <span>Profile</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-primary/5" />
                    <DropdownMenuItem
                      className="rounded-xl text-destructive focus:text-destructive focus:bg-destructive/5"
                      onClick={async () => {
                        await supabase.auth.signOut();
                        router.push('/login');
                        router.refresh();
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <LogOut className='h-4 w-4' />
                        <span>Logout</span>
                      </div>
                    </DropdownMenuItem>
                  </>
                ) : (
                  <DropdownMenuItem asChild className="rounded-xl">
                    <Link href='/login' className="flex items-center gap-2">
                      <LogIn className='h-4 w-4' />
                      <span>Login / Sign Up</span>
                    </Link>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* MOBILE SCROLLABLE NAV */}
      <nav className="md:hidden flex items-center gap-6 px-4 py-2 border-b border-border/40 bg-background/50 backdrop-blur-md overflow-x-auto no-scrollbar scroll-smooth font-sans">
        {menuItems.map(({ icon: Icon, label, href }) => {
          const active = pathname === href;
          return (
            <Link
              key={label}
              href={href}
              className={cn(
                "flex items-center gap-2 px-1 whitespace-nowrap transition-all active:scale-95",
                active ? "text-primary font-bold" : "text-muted-foreground"
              )}
            >
              <span className="text-xs uppercase tracking-widest">{label}</span>
            </Link>
          );
        })}
      </nav>

      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex h-full">
        <LeftSidebar />
      </div>

      {/* Main Area */}
      <MainContent session={session} router={router}>
        {children}
      </MainContent>

      {/* Right Panel with Resizer */}
      {isRightPanelOpen && (
        <div
          className="hidden lg:flex flex-col border-l relative h-full overflow-hidden"
          style={{ width: rightPanelWidth, minWidth: 240, maxWidth: 600 }}
        >
          <div
            className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 active:bg-primary/70 transition-colors z-10 -ml-[2px]"
            onMouseDown={(e) => {
              e.preventDefault();
              isResizingRef.current = true;
              document.body.style.cursor = 'col-resize';
              document.body.style.userSelect = 'none';
            }}
          />
          <RightPanel />
        </div>
      )}

      {/* Mobile Right Panel Overlay */}
      {isRightPanelOpen && (
        <div className="lg:hidden fixed inset-y-0 right-0 z-50 w-80 max-w-[85vw] bg-background border-l shadow-2xl flex">
          <RightPanel />
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-10 h-10 w-10"
            onClick={() => setIsRightPanelOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      )}

      <PlayerControls />
      <NowPlaying />
      <LyricsView />
    </div >
  );
};