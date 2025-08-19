const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// Middleware to authenticate user with GitHub token
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Fetch user data from GitHub
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!userResponse.ok) {
      return res.status(401).json({ error: 'Invalid GitHub token' });
    }

    const userData = await userResponse.json();
    req.user = userData;
    req.token = token;
    next();
  } catch (error) {
    console.error('Authentication error:', error.message);
    res.status(401).json({ error: 'Authentication failed' });
  }
};

// GET /api/repositories - Get user's repositories
router.get('/', authenticateUser, async (req, res) => {
  try {
    console.log('📂 Fetching repositories for user:', req.user.login);

    // Get repositories from GitHub API
    const reposResponse = await fetch('https://api.github.com/user/repos?sort=updated&per_page=100', {
      headers: {
        'Authorization': `token ${req.token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!reposResponse.ok) {
      throw new Error(`GitHub API error: ${reposResponse.status}`);
    }

    const repositories = await reposResponse.json();
    
    // Store user in database if not exists
    const dbPool = pool();
    if (process.env.ENABLE_POSTGRES === 'true' && dbPool) {
      try {
        await dbPool.query(`
          INSERT INTO users (github_id, username, email, avatar_url, updated_at)
          VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
          ON CONFLICT (github_id) 
          DO UPDATE SET 
            username = EXCLUDED.username,
            email = EXCLUDED.email,
            avatar_url = EXCLUDED.avatar_url,
            updated_at = CURRENT_TIMESTAMP
        `, [req.user.id, req.user.login, req.user.email, req.user.avatar_url]);

        // Store repositories in database
        for (const repo of repositories) {
          await dbPool.query(`
            INSERT INTO repositories (github_repo_id, name, full_name, description, private, updated_at)
            VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
            ON CONFLICT (github_repo_id)
            DO UPDATE SET 
              name = EXCLUDED.name,
              full_name = EXCLUDED.full_name,
              description = EXCLUDED.description,
              private = EXCLUDED.private,
              updated_at = CURRENT_TIMESTAMP
          `, [repo.id, repo.name, repo.full_name, repo.description, repo.private]);
        }
      } catch (dbError) {
        console.error('Database storage error:', dbError.message);
        // Continue without database storage
      }
    }

    res.json({
      repositories: repositories,
      total: repositories.length
    });

  } catch (error) {
    console.error('Error fetching repositories:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch repositories',
      details: error.message 
    });
  }
});

// POST /api/repositories/sync - Sync repositories with database
router.post('/sync', authenticateUser, async (req, res) => {
  try {
    console.log('🔄 Syncing repositories to database...');
    
    const { repositories } = req.body;
    
    if (!repositories || !Array.isArray(repositories)) {
      return res.status(400).json({ error: 'Invalid repositories data' });
    }

    const dbPool = pool();
    if (process.env.ENABLE_POSTGRES === 'true' && dbPool) {
      // Store user first
      await dbPool.query(`
        INSERT INTO users (github_id, username, email, avatar_url, updated_at)
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
        ON CONFLICT (github_id) 
        DO UPDATE SET 
          username = EXCLUDED.username,
          email = EXCLUDED.email,
          avatar_url = EXCLUDED.avatar_url,
          updated_at = CURRENT_TIMESTAMP
      `, [req.user.id, req.user.login, req.user.email, req.user.avatar_url]);

      // Sync repositories
      let syncCount = 0;
      for (const repo of repositories) {
        try {
          await dbPool.query(`
            INSERT INTO repositories (github_repo_id, name, full_name, description, private, updated_at)
            VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
            ON CONFLICT (github_repo_id)
            DO UPDATE SET 
              name = EXCLUDED.name,
              full_name = EXCLUDED.full_name,
              description = EXCLUDED.description,
              private = EXCLUDED.private,
              updated_at = CURRENT_TIMESTAMP
          `, [repo.id, repo.name, repo.full_name, repo.description, repo.private]);
          syncCount++;
        } catch (repoError) {
          console.error(`Error syncing repo ${repo.name}:`, repoError.message);
        }
      }

      console.log(`✅ Synced ${syncCount} repositories to database`);
      
      res.json({
        success: true,
        synced: syncCount,
        total: repositories.length,
        message: 'Repositories synced successfully'
      });
    } else {
      res.json({
        success: true,
        message: 'Database not enabled, sync skipped'
      });
    }

  } catch (error) {
    console.error('Repository sync error:', error.message);
    res.status(500).json({ 
      error: 'Failed to sync repositories',
      details: error.message 
    });
  }
});

module.exports = router;
