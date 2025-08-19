const pool = require('../config/database');

class Repository {
  static async create(repositoryData) {
    try {
      const {
        user_id,
        github_repo_id,
        name,
        full_name,
        description,
        "private": isPrivate,
        language,
        stars_count,
        forks_count,
        issues_count
      } = repositoryData;

      const query = `
        INSERT INTO repositories 
        (user_id, github_repo_id, name, full_name, description, "private", language, stars_count, forks_count, issues_count)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (github_repo_id) 
        DO UPDATE SET 
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          stars_count = EXCLUDED.stars_count,
          forks_count = EXCLUDED.forks_count,
          issues_count = EXCLUDED.issues_count,
          updated_at = NOW()
        RETURNING *
      `;

      const result = await pool.query(query, [
        user_id,
        github_repo_id,
        name,
        full_name,
        description,
        isPrivate,
        language,
        stars_count,
        forks_count,
        issues_count
      ]);

      return result.rows[0];
    } catch (error) {
      console.error('Error creating repository:', error.message);
      throw error;
    }
  }

  static async findByUserId(userId) {
    try {
      const query = `
        SELECT 
          r.*,
          COUNT(cr.id) as total_reviews,
          MAX(cr.created_at) as last_review_at
        FROM repositories r
        LEFT JOIN code_reviews cr ON r.id = cr.repository_id
        WHERE r.user_id = $1 AND r.is_active = true
        GROUP BY r.id
        ORDER BY r.updated_at DESC
      `;
      const result = await pool.query(query, [userId]);
      return result.rows;
    } catch (error) {
      console.error('Error finding repositories by user ID:', error.message);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const query = `
        SELECT 
          r.*,
          COUNT(cr.id) as total_reviews,
          MAX(cr.created_at) as last_review_at
        FROM repositories r
        LEFT JOIN code_reviews cr ON r.id = cr.repository_id
        WHERE r.id = $1
        GROUP BY r.id
      `;
      const result = await pool.query(query, [id]);
      return result.rows[0];
    } catch (error) {
      console.error('Error finding repository by ID:', error.message);
      throw error;
    }
  }

  static async updateLastReview(repositoryId) {
    try {
      const query = `
        UPDATE repositories 
        SET last_review_at = NOW(), updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `;
      const result = await pool.query(query, [repositoryId]);
      return result.rows[0];
    } catch (error) {
      console.error('Error updating last review time:', error.message);
      throw error;
    }
  }

  static async getRepositoryStats(repositoryId) {
    try {
      const query = `
        SELECT 
          r.name,
          r.language,
          COUNT(cr.id) as total_reviews,
          COUNT(CASE WHEN cr.review_status = 'approved' THEN 1 END) as approved_reviews,
          COUNT(CASE WHEN cr.review_status = 'pending' THEN 1 END) as pending_reviews,
          COUNT(CASE WHEN cr.severity = 'high' THEN 1 END) as high_severity_issues,
          COUNT(CASE WHEN cr.severity = 'medium' THEN 1 END) as medium_severity_issues,
          COUNT(CASE WHEN cr.severity = 'low' THEN 1 END) as low_severity_issues,
          AVG(cr.files_changed) as avg_files_changed,
          AVG(cr.additions) as avg_additions,
          AVG(cr.deletions) as avg_deletions
        FROM repositories r
        LEFT JOIN code_reviews cr ON r.id = cr.repository_id
        WHERE r.id = $1
        GROUP BY r.id, r.name, r.language
      `;
      const result = await pool.query(query, [repositoryId]);
      return result.rows[0];
    } catch (error) {
      console.error('Error getting repository stats:', error.message);
      throw error;
    }
  }

  static async deactivate(repositoryId) {
    try {
      const query = `
        UPDATE repositories 
        SET is_active = false, updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `;
      const result = await pool.query(query, [repositoryId]);
      return result.rows[0];
    } catch (error) {
      console.error('Error deactivating repository:', error.message);
      throw error;
    }
  }

  static async updatePRCount(repositoryId, prCount) {
    try {
      const query = `
        UPDATE repositories 
        SET pr_count = $2, updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `;
      const result = await pool.query(query, [repositoryId, prCount]);
      return result.rows[0];
    } catch (error) {
      console.error('Error updating PR count:', error.message);
      throw error;
    }
  }
}

module.exports = Repository;
