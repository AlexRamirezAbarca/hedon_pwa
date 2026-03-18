require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkConnection() {
  console.log('Testing Supabase connection to:', supabaseUrl);
  try {
    const { data, error } = await supabase.from('couples').select('id').limit(1);
    if (error) {
       console.error('❌ Error connecting to Supabase or reading couples table:', error.message);
    } else {
       console.log('✅ Connection successful! Authentication and database access are working.');
    }
  } catch(e) {
     console.error('❌ Exception during connection test:', e);
  }
}

checkConnection();
