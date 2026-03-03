const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addChapterTitleColumn() {
  console.log('Adding chapter_title column to game_sessions table...');
  
  // We execute a raw SQL query via RPC (or directly if available, but since JS client lacks raw SQL, 
  // we'll print the SQL for the user or try a lightweight knex/pg approach if needed.
  // Actually, the easiest way is to just use the structure we already have `current_step` which is a JSONB column!
  
  console.log("WAIT! The game_sessions table ALREADY has a `current_step` JSONB column.");
  console.log("We can just store the title inside `current_step: { chapter: 1, title: 'El Encuentro', text: '...' }`.");
  console.log("No database schema changes are needed! We just update the TypeScript logic.");
}

addChapterTitleColumn();
