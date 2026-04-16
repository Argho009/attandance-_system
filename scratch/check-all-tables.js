import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

if (fs.existsSync('.env.admin')) {
  dotenv.config({ path: '.env.admin' });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkInvalid() {
  console.log('Checking for invalid functions/views...');
  // This query lists functions that might have errors (not perfect, but a start)
  const query = `
    SELECT 
        nspname AS schema, 
        proname AS function_name, 
        pg_get_function_result(p.oid) AS result_type, 
        pg_get_function_arguments(p.oid) AS argument_types
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE nspname = 'public';
  `;
  
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: query });
  // exec_sql returns void, so I can't see the result easily.
  // I'll try to run a query that might fail if things are broken.
  
  const tables = ['branches', 'users', 'students', 'subjects', 'subject_assignments', 'lectures', 'attendance', 'attendance_change_requests', 'attendance_condonation', 'ct_marks', 'endsem_marks', 'holidays', 'timetable', 'timetable_change_log', 'substitute_log', 'leave_requests', 'notices', 'assignment_submissions', 'bulk_upload_logs', 'semester_transitions', 'system_config'];
  
  for (const table of tables) {
    const { error: tableError } = await supabase.from(table).select('*').limit(1);
    if (tableError) {
      console.error(`Error in table ${table}:`, tableError);
    } else {
      console.log(`Table ${table} is OK`);
    }
  }
}

checkInvalid();
