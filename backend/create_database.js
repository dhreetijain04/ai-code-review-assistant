const { Client } = require('pg');

async function createDatabase() {
  // First connect to the default postgres database
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'Admin',
    database: 'postgres' // Connect to default database first
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL server');

    // Check if database exists
    const checkDbQuery = `
      SELECT 1 FROM pg_database WHERE datname = 'ai_code_review'
    `;
    const result = await client.query(checkDbQuery);

    if (result.rows.length === 0) {
      // Database doesn't exist, create it
      console.log('Creating ai_code_review database...');
      await client.query('CREATE DATABASE ai_code_review');
      console.log('✅ Database ai_code_review created successfully!');
    } else {
      console.log('✅ Database ai_code_review already exists');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

createDatabase();
