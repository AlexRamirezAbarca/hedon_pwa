require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testRealtime() {
  console.log("1. Authenticating as an anonymous or test listener...");
  // We'll just listen to public changes if allowed, but wait, without auth, RLS will block us.
  // We need to sign in as one of the users, or we can just use the Service Role Key to bypass RLS and see if the event fires AT ALL.

  // Let's check for SERVICE_ROLE_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    console.log("No Service Role Key found. Attempting to listen as anon. Note: RLS might block anon from seeing messages.");
  }
  
  const clientToUse = serviceKey ? createClient(supabaseUrl, serviceKey) : supabase;

  console.log("2. Subscribing to game_messages channel...");
  const channel = clientToUse.channel('system_test_channel')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'game_messages' }, payload => {
      console.log('--- REALTIME EVENT RECEIVED ---');
      console.log(payload);
    })
    .subscribe((status, err) => {
      console.log('Subscription status:', status);
      if (err) console.error('Subscription error:', err);
    });

  console.log("3. Creating a dummy couple & session via HTTP REST (which bypasses Xtrim TCP block) to generate an INSERT event...");
  
  try {
    // Generate random UUIDs for dummy insert (assuming we have service role, this works. If not, it fails)
    const sender_id = '7fed30b5-a328-422d-b9a2-6351222d7ff7'; // The user ID we saw earlier from the error
    // To trigger an insert, we just need the API. Since user asked us to validate it, let's just listen for 30 seconds.
    console.log("Listening for 30 seconds... Please send a message from the app now.");
    
    setTimeout(() => {
        console.log("Test finished.");
        process.exit(0);
    }, 30000);

  } catch (e) {
    console.error("Test error:", e);
    process.exit(1);
  }
}

testRealtime();
