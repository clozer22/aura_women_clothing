import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [promptDismissed, setPromptDismissed] = useState(false);

  // Fetch or create profile from public.user_profiles
  const fetchProfile = async (currentUser) => {
    if (!currentUser) {
      setProfile(null);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.warn('Could not fetch user_profile:', error.message);
      }

      if (data) {
        setProfile(data);
      } else {
        // If profile doesn't exist yet, insert a default customer profile
        const isGoogle =
          currentUser.app_metadata?.provider === 'google' ||
          currentUser.raw_app_meta_data?.provider === 'google';

        const fallbackProfile = {
          id: currentUser.id,
          email: currentUser.email,
          full_name:
            currentUser.user_metadata?.full_name ||
            currentUser.user_metadata?.name ||
            currentUser.email?.split('@')[0],
          avatar_url:
            currentUser.user_metadata?.avatar_url ||
            currentUser.user_metadata?.picture ||
            null,
          role: 'customer',
          has_set_password: !isGoogle,
        };

        const { data: created } = await supabase
          .from('user_profiles')
          .insert([fallbackProfile])
          .select()
          .maybeSingle();

        setProfile(created || fallbackProfile);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  };

  useEffect(() => {
    // 1. Initial Session Check
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        fetchProfile(currentUser);
      }
      setLoading(false);
    });

    // 2. Realtime Auth State Listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        await fetchProfile(currentUser);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Sign In with Google OAuth
  const signInWithGoogle = async () => {
    const origin =
      typeof window !== 'undefined' && window.location.origin && window.location.origin !== 'null'
        ? window.location.origin
        : 'https://aura-women-clothing-mzaa2w9w2-clozer22s-projects.vercel.app';

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${origin}/`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) throw error;
  };

  // Sign Up with Email and Password (triggers OTP email from Supabase)
  const signUpWithEmail = async ({ email, password, fullName }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) throw error;
    return data;
  };

  // Verify 6-digit OTP code sent to Email
  const verifyEmailOtp = async ({ email, token }) => {
    // Try signup OTP verification
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: token.trim(),
      type: 'signup',
    });

    if (error) {
      // Fallback: try email OTP verification type
      const retry = await supabase.auth.verifyOtp({
        email,
        token: token.trim(),
        type: 'email',
      });
      if (retry.error) throw retry.error;
      return retry.data;
    }

    return data;
  };

  // Resend OTP verification email
  const resendEmailOtp = async (email) => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
    });
    if (error) throw error;
  };

  // Direct Sign In with Email & Password
  const signInWithEmail = async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  };

  // Sign Out
  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  // Create / Update Personal Password (especially for Google users)
  const updatePassword = async (newPassword) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) throw error;

    // Update has_set_password in user_profiles
    if (user?.id) {
      await supabase
        .from('user_profiles')
        .update({
          has_set_password: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      setProfile((prev) => (prev ? { ...prev, has_set_password: true } : null));
    }
  };

  // Update Profile Information (name, phone, avatar)
  const updateProfileData = async (updates) => {
    if (!user?.id) return;

    const { error } = await supabase
      .from('user_profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (error) throw error;
    setProfile((prev) => (prev ? { ...prev, ...updates } : null));
  };

  // Determine if Google user needs to be prompted to set password
  const shouldPromptPassword = Boolean(
    user && profile && profile.has_set_password === false && !promptDismissed
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role: profile?.role || 'customer',
        loading,
        signInWithGoogle,
        signUpWithEmail,
        verifyEmailOtp,
        resendEmailOtp,
        signInWithEmail,
        signOut,
        updatePassword,
        updateProfileData,
        shouldPromptPassword,
        dismissPrompt: () => setPromptDismissed(true),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
