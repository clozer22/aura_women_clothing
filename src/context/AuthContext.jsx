import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { setWishlistUser } from '../lib/wishlistManager';

const AuthContext = createContext(null);

export const isAdminEmail = (email) => {
  if (!email) return false;
  const lower = email.toLowerCase().trim();
  return lower.endsWith('@admin.com') || lower.endsWith('@superadmin.com') || lower.endsWith('@aura.com');
};

export const getAdminRole = (email) => {
  if (!email) return 'Admin';
  const lower = email.toLowerCase().trim();
  if (lower.endsWith('@superadmin.com')) return 'Super Admin';
  if (lower.endsWith('@admin.com')) return 'Admin';
  if (lower.includes('super')) return 'Super Admin';
  return 'Admin';
};

// Determines if customer account is verified (Google OAuth or confirmed via Email OTP)
export const isUserEmailVerified = (user) => {
  if (!user) return false;
  // Google OAuth users are inherently verified by Google's trusted identity provider
  const provider =
    user.app_metadata?.provider ||
    user.raw_app_meta_data?.provider ||
    user.app_metadata?.providers?.[0];
  if (provider === 'google') return true;

  // Supabase GoTrue confirmation timestamps
  if (user.email_confirmed_at || user.confirmed_at) return true;

  // Check linked identities for Google provider
  if (Array.isArray(user.identities) && user.identities.some((i) => i.provider === 'google')) {
    return true;
  }

  return false;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [promptDismissed, setPromptDismissed] = useState(false);

  // Fetch or create profile from public.user_profiles
  const fetchProfile = async (currentUser) => {
    if (!currentUser || isAdminEmail(currentUser.email)) {
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
      if (currentUser && isAdminEmail(currentUser.email)) {
        // Admin accounts must NOT be logged in as customers on the storefront
        setUser(null);
        setWishlistUser(null);
        setProfile(null);
        try {
          supabase.auth.signOut();
        } catch (e) {}
      } else {
        setUser(currentUser);
        setWishlistUser(currentUser);
        if (currentUser) {
          fetchProfile(currentUser);
        }
      }
      setLoading(false);
    });

    // 2. Realtime Auth State Listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      if (currentUser && isAdminEmail(currentUser.email)) {
        // Admin accounts must NOT be logged in as customers on the storefront
        setUser(null);
        setWishlistUser(null);
        setProfile(null);
        try {
          await supabase.auth.signOut();
        } catch (e) {}
      } else {
        setUser(currentUser);
        setWishlistUser(currentUser);
        if (currentUser) {
          await fetchProfile(currentUser);
        } else {
          setProfile(null);
        }
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Sign In with Google OAuth (Redirect fallback)
  const signInWithGoogle = async () => {
    let origin = 'https://www.aurashophere.com';
    if (typeof window !== 'undefined' && window.location.origin && window.location.origin !== 'null') {
      origin = window.location.origin.replace(/\/+$/, '');
    }

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

  // Sign In with Google ID Token (Google Identity Services - Native In-Page, Zero Foreign Redirects)
  const signInWithGoogleIdToken = async (idToken) => {
    if (!idToken) throw new Error('No Google authentication token was received.');

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });

    if (error) throw error;
    return data;
  };

  // Sign Up with Email and Password (triggers OTP email from Supabase)
  const signUpWithEmail = async ({ email, password, fullName }) => {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanName = (fullName || '').replace(/<[^>]*>?/gm, '').trim().slice(0, 80);

    if (isAdminEmail(cleanEmail)) {
      throw new Error('This email address cannot be registered as a customer account.');
    }

    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      throw new Error('Please provide a valid email address.');
    }

    // Password validation: minimum 8 characters, at least 1 letter, at least 1 number
    if (!password || password.length < 8) {
      throw new Error('Password must be at least 8 characters long.');
    }
    if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
      throw new Error('Password must contain both letters and at least one number.');
    }

    let origin = 'https://www.aurashophere.com';
    if (typeof window !== 'undefined' && window.location.origin && window.location.origin !== 'null') {
      origin = window.location.origin.replace(/\/+$/, '');
    }

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        emailRedirectTo: `${origin}/`,
        data: {
          full_name: cleanName,
        },
      },
    });

    if (error) {
      const msg = error.message || '';
      if (msg.toLowerCase().includes('rate limit') || error.status === 429) {
        throw new Error('Email verification limit reached. Please wait a few minutes before trying again, or sign in directly with Google.');
      }
      throw error;
    }

    // When an account already exists, Supabase returns user with empty identities array and sends NO email
    if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      throw new Error('An account with this email address already exists. Please switch to the Sign In tab or use Google Sign-In.');
    }

    return data;
  };

  // Verify 6-digit OTP code sent to Email
  const verifyEmailOtp = async ({ email, token }) => {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanToken = (token || '').replace(/\D/g, '').trim().slice(0, 6);

    if (cleanToken.length !== 6) {
      throw new Error('Please enter a valid 6-digit verification code.');
    }

    // Try signup OTP verification
    const { data, error } = await supabase.auth.verifyOtp({
      email: cleanEmail,
      token: cleanToken,
      type: 'signup',
    });

    if (error) {
      // Fallback: try email OTP verification type
      const retry = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanToken,
        type: 'email',
      });
      if (retry.error) throw retry.error;
      return retry.data;
    }

    return data;
  };

  // Resend confirmation email
  const resendEmailOtp = async (email) => {
    const cleanEmail = (email || '').trim().toLowerCase();
    let origin = 'https://www.aurashophere.com';
    if (typeof window !== 'undefined' && window.location.origin && window.location.origin !== 'null') {
      origin = window.location.origin.replace(/\/+$/, '');
    }
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: cleanEmail,
      options: {
        emailRedirectTo: `${origin}/`,
      },
    });
    if (error) {
      const msg = error.message || '';
      if (msg.toLowerCase().includes('rate limit') || error.status === 429) {
        throw new Error('Email verification limit reached. Please wait a few minutes before requesting another code.');
      }
      throw error;
    }
  };

  // Explicitly send verification OTP to logged-in user or specified email
  const sendVerificationOtp = async (targetEmail) => {
    const cleanEmail = (targetEmail || user?.email || '').trim().toLowerCase();
    if (!cleanEmail) throw new Error('No valid email address found to send verification code.');
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: cleanEmail,
    });
    if (error) {
      const msg = error.message || '';
      if (msg.toLowerCase().includes('rate limit') || error.status === 429) {
        throw new Error('Email verification limit reached. Please wait a few minutes before requesting another code.');
      }
      throw error;
    }
  };

  // Direct Sign In with Email & Password
  const signInWithEmail = async ({ email, password }) => {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (isAdminEmail(cleanEmail)) {
      throw new Error('Admin accounts cannot log in as customers. Please use your personal email or log in via the Admin Dashboard.');
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (error) throw error;
    return data;
  };

  // Sign Out
  const signOut = async () => {
    setWishlistUser(null);
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  // Create / Update Personal Password (especially for Google users)
  const updatePassword = async (newPassword) => {
    if (!newPassword || newPassword.length < 8) {
      throw new Error('Password must be at least 8 characters long.');
    }
    if (!/[a-zA-Z]/.test(newPassword) || !/\d/.test(newPassword)) {
      throw new Error('Password must contain both letters and at least one number.');
    }

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

  // Update Profile Information (name, phone, avatar) - Whitelisted & Sanitized against privilege escalation
  const updateProfileData = async (updates) => {
    if (!user?.id || !updates || typeof updates !== 'object') return;

    const allowed = {};

    if (typeof updates.full_name === 'string') {
      let cleaned = updates.full_name.replace(/<[^>]*>?/gm, '').trim();
      if (/^[=+\-@]/.test(cleaned)) cleaned = `'${cleaned}`;
      allowed.full_name = cleaned.slice(0, 80);
    }

    if (typeof updates.phone === 'string') {
      const cleanPhone = updates.phone.replace(/\D/g, '').slice(0, 11);
      allowed.phone = cleanPhone;
    }

    if (typeof updates.avatar_url === 'string') {
      allowed.avatar_url = updates.avatar_url.trim().slice(0, 500);
    }

    if (Object.keys(allowed).length === 0) return;

    const { error } = await supabase
      .from('user_profiles')
      .update({
        ...allowed,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (error) throw error;
    setProfile((prev) => (prev ? { ...prev, ...allowed } : null));
  };

  // Determine if Google user needs to be prompted to set password
  const shouldPromptPassword = Boolean(
    user && profile && profile.has_set_password === false && !promptDismissed
  );

  const isEmailVerified = isUserEmailVerified(user);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role: profile?.role || 'customer',
        loading,
        isEmailVerified,
        isUserEmailVerified,
        sendVerificationOtp,
        signInWithGoogle,
        signInWithGoogleIdToken,
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
