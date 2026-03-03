const { Client } = require('pg');

const run = async () => {
  // Supabase IPv4 Poolers syntax: postgres://postgres.[project-ref]:[password]@[region].pooler.supabase.com:6543/postgres
  const pwd = "OhZGAlRtcxgBj3yW";
  const ref = "gnptcpelshmmoxsfxfkb";
  
  const poolers = [
    `postgresql://postgres.${ref}:${pwd}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`,
    `postgresql://postgres.${ref}:${pwd}@aws-0-sa-east-1.pooler.supabase.com:6543/postgres`,
    `postgresql://postgres.${ref}:${pwd}@aws-0-us-west-1.pooler.supabase.com:6543/postgres`
  ];

  for (const pooler of poolers) {
    console.log("Trying:", pooler.split('@')[1]);
    const client = new Client({ connectionString: pooler });
    try {
      await client.connect();
      console.log("SUCCESS connected to", pooler.split('@')[1]);
      
      console.log("Creating game_messages table and policies...");
      await client.query(`
        BEGIN;

        -- Create game_messages table
        CREATE TABLE IF NOT EXISTS public.game_messages (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          session_id UUID REFERENCES public.game_sessions(id) ON DELETE CASCADE NOT NULL,
          sender_id UUID REFERENCES public.profiles(id),
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
      console.log("TABLE CONFIGURED SUCCESSFULLY!");
      await client.end();
      return;
    } catch (e) {
      console.log("Failed:", e.message);
    }
  }
  
  console.log("ALL POOLERS FAILED");
}

run();
