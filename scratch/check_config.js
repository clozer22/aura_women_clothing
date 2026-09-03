import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pcmlleeuxbymomjxhwlv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjbWxsZWV1eGJ5bW9tanhod2x2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzNzA2NzgsImV4cCI6MjEwMzk0NjY3OH0.WZCqgnt_7l88U-Yl_rAvhmXQLSKy70hT1Wjq8rf_qC0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { data, error } = await supabase.from('storefront_config').select('*');
  console.log('Error:', error);
  console.log('Storefront Config rows:', data);
}

check();
