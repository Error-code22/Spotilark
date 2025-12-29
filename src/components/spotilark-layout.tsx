'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { useTheme } from "@/context/ThemeContext";
import { Menu, MoreVertical, User, Settings, LogOut, LogIn, Sun, Moon, Search, Folder, Home, ListMusic, Mails, Music, Music2, Radio, ChartBarIncreasing, UserRound, X, RotateCw, ChevronLeft } from "lucide-react";

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

const menuItems = [
  { icon: Home, label: "Home", href: "/" },
  { icon: ListMusic, label: "Playlists", href: "/playlists" },
  { icon: Folder, label: "Folders", href: "/folders" },
  { icon: User, label: "Artists", href: "/artist" },
  { icon: Music, label: "Albums", href: "/albums" },
  { icon: ChartBarIncreasing, label: "Lyrics", href: "/lyrics" },
  { icon: Search, label: "Search", href: "/search" },
  { icon: Mails, label: "Messages", href: "/messages" },
  { icon: Settings, label: "Settings", href: "/settings" },
  { icon: UserRound, label: "Profile", href: "/profile" },
];

export const SpotilarkLayout = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(false);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const [session, setSession] = useState<Session | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();

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
                isOnline ? "bg-emerald-500" : "bg-neutral-500"
              )}></div>
              <div className={cn(
                "relative h-2.5 w-2.5 rounded-full",
                isOnline ? "bg-emerald-500" : "bg-neutral-500"
              )}></div>
            </div>
            <span className="text-[11px] font-black uppercase tracking-[0.2em] opacity-40">
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full h-10 w-10 hover:bg-primary/5 active:scale-90 transition-all text-muted-foreground"
            onClick={() => window.location.reload()}
          >
            <RotateCw className="h-5 w-5" />
          </Button>

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

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='ghost' size='icon' className='rounded-full'>
                <MoreVertical className='h-5 w-5 text-muted-foreground' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className="w-48 p-2 rounded-2xl shadow-2xl border-primary/5">
              {session ? (
                <>
                  <DropdownMenuItem onClick={() => window.location.reload()} className="rounded-xl">
                    <div className="flex items-center gap-2">
                      <RotateCw className='h-4 w-4' />
                      <span>Refresh App</span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-xl">
                    <Link href='/profile' className="flex items-center gap-2">
                      <User className='h-4 w-4' />
                      <span>Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-xl">
                    <Link href='/settings' className="flex items-center gap-2">
                      <Settings className='h-4 w-4' />
                      <span>Settings</span>
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

      {/* Desktop Sidebar */}
      <div className="hidden md:flex h-full">
        <LeftSidebar />
      </div>

      {/* Main Area */}
      <MainContent session={session} router={router}>
        {children}
      </MainContent>

      {/* Right Panel */}
      <div className={cn(
        isRightPanelOpen ? 'block' : 'hidden',
        "lg:flex fixed lg:relative inset-y-0 right-0 z-50 lg:z-0 w-full lg:w-80 bg-background border-l"
      )}>
        <RightPanel />
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 lg:hidden z-10"
          onClick={() => setIsRightPanelOpen(false)}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      <PlayerControls />
      <NowPlaying />
      <LyricsView />
    </div>
  );
};