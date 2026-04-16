import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load admin environment variables
if (fs.existsSync('.env.admin')) {
  dotenv.config({ path: '.env.admin' });
} else {
  console.log('⚠️ Skipping auto-setup: .env.admin not found. You must run SQL manually or provide Service Role key.');
  process.exit(0);
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.log('⚠️ Skipping auto-setup: Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.admin');
  process.exit(0);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function applyMigrations() {
  const migrationsDir = './supabase/migrations';
  const files = fs.readdirSync(migrationsDir).sort();

  console.log('🚀 Checking database synchronization...');

  // 1. Create a tracking table
  const { error: helperError } = await supabase.rpc('exec_sql', { 
    sql_query: 'CREATE TABLE IF NOT EXISTS _manual_migrations (name text primary key, applied_at timestamptz default now());' 
  });

  if (helperError) {
    if (helperError.message.includes('function exec_sql(sql_query => text) does not exist')) {
      console.error('❌ Critical Error: The helper function "exec_sql" is missing from your database.');
      console.log('👉 ACTION REQUIRED: Copy the SQL at the bottom of DEMO_CREDENTIALS.txt and run it in the Supabase SQL Editor.');
    } else {
      console.error('❌ Error initializing tracking table:', helperError.message);
    }
    process.exit(1);
  }

  for (const file of files) {
    if (file.endsWith('.sql')) {
      const { data: alreadyApplied } = await supabase.from('_manual_migrations').select('name').eq('name', file).maybeSingle();
      
      if (alreadyApplied) {
        continue; // Perfectly silent skip for already applied files
      }

      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      console.log(`  📄 Applying updates from ${file}...`);
      
      const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
      
      if (error) {
        if (
          error.message.includes('already exists') || 
          error.message.includes('duplicate key') || 
          error.message.includes('must be owner') || 
          error.message.includes('permission denied')
        ) {
          await supabase.from('_manual_migrations').insert({ name: file });
          continue; 
        }
        
        console.error(`  ❌ Error in ${file}:`, error.message);
        process.exit(1);
      }

      await supabase.from('_manual_migrations').insert({ name: file });
    }
  }

  // 2. Force Supabase to refresh its schema cache
  await supabase.rpc('exec_sql', { sql_query: 'NOTIFY pgrst, "reload schema";' });
  
  console.log('✅ Database is up to date and ready!');
}

applyMigrations();
