import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local' });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testLogin() {
  console.log('Testing login for student111...');
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'student111@college.edu',
    password: '123'
  });
  
  if (error) {
    console.error('Login Error:', error.message);
  } else {
    console.log('Login Success! Role:', data.user.app_metadata.role);
    
    // Now try to query something while logged in
    const { data: attendance, error: attError } = await supabase.from('attendance').select('*').limit(1);
    if (attError) {
      console.error('Attendance Query Error:', attError.message);
    } else {
      console.log('Attendance Query Success! Data:', attendance);
    }
  }
}

testLogin();
