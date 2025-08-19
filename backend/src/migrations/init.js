const pool = require('../config/database');

const createTables = async () => {
  try {
    console.log('🔄 Creating database tables...');

    // Users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        github_id INTEGER UNIQUE,
        github_username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255),
        avatar_url TEXT,
        access_token_hash VARCHAR(255),
        preferences JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Repositories table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS repositories (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        github_repo_id INTEGER,
        name VARCHAR(255) NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        description TEXT,
        private BOOLEAN DEFAULT false,
        language VARCHAR(100),
        stars_count INTEGER DEFAULT 0,
        forks_count INTEGER DEFAULT 0,
        issues_count INTEGER DEFAULT 0,
        pr_count INTEGER DEFAULT 0,
        last_review_at TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Add pr_count column if it doesn't exist
    await pool.query(`
      ALTER TABLE repositories 
      ADD COLUMN IF NOT EXISTS pr_count INTEGER DEFAULT 0;
    `);

    // Code reviews table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS code_reviews (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        repository_id INTEGER REFERENCES repositories(id) ON DELETE CASCADE,
        pr_number INTEGER,
        pr_title VARCHAR(500),
        pr_author VARCHAR(255),
        pr_branch VARCHAR(255),
        review_status VARCHAR(50) DEFAULT 'pending',
        severity VARCHAR(20) DEFAULT 'medium',
        files_changed INTEGER DEFAULT 0,
        additions INTEGER DEFAULT 0,
        deletions INTEGER DEFAULT 0,
        comments_count INTEGER DEFAULT 0,
        ai_feedback JSONB DEFAULT '{}',
        reviewer_notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // AI analysis results table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ai_analysis (
        id SERIAL PRIMARY KEY,
        review_id INTEGER REFERENCES code_reviews(id) ON DELETE CASCADE,
        analysis_type VARCHAR(100) NOT NULL,
        findings JSONB DEFAULT '{}',
        confidence_score DECIMAL(3,2) DEFAULT 0.0,
        suggestions JSONB DEFAULT '[]',
        issues_found INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Team members table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS team_members (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        team_name VARCHAR(255) NOT NULL,
        role VARCHAR(100) DEFAULT 'developer',
        reviews_completed INTEGER DEFAULT 0,
        issues_found INTEGER DEFAULT 0,
        fixes_made INTEGER DEFAULT 0,
        avg_review_time DECIMAL(5,2) DEFAULT 0.0,
        performance_rating DECIMAL(3,2) DEFAULT 0.0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Review history table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS review_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        review_id INTEGER REFERENCES code_reviews(id) ON DELETE CASCADE,
        action VARCHAR(100) NOT NULL,
        details JSONB DEFAULT '{}',
        timestamp TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create indexes for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_github_username ON users(github_username);
      CREATE INDEX IF NOT EXISTS idx_repositories_user_id ON repositories(user_id);
      CREATE INDEX IF NOT EXISTS idx_code_reviews_user_id ON code_reviews(user_id);
      CREATE INDEX IF NOT EXISTS idx_code_reviews_repository_id ON code_reviews(repository_id);
      CREATE INDEX IF NOT EXISTS idx_code_reviews_status ON code_reviews(review_status);
      CREATE INDEX IF NOT EXISTS idx_ai_analysis_review_id ON ai_analysis(review_id);
      CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
      CREATE INDEX IF NOT EXISTS idx_review_history_user_id ON review_history(user_id);
    `);

    console.log('✅ Database tables created successfully!');
  } catch (error) {
    console.error('❌ Error creating database tables:', error.message);
    throw error;
  }
};

const dropTables = async () => {
  try {
    console.log('🔄 Dropping database tables...');
    
    await pool.query('DROP TABLE IF EXISTS review_history CASCADE;');
    await pool.query('DROP TABLE IF EXISTS team_members CASCADE;');
    await pool.query('DROP TABLE IF EXISTS ai_analysis CASCADE;');
    await pool.query('DROP TABLE IF EXISTS code_reviews CASCADE;');
    await pool.query('DROP TABLE IF EXISTS repositories CASCADE;');
    await pool.query('DROP TABLE IF EXISTS users CASCADE;');
    
    console.log('✅ Database tables dropped successfully!');
  } catch (error) {
    console.error('❌ Error dropping database tables:', error.message);
    throw error;
  }
};

const seedDatabase = async () => {
  try {
    console.log('🔄 Seeding database with sample data...');

    // Insert sample user
    const userResult = await pool.query(`
      INSERT INTO users (github_id, github_username, email, avatar_url, preferences)
      VALUES (12345, 'demo_user', 'demo@example.com', 'https://avatars.githubusercontent.com/u/12345', '{"theme": "dark", "notifications": true}')
      ON CONFLICT (github_username) DO NOTHING
      RETURNING id;
    `);

    if (userResult.rows.length > 0) {
      const userId = userResult.rows[0].id;

      // Insert sample repositories
      await pool.query(`
        INSERT INTO repositories (user_id, github_repo_id, name, full_name, description, language, stars_count, forks_count)
        VALUES 
        ($1, 1001, 'ai-code-review-assistant', 'demo_user/ai-code-review-assistant', 'AI-powered code review assistant', 'JavaScript', 25, 5),
        ($1, 1002, 'react-dashboard', 'demo_user/react-dashboard', 'Modern React dashboard', 'TypeScript', 15, 3),
        ($1, 1003, 'node-api-server', 'demo_user/node-api-server', 'RESTful API server', 'JavaScript', 8, 2)
        ON CONFLICT DO NOTHING;
      `, [userId]);

      // Insert sample code reviews
      await pool.query(`
        INSERT INTO code_reviews (user_id, repository_id, pr_number, pr_title, pr_author, review_status, severity, files_changed, additions, deletions)
        VALUES 
        ($1, (SELECT id FROM repositories WHERE name = 'ai-code-review-assistant' LIMIT 1), 123, 'Add authentication system', 'johndoe', 'approved', 'high', 12, 456, 123),
        ($1, (SELECT id FROM repositories WHERE name = 'react-dashboard' LIMIT 1), 98, 'Optimize database queries', 'janedoe', 'reviewed', 'medium', 4, 89, 45),
        ($1, (SELECT id FROM repositories WHERE name = 'node-api-server' LIMIT 1), 67, 'Fix mobile navigation', 'bobsmith', 'pending', 'low', 2, 34, 12)
        ON CONFLICT DO NOTHING;
      `, [userId]);
    }

    console.log('✅ Database seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding database:', error.message);
    throw error;
  }
};

module.exports = {
  createTables,
  dropTables,
  seedDatabase
};
