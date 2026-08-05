import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://sylfhockkibohntgcswb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5bGZob2Nra2lib2hudGdjc3diIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxMzA3MjIsImV4cCI6MjEwMDcwNjcyMn0.audxFrkyQoBMhkN72WGF0LP_ip7eYnpCHVwkY3RXfVs';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { data, error } = await supabase.from('storefront_config').select('*');
  console.log('Error:', error);
  console.log('Storefront Config rows:', data);
}

check();
