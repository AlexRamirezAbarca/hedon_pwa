const { Client } = require('pg');

const run = async () => {
  const client = new Client({
    connectionString: 'postgresql://postgres:OhZGAlRtcxgBj3yW@db.gnptcpelshmmoxsfxfkb.supabase.co:5432/postgres'
  });

  try {
    await client.connect();

    console.log("Configuring messages table...");
    
    await client.query(`
      BEGIN;

      -- Create game_messages table
      CREATE TABLE IF NOT EXISTS public.game_messages (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        session_id UUID REFERENCES public.game_sessions(id) ON DELETE CASCADE NOT NULL,
        sender_id UUID REFERENCES public.profiles(id), -- Null if AI
        role TEXT NOT NULL CHECK (role IN ('system', 'ai', 'user')),
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Enable RLS
      ALTER TABLE public.game_messages ENABLE ROW LEVEL SECURITY;

      -- Allow session participants to view messages
      DROP POLICY IF EXISTS "Participants can view messages" ON public.game_messages;
      CREATE POLICY "Participants can view messages" ON public.game_messages
        FOR SELECT USING (
          EXISTS (
            SELECT 1 FROM public.game_sessions gs
            WHERE gs.id = session_id AND (
              auth.uid() = gs.host_id OR 
              auth.uid() IN (
                SELECT c.user_a_id FROM public.couples c WHERE c.id = gs.couple_id
                UNION
                SELECT c.user_b_id FROM public.couples c WHERE c.id = gs.couple_id
              )
            )
          )
        );

      -- Allow session participants to insert messages
      DROP POLICY IF EXISTS "Participants can insert messages" ON public.game_messages;
      CREATE POLICY "Participants can insert messages" ON public.game_messages
        FOR INSERT WITH CHECK (
          EXISTS (
            SELECT 1 FROM public.game_sessions gs
            WHERE gs.id = session_id AND (
              auth.uid() = gs.host_id OR 
              auth.uid() IN (
                SELECT c.user_a_id FROM public.couples c WHERE c.id = gs.couple_id
                UNION
                SELECT c.user_b_id FROM public.couples c WHERE c.id = gs.couple_id
              )
            )
          )
        );

      -- Enable Realtime for game_messages
      ALTER PUBLICATION supabase_realtime ADD TABLE public.game_messages;

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
