import { createClient } from '@supabase/supabase-js';
import { createSecureStorage } from './secureStorage';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Missing Supabase Environment Variables in .env file. ' +
    'Please verify that VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set correctly.'
  );
}

// 1. Customer Storefront Supabase Client (Isolated Encrypted Session)
export const supabaseCustomer = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    storageKey: '_aura_c_vlt',
    storage: createSecureStorage('customer'),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// 2. Administrator Portal Supabase Client (Isolated Encrypted Session)
export const supabaseAdmin = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    storageKey: '_aura_a_vlt',
    storage: createSecureStorage('admin'),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Default export aliases to customer client for storefront backward compatibility
export const supabase = supabaseCustomer;
export default supabaseCustomer;
