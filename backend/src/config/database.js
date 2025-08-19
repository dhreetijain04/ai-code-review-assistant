const { Pool } = require('pg');

let pool = null;

const connectToDatabase = async () => {
  try {
    if (process.env.ENABLE_POSTGRES === 'true') {
      console.log('🔄 Connecting to PostgreSQL database...');
      
      pool = new Pool({
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'ai_code_review',
        password: process.env.DB_PASSWORD || 'password',
        port: process.env.DB_PORT || 5432,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });

      // Test the connection
      await pool.query('SELECT NOW()');
      console.log('✅ Connected to PostgreSQL database');
      return pool;
    } else {
      console.log('📝 PostgreSQL disabled, running without database');
      return null;
    }
  } catch (error) {
    console.error('❌ Failed to connect to PostgreSQL:', error.message);
    console.log('⚠️ Continuing without database connection');
    pool = null;
    return null;
  }
};

const initializeDatabase = async () => {
  if (!pool) {
    console.log('⚠️ No database connection available');
    return;
  }

  try {
    console.log('🔄 Creating database tables...');
    
    // Drop existing tables if they have wrong schema
    try {
      await pool.query('DROP TABLE IF EXISTS code_reviews CASCADE');
      await pool.query('DROP TABLE IF EXISTS team_members CASCADE');
      await pool.query('DROP TABLE IF EXISTS repositories CASCADE');
      await pool.query('DROP TABLE IF EXISTS users CASCADE');
      console.log('🗑️ Dropped existing tables to ensure clean schema');
    } catch (dropError) {
      console.log('⚠️ Could not drop tables (may not exist):', dropError.message);
    }
    
    // Create tables if they don't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        github_id INTEGER UNIQUE,
        username VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        avatar_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS repositories (
        id SERIAL PRIMARY KEY,
        github_repo_id INTEGER UNIQUE,
        name VARCHAR(255) NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        description TEXT,
        private BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS code_reviews (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        repository_name VARCHAR(255) NOT NULL,
        pr_number INTEGER,
        pr_title TEXT,
        code_content TEXT,
        language VARCHAR(50),
        review_status VARCHAR(50) DEFAULT 'pending',
        severity VARCHAR(50),
        quality_score INTEGER,
        ai_feedback JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS team_members (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        role VARCHAR(100),
        github_username VARCHAR(255),
        avatar_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ Database tables created successfully!');
  } catch (error) {
    console.error('❌ Failed to create database tables:', error.message);
    throw error;
  }
};

module.exports = {
  pool: () => pool,
  connectToDatabase,
  initializeDatabase
};