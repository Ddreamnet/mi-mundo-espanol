import { useState, useEffect, useRef, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  role: "teacher" | "student" | "admin";
  roles: ("teacher" | "student" | "admin")[];
  created_at: string;
  updated_at: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const { toast } = useToast();
  
  // Refs to track signing out state and prevent race conditions
  const isSigningOutRef = useRef(false);
  const profileFetchAbortRef = useRef<AbortController | null>(null);
  const lastFetchedUserIdRef = useRef<string | null>(null);

  const fetchProfile = useCallback(async (userId: string) => {
    if (isSigningOutRef.current) return;

    // Cancel any previous fetch
    if (profileFetchAbortRef.current) {
      profileFetchAbortRef.current.abort();
    }
    profileFetchAbortRef.current = new AbortController();

    try {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (isSigningOutRef.current) return;

      if (profileError) {
        if (profileError.code === "PGRST116") {
          setProfile(null);
        } else {
          throw profileError;
        }
      } else {
        // Fetch user roles
        const { data: rolesData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId);

        if (isSigningOutRef.current) return;

        const roles = rolesData?.map((r) => r.role as "teacher" | "student" | "admin") || [];
        const primaryRole = roles.includes("admin")
          ? "admin"
          : roles.includes("teacher")
          ? "teacher"
          : "student";

        setProfile({
          ...profileData,
          roles,
          role: primaryRole,
        });
      }
    } catch (error) {
      if (!isSigningOutRef.current) {
        console.error("Error fetching profile:", error);
        setProfile(null);
      }
    } finally {
      if (!isSigningOutRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (isSigningOutRef.current && event !== 'SIGNED_OUT') return;

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user && !isSigningOutRef.current) {
        if (lastFetchedUserIdRef.current !== session.user.id) {
          lastFetchedUserIdRef.current = session.user.id;
          fetchProfile(session.user.id);
        }
      } else {
        lastFetchedUserIdRef.current = null;
        setProfile(null);
        setLoading(false);
      }
    });

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (!session) setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });

    return () => {
      subscription.unsubscribe();
      // Abort any pending profile fetch on cleanup
      if (profileFetchAbortRef.current) {
        profileFetchAbortRef.current.abort();
      }
    };
  }, [fetchProfile]);

  const signIn = async (email: string, password: string) => {
    try {
      // Reset signing out state on sign in attempt
      isSigningOutRef.current = false;
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  const signUp = async (email: string, password: string, fullName: string, role: "teacher" | "student") => {
    try {
      const redirectUrl = `${window.location.origin}/`;

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
            role: role,
          },
        },
      });

      if (error) throw error;

      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  const signOut = async () => {
    isSigningOutRef.current = true;
    setSigningOut(true);
    
    if (profileFetchAbortRef.current) {
      profileFetchAbortRef.current.abort();
      profileFetchAbortRef.current = null;
    }
    
    setUser(null);
    setSession(null);
    setProfile(null);
    
    // Clear Supabase localStorage items
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch {
      // Ignore localStorage errors
    }
    
    try {
      await supabase.auth.signOut();
    } catch {
      // OK if session already expired
    }
    
    setSigningOut(false);
    setTimeout(() => { isSigningOutRef.current = false; }, 1000);
  };

  return {
    user,
    session,
    profile,
    loading,
    signingOut,
    signIn,
    signUp,
    signOut,
  };
}
