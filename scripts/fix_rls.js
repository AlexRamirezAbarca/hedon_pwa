const { Client } = require('pg');

const run = async () => {
  const client = new Client({
    connectionString: 'postgresql://postgres:OhZGAlRtcxgBj3yW@db.gnptcpelshmmoxsfxfkb.supabase.co:5432/postgres'
  });

  try {
    await client.connect();

    // Ensure the profile exists for the user
    console.log("Checking profiles...");
    const missingProfiles = await client.query(`
      INSERT INTO public.profiles (id, email)
      SELECT id, email FROM auth.users 
      WHERE NOT EXISTS (SELECT 1 FROM public.profiles WHERE public.profiles.id = auth.users.id)
      RETURNING id;
    `);
    console.log("Inserted missing profiles:", missingProfiles.rowCount);

    console.log("Adding policies...");
    
    // Add INSERT policy for couples
    await client.query(`
      DROP POLICY IF EXISTS "Users can create couple" ON public.couples;
      CREATE POLICY "Users can create couple" ON public.couples
        FOR INSERT WITH CHECK (auth.uid() = user_a_id);
    `);

    // Add UPDATE policy for couples
    await client.query(`
      DROP POLICY IF EXISTS "Users can update couple" ON public.couples;
      CREATE POLICY "Users can update couple" ON public.couples
        FOR UPDATE USING (auth.uid() = user_a_id OR auth.uid() = user_b_id OR auth.uid() IS NOT NULL);
    `);

    console.log("Policies added successfully.");
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
};

run();
