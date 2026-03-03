const { Client } = require('pg');

const run = async () => {
  const client = new Client({
    connectionString: 'postgresql://postgres:OhZGAlRtcxgBj3yW@db.gnptcpelshmmoxsfxfkb.supabase.co:5432/postgres'
  });

  try {
    await client.connect();

    console.log("Checking and enabling Realtime for 'couples'...");
    
    // Add couples to the supabase_realtime publication
    await client.query(`
      BEGIN;
      -- Drop the publication to alter it safely if it exists (Supabase custom handling)
      ALTER PUBLICATION supabase_realtime ADD TABLE public.couples;
      COMMIT;
    `);

    console.log("Realtime enabled successfully for public.couples.");
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
};

run();
