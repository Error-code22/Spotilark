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
            .eq('user_id', user.id)
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

    // Set up auth state listener
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const newUser = session?.user ?? null;
      setUser(newUser);

      if (newUser) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', newUser.id)
          .single();
        setRole(profile?.role || 'user');
      } else {
        setRole(null);
      }

      setIsLoading(false);
    });

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  return { user, role, isAdmin: role === 'admin', isLoading };
}