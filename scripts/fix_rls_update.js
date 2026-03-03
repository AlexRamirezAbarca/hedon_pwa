const { Client } = require('pg');

const run = async () => {
  const client = new Client({
    connectionString: 'postgresql://postgres:OhZGAlRtcxgBj3yW@db.gnptcpelshmmoxsfxfkb.supabase.co:5432/postgres'
  });

  try {
    await client.connect();

    console.log("Adding UPDATE policy to game_sessions...");
    await client.query(`
      DROP POLICY IF EXISTS "Host can update session" ON public.game_sessions;
      CREATE POLICY "Host can update session" ON public.game_sessions
        FOR UPDATE USING (auth.uid() = host_id) WITH CHECK (auth.uid() = host_id);
    `);

    console.log("Policy added successfully.");
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
};

run();
