const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Repository = require('../models/Repository');
const fetch = require('node-fetch');
const router = express.Router();

// Helper function to automatically sync user repositories
const autoSyncRepositories = async (user, githubToken) => {
  try {
    console.log(`Auto-syncing repositories for user ${user.github_username}...`);
    
    // Fetch user's repositories from GitHub API
    const githubResponse = await fetch('https://api.github.com/user/repos?per_page=100', {
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'AI-Code-Review-Assistant'
      }
    });

    if (!githubResponse.ok) {
      console.warn('Failed to fetch repositories from GitHub for auto-sync');
      return;
    }

    const githubRepos = await githubResponse.json();
    console.log(`Found ${githubRepos.length} repositories on GitHub`);

    // Get existing repositories from database
    const existingRepos = await Repository.findByUserId(user.id);
    const existingGithubIds = new Set(existingRepos.map(repo => repo.github_repo_id));
    
    console.log(`Found ${existingRepos.length} existing repositories in database`);

    // Sync new repositories
    let syncedCount = 0;
    
    for (const githubRepo of githubRepos) {
      try {
        if (!existingGithubIds.has(githubRepo.id)) {
          // Create new repository
          console.log(`Auto-adding repository: ${githubRepo.name}`);
          const repositoryData = {
            user_id: user.id,
            github_repo_id: githubRepo.id,
            name: githubRepo.name,
            full_name: githubRepo.full_name,
            description: githubRepo.description,
            private: githubRepo.private,
            language: githubRepo.language,
            stars_count: githubRepo.stargazers_count || 0,
            forks_count: githubRepo.forks_count || 0,
            issues_count: githubRepo.open_issues_count || 0,
            is_active: true
          };
          
          await Repository.create(repositoryData);
          syncedCount++;
        }
      } catch (repoError) {
        console.error(`Error auto-syncing repository ${githubRepo.name}:`, repoError.message);
      }
    }

    console.log(`Auto-sync completed: ${syncedCount} new repositories added`);
    return { syncedCount, totalRepos: githubRepos.length };
  } catch (error) {
    console.error('Auto-sync repositories error:', error.message);
    return null;
  }
};

// Middleware to verify JWT token or GitHub token
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    // First try to verify as JWT token
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);
      
      if (user) {
        req.user = user;
        return next();
      }
    } catch (jwtError) {
      // JWT verification failed, try GitHub token
    }

    // If JWT fails, try GitHub token
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'AI-Code-Review-Assistant'
      }
    });

    if (response.ok) {
      const githubUser = await response.json();
      
      // Find or create user based on GitHub data
      let user = await User.findByGithubId(githubUser.id);
      
      if (!user) {
        // Create new user if doesn't exist
        const userData = {
          github_id: githubUser.id,
          github_username: githubUser.login,
          email: githubUser.email,
          avatar_url: githubUser.avatar_url,
          access_token: token
        };
        user = await User.create(userData);
        console.log(`New user created: ${user.github_username}`);
      } else {
        // Update existing user's access token
        user = await User.updateAccessToken(user.id, token);
      }
      
      // Auto-sync repositories for GitHub token users (run in background)
      if (token.startsWith('github_pat_')) {
        // Run sync in background without blocking the request
        setTimeout(() => {
          autoSyncRepositories(user, token).catch(error => {
            console.error('Background auto-sync failed:', error.message);
          });
        }, 100);
      }
      
      req.user = user;
      next();
    } else {
      return res.status(403).json({ error: 'Invalid token' });
    }
  } catch (error) {
    console.error('Authentication error:', error.message);
    return res.status(403).json({ error: 'Invalid token' });
  }
};

// Register/Login user with GitHub data
router.post('/auth/github', async (req, res) => {
  try {
    const { github_id, username, email, avatar_url, access_token } = req.body;

    if (!github_id || !username) {
      return res.status(400).json({ error: 'GitHub ID and username are required' });
    }

    const userData = {
      github_id,
      github_username: username,
      email,
      avatar_url,
      access_token
    };

    const user = await User.create(userData);

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, username: user.github_username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      user: {
        id: user.id,
        github_id: user.github_id,
        username: user.github_username,
        email: user.email,
        avatar_url: user.avatar_url,
        preferences: user.preferences
      },
      token
    });
  } catch (error) {
    console.error('Auth error:', error.message);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Manual repository sync endpoint
router.post('/sync-repositories', authenticateToken, async (req, res) => {
  try {
    let githubToken = null;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer github_pat_')) {
      githubToken = req.headers.authorization.replace('Bearer ', '');
    }
    
    if (!githubToken) {
      return res.status(400).json({ 
        error: 'GitHub token required for repository sync' 
      });
    }

    const result = await autoSyncRepositories(req.user, githubToken);
    
    if (result) {
      res.json({
        success: true,
        message: 'Repositories synced successfully',
        stats: {
          newRepos: result.syncedCount,
          totalGithubRepos: result.totalRepos
        }
      });
    } else {
      res.status(500).json({ error: 'Failed to sync repositories' });
    }
  } catch (error) {
    console.error('Manual sync error:', error.message);
    res.status(500).json({ error: 'Failed to sync repositories: ' + error.message });
  }
});

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    res.json({
      success: true,
      user: req.user
    });
  } catch (error) {
    console.error('Profile error:', error.message);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Update user preferences
router.put('/preferences', authenticateToken, async (req, res) => {
  try {
    const { preferences } = req.body;
    
    const updatedUser = await User.updatePreferences(req.user.id, preferences);
    
    res.json({
      success: true,
      user: updatedUser
    });
  } catch (error) {
    console.error('Preferences update error:', error.message);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// Get all users (admin endpoint)
router.get('/users', authenticateToken, async (req, res) => {
  try {
    const users = await User.getAllUsers();
    
    res.json({
      success: true,
      users
    });
  } catch (error) {
    console.error('Get users error:', error.message);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

module.exports = router;
module.exports.authenticateToken = authenticateToken;
