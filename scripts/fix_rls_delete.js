const { Client } = require('pg');

const run = async () => {
  const client = new Client({
    connectionString: 'postgresql://postgres:OhZGAlRtcxgBj3yW@db.gnptcpelshmmoxsfxfkb.supabase.co:5432/postgres'
  });

  try {
    await client.connect();

    console.log("Adding DELETE policy for couples...");
    
    await client.query(`
      DROP POLICY IF EXISTS "Users can delete couple" ON public.couples;
      CREATE POLICY "Users can delete couple" ON public.couples
        FOR DELETE USING (auth.uid() = user_a_id OR auth.uid() = user_b_id);
    `);

    console.log("Delete Policy added successfully.");
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
};

run();
