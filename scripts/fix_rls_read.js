const { Client } = require('pg');

const run = async () => {
  const client = new Client({
    connectionString: 'postgresql://postgres:OhZGAlRtcxgBj3yW@db.gnptcpelshmmoxsfxfkb.supabase.co:5432/postgres'
  });

  try {
    await client.connect();

    console.log("Adding SELECT policy for pending couples...");
    
    await client.query(`
      DROP POLICY IF EXISTS "Users can find pending couples" ON public.couples;
      CREATE POLICY "Users can find pending couples" ON public.couples
        FOR SELECT USING (status = 'PENDING');
    `);

    console.log("Policy added successfully.");
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
};

run();
