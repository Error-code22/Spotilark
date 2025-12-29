
'use client';

import { cn } from '@/lib/utils';
import { TrackList } from './track-list';
import { Moon, Search, Sun, Bell, User, Settings, Mails, Radio, MoreVertical, ChartBarIncreasing, LogIn, LogOut } from 'lucide-react';
import { Switch } from '../ui/switch';
import Link from 'next/link';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { useTheme } from '@/context/ThemeContext';

export const MainContent = ({ children, session, router }: { children: React.ReactNode, session: Session | null, router: any }) => {
  const { theme, setTheme } = useTheme();

  return (
    <div className='flex-1 flex flex-col min-h-0'>
      <header className='hidden md:flex items-center p-4 border-b flex-shrink-0 bg-background z-10'>
        <div className='flex-1'>
          {/* Empty left side for balance */}
        </div>

        <div className='flex-1 flex justify-center'>
          {/* Empty center for balance */}
        </div>

        <div className='flex-1 flex justify-end items-center gap-2'>
          {/* Search Icon */}
          <Link href='/search' passHref>
            <Button variant='ghost' size='icon' className='rounded-full'>
              <Search className='h-5 w-5 text-muted-foreground' />
            </Button>
          </Link>

          {/* Theme Switch */}
          <div className='flex items-center gap-2'>
            <Sun className='h-5 w-5 text-muted-foreground' />
            <Switch
              checked={theme === 'dark'}
              onCheckedChange={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label='Toggle theme'
            />
            <Moon className='h-5 w-5 text-muted-foreground' />
          </div>

          {/* Dropdown Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='ghost' size='icon' className='rounded-full'>
                <MoreVertical className='h-5 w-5 text-muted-foreground' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              {session ? (
                <>
                  <DropdownMenuItem asChild>
                    <Link href='/profile'>
                      <User className='mr-2' />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href='/settings'>
                      <Settings className='mr-2' />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={async () => {
                    const { error } = await createClient().auth.signOut();
                    if (error) {
                      console.error('Error signing out:', error);
                    }
                    router.push('/login');
                    router.refresh();
                  }} className="w-full">
                    <div className="flex items-center">
                      <LogOut className='mr-2' />
                      Logout
                    </div>
                  </DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem asChild>
                  <Link href='/login'>
                    <LogIn className='mr-2' />
                    Login
                  </Link>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <main className='flex-1 overflow-y-auto min-h-0 scrollbar-hide pt-4 md:pt-0 pb-24 md:pb-32'>
        <div className="p-0 min-h-full">
          {children}
        </div>
      </main>
    </div>
  );
};
