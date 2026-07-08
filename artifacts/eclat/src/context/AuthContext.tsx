import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { addDoc, collection, doc, getDocs, query, serverTimestamp, setDoc, where } from '@/lib/supabaseStore';

export type AppUser = SupabaseUser & {
  uid: string;
  displayName: string | null;
  photoURL: string | null;
};

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  googleAuthEnabled: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (name: string, email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function toAppUser(user: SupabaseUser | null): AppUser | null {
  if (!user) return null;
  return {
    ...user,
    uid: user.id,
    displayName:
      (user.user_metadata?.display_name as string | undefined) ||
      (user.user_metadata?.full_name as string | undefined) ||
      user.email ||
      null,
    photoURL: (user.user_metadata?.avatar_url as string | undefined) || null,
  };
}

async function processReferral(user: AppUser) {
  const referredByCode = localStorage.getItem('referred_by_code');
  if (!referredByCode) return;
  try {
    const usersRef = collection(supabase, 'users');
    const referrerQuery = query(usersRef, where('referralCode', '==', referredByCode));
    const referrerSnap = await getDocs(referrerQuery);
    if (!referrerSnap.empty) {
      const referrerDoc = referrerSnap.docs[0];
      if (referrerDoc.id !== user.uid) {
        await addDoc(collection(supabase, 'referrals'), {
          referrerId: referrerDoc.id,
          referredUserId: user.uid,
          referredUserEmail: user.email || '',
          status: 'pending',
          rewardAmount: 500,
          createdAt: serverTimestamp(),
        });
        localStorage.removeItem('referred_by_code');
      }
    }
  } catch (refErr) {
    console.error('Failed to record referral.', refErr);
  }
}

async function upsertUserDoc(user: AppUser) {
  await setDoc(
    doc(supabase, 'users', user.uid),
    {
      uid: user.uid,
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
      lastLoginAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const googleAuthEnabled = import.meta.env.VITE_GOOGLE_AUTH_ENABLED !== 'false';

  const clearError = useCallback(() => setError(null), []);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setUser(toAppUser(data.session?.user ?? null));
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(toAppUser(session?.user ?? null));
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setError(null);
    if (!googleAuthEnabled) {
      const providerError = 'Google sign-in is not enabled yet. Please use email login for now.';
      setError(providerError);
      throw new Error(providerError);
    }
    const redirectTo = new URL(`${import.meta.env.BASE_URL}profile`, window.location.origin).toString();
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    if (signInError) {
      setError(signInError.message || 'Sign-in failed. Please try again.');
      throw signInError;
    }
  }, [googleAuthEnabled]);

  const signInWithEmail = useCallback(async (email: string, pass: string) => {
    setError(null);
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (signInError) {
      setError('Invalid email or password.');
      throw signInError;
    }
    const appUser = toAppUser(data.user);
    if (appUser) await upsertUserDoc(appUser);
  }, []);

  const signUpWithEmail = useCallback(async (name: string, email: string, pass: string) => {
    setError(null);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password: pass,
      options: { data: { display_name: name, full_name: name } },
    });
    if (signUpError) {
      setError(signUpError.message || 'Sign-up failed. Please try again.');
      throw signUpError;
    }
    const appUser = toAppUser(data.user);
    if (appUser) {
      await upsertUserDoc(appUser);
      await processReferral(appUser);
    }
  }, []);

  const logout = useCallback(async () => {
    setError(null);
    const { error: logoutError } = await supabase.auth.signOut();
    if (logoutError) {
      setError(logoutError.message || 'Logout failed. Please try again.');
      throw logoutError;
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        googleAuthEnabled,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        logout,
        error,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
