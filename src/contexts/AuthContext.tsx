'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { User, Provider } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthContextType {
  user: (User & { accessToken?: string }) | null;
  session?: {
    access_token?: string;
    [key: string]: unknown;
  };
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<{ success: boolean; error?: string }>;
  signInWithProvider: (provider: Provider) => Promise<{ success: boolean; error?: string }>;
  updateEmail: (newEmail: string) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<(User & { accessToken?: string }) | null>(null)
  const [session, setSession] = useState<{ [key: string]: unknown; access_token?: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial user
    const getInitialSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session ? { ...data.session, access_token: data.session.access_token } : null);
      setUser(data.session?.user ? { ...data.session.user, accessToken: data.session.access_token } : null);
      setLoading(false);
    };

    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session ? { ...session, access_token: session.access_token } : null);
        setUser(session?.user ? { ...session.user, accessToken: session.access_token } : null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleSignIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      return { success: true };
    } catch (error) {
      let errorMsg = 'Unknown error';
      if (error && typeof error === 'object' && 'message' in error) {
        errorMsg = String((error as { message?: string }).message);
      }
      return { success: false, error: errorMsg };
    }
  };

  // Social/provider sign-in (Google, etc.)
  const handleSignInWithProvider = async (provider: Provider) => {
    try {
      // Dynamically set redirect URL based on current location (works for both dev and prod)
      const redirectTo = `${window.location.origin}/auth/callback`;
      const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } });
      if (error) throw error;
      // Note: For OAuth, Supabase will redirect, so this may not always resolve in SPA
      return { success: true };
    } catch (error) {
      let errorMsg = 'Unknown error';
      if (error && typeof error === 'object' && 'message' in error) {
        errorMsg = String((error as { message?: string }).message);
      }
      return { success: false, error: errorMsg };
    }
  };

  const handleSignUp = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) throw error

      return { success: true }
    } catch (error) {
      let errorMsg = 'Unknown error';
      if (error && typeof error === 'object' && 'message' in error) {
        errorMsg = String((error as { message?: string }).message);
      }
      return { success: false, error: errorMsg }
    }
  }

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { success: true };
    } catch (error) {
      let errorMsg = 'Unknown error';
      if (error && typeof error === 'object' && 'message' in error) {
        errorMsg = String((error as { message?: string }).message);
      }
      return { success: false, error: errorMsg };
    }
  };
  const updateEmail = async (newEmail: string) => {
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;
      return { success: true };
    } catch (error) {
      let errorMsg = 'Unknown error';
      if (error && typeof error === 'object' && 'message' in error) {
        errorMsg = String((error as { message?: string }).message);
      }
      return { success: false, error: errorMsg };
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      return { success: true };
    } catch (error) {
      let errorMsg = 'Unknown error';
      if (error && typeof error === 'object' && 'message' in error) {
        errorMsg = String((error as { message?: string }).message);
      }
      return { success: false, error: errorMsg };
    }
  };
  return (
    <AuthContext.Provider value={{
      user,
      session: session ?? undefined,
      loading,
      signIn: handleSignIn,
      signUp: handleSignUp,
      signOut: handleSignOut,
      signInWithProvider: handleSignInWithProvider,
      updateEmail,
      updatePassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
