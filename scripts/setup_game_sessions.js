const { Client } = require('pg');

const run = async () => {
  const client = new Client({
    connectionString: 'postgresql://postgres:OhZGAlRtcxgBj3yW@db.gnptcpelshmmoxsfxfkb.supabase.co:5432/postgres'
  });

  try {
    await client.connect();

    console.log("Configuring game_sessions table...");
    
    await client.query(`
      BEGIN;

      -- Enable Realtime for game_sessions
      ALTER PUBLICATION supabase_realtime ADD TABLE public.game_sessions;

      -- Add explicit INSERT policy for the host
      DROP POLICY IF EXISTS "Host can create session" ON public.game_sessions;
      CREATE POLICY "Host can create session" ON public.game_sessions
        FOR INSERT WITH CHECK (auth.uid() = host_id);

      -- Policy to allow participants to SELECT the session
      DROP POLICY IF EXISTS "Participants can view session" ON public.game_sessions;
      CREATE POLICY "Participants can view session" ON public.game_sessions
        FOR SELECT USING (
          auth.uid() = host_id OR 
          auth.uid() IN (
            SELECT user_a_id FROM public.couples WHERE id = couple_id
            UNION
            SELECT user_b_id FROM public.couples WHERE id = couple_id
          )
        );

      COMMIT;
    `);

    console.log("Configured successfully.");
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
};

run();
