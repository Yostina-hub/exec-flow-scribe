import { useState, useEffect, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

let cachedUser: User | null = null;
let cacheTime: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function useAuth() {
  const [user, setUser] = useState<User | null>(cachedUser);
  const [loading, setLoading] = useState(!cachedUser);

  const fetchUser = useCallback(async (force = false) => {
    const now = Date.now();
    
    // Return cached user if still valid
    if (!force && cachedUser && (now - cacheTime) < CACHE_DURATION) {
      setUser(cachedUser);
      setLoading(false);
      return cachedUser;
    }

    try {
      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Auth check timeout')), 10000)
      );
      
      const authPromise = supabase.auth.getUser();
      
      const { data: { user: fetchedUser }, error } = await Promise.race([
        authPromise,
        timeoutPromise
      ]) as any;
      
      if (error) {
        console.error('Auth error:', error);
        throw error;
      }
      
      cachedUser = fetchedUser;
      cacheTime = now;
      setUser(fetchedUser);
      
      return fetchedUser;
    } catch (error) {
      console.error('Auth fetch error:', error);
      // Don't cache null on timeout/error to allow retry
      cachedUser = null;
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();

    // Listen to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const newUser = session?.user ?? null;
      cachedUser = newUser;
      cacheTime = Date.now();
      setUser(newUser);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUser]);

  return { user, loading, refetch: () => fetchUser(true) };
}
