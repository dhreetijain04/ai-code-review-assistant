const pool = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  static async create(userData) {
    try {
      const {
        github_id,
        github_username,
        email,
        avatar_url,
        access_token
      } = userData;

      // Hash the access token for security
      const access_token_hash = access_token ? await bcrypt.hash(access_token, 10) : null;

      const query = `
        INSERT INTO users (github_id, github_username, email, avatar_url, access_token_hash, preferences)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (github_username) 
        DO UPDATE SET 
          email = EXCLUDED.email,
          avatar_url = EXCLUDED.avatar_url,
          access_token_hash = EXCLUDED.access_token_hash,
          updated_at = NOW()
        RETURNING id, github_id, github_username, email, avatar_url, preferences, created_at, updated_at
      `;

      const result = await pool.query(query, [
        github_id,
        github_username,
        email,
        avatar_url,
        access_token_hash,
        JSON.stringify({})
      ]);

      return result.rows[0];
    } catch (error) {
      console.error('Error creating user:', error.message);
      throw error;
    }
  }

  static async findByGithubId(githubId) {
    try {
      const query = `
        SELECT id, github_id, github_username, email, avatar_url, preferences, created_at, updated_at
        FROM users 
        WHERE github_id = $1
      `;
      const result = await pool.query(query, [githubId]);
      return result.rows[0];
    } catch (error) {
      console.error('Error finding user by GitHub ID:', error.message);
      throw error;
    }
  }

  static async updateAccessToken(userId, accessToken) {
    try {
      const access_token_hash = accessToken ? await bcrypt.hash(accessToken, 10) : null;
      
      const query = `
        UPDATE users 
        SET access_token_hash = $2, updated_at = NOW()
        WHERE id = $1
        RETURNING id, github_id, github_username, email, avatar_url, preferences, created_at, updated_at
      `;
      const result = await pool.query(query, [userId, access_token_hash]);
      return result.rows[0];
    } catch (error) {
      console.error('Error updating access token:', error.message);
      throw error;
    }
  }

  static async findByGithubUsername(username) {
    try {
      const query = `
        SELECT id, github_id, github_username, email, avatar_url, preferences, created_at, updated_at
        FROM users 
        WHERE github_username = $1
      `;
      const result = await pool.query(query, [username]);
      return result.rows[0];
    } catch (error) {
      console.error('Error finding user by username:', error.message);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const query = `
        SELECT id, github_id, github_username, email, avatar_url, preferences, created_at, updated_at
        FROM users 
        WHERE id = $1
      `;
      const result = await pool.query(query, [id]);
      return result.rows[0];
    } catch (error) {
      console.error('Error finding user by ID:', error.message);
      throw error;
    }
  }

  static async updatePreferences(userId, preferences) {
    try {
      const query = `
        UPDATE users 
        SET preferences = $2, updated_at = NOW()
        WHERE id = $1
        RETURNING id, github_username, preferences
      `;
      const result = await pool.query(query, [userId, JSON.stringify(preferences)]);
      return result.rows[0];
    } catch (error) {
      console.error('Error updating user preferences:', error.message);
      throw error;
    }
  }

  static async verifyAccessToken(userId, token) {
    try {
      const query = 'SELECT access_token_hash FROM users WHERE id = $1';
      const result = await pool.query(query, [userId]);
      
      if (result.rows.length === 0) return false;
      
      const hashedToken = result.rows[0].access_token_hash;
      return hashedToken ? await bcrypt.compare(token, hashedToken) : false;
    } catch (error) {
      console.error('Error verifying access token:', error.message);
      return false;
    }
  }

  static async getAllUsers() {
    try {
      const query = `
        SELECT 
          u.id, u.github_username, u.email, u.avatar_url,
          COUNT(cr.id) as total_reviews,
          COUNT(r.id) as total_repositories,
          u.created_at
        FROM users u
        LEFT JOIN code_reviews cr ON u.id = cr.user_id
        LEFT JOIN repositories r ON u.id = r.user_id
        GROUP BY u.id, u.github_username, u.email, u.avatar_url, u.created_at
        ORDER BY total_reviews DESC
      `;
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('Error getting all users:', error.message);
      throw error;
    }
  }
}

module.exports = User;
