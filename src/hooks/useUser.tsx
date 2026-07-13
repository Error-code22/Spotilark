'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function useUser() {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<'user' | 'admin' | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserAndRole = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        setUser(user);

        if (user) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

          console.log('[useUser] Fetched profile:', profile, 'Error:', profileError);
          setRole(profile?.role || 'user');
          console.log('[useUser] Role set to:', profile?.role || 'user');
        } else {
          setRole(null);
        }
      } catch (error) {
        console.error('Error fetching user or role:', error);
        setUser(null);
        setRole(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserAndRole();

    // Safety timeout: Ensure loading always finishes after 5 seconds
    const timeout = setTimeout(() => {
      if (isLoading) {
        console.warn('[useUser] Loading timed out after 5s. Forcing isLoading to false.');
        setIsLoading(false);
      }
    }, 5000);

    // Set up auth state listener
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const newUser = session?.user ?? null;
      console.log('[useUser] Auth state change event:', _event, 'User:', newUser?.id);
      setUser(newUser);

      if (newUser) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', newUser.id)
          .single();
        setRole(profile?.role || 'user');
      } else {
        setRole(null);
      }

      setIsLoading(false);
    });

    return () => {
      clearTimeout(timeout);
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  return { user, role, isAdmin: role === 'admin', isLoading };
}