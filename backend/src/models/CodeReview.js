const pool = require('../config/database');

class CodeReview {
  static async create(reviewData) {
    try {
      const {
        user_id,
        repository_id,
        pr_number,
        pr_title,
        pr_author,
        pr_branch,
        review_status = 'pending',
        severity = 'medium',
        files_changed = 0,
        additions = 0,
        deletions = 0,
        comments_count = 0,
        ai_feedback = {},
        reviewer_notes = ''
      } = reviewData;

      const query = `
        INSERT INTO code_reviews 
        (user_id, repository_id, pr_number, pr_title, pr_author, pr_branch, 
         review_status, severity, files_changed, additions, deletions, 
         comments_count, ai_feedback, reviewer_notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *
      `;

      const result = await pool.query(query, [
        user_id,
        repository_id,
        pr_number,
        pr_title,
        pr_author,
        pr_branch,
        review_status,
        severity,
        files_changed,
        additions,
        deletions,
        comments_count,
        JSON.stringify(ai_feedback),
        reviewer_notes
      ]);

      return result.rows[0];
    } catch (error) {
      console.error('Error creating code review:', error.message);
      throw error;
    }
  }

  static async findByUserId(userId, limit = 50, offset = 0) {
    try {
      const query = `
        SELECT 
          cr.*,
          r.name as repository_name,
          r.full_name as repository_full_name
        FROM code_reviews cr
        JOIN repositories r ON cr.repository_id = r.id
        WHERE cr.user_id = $1
        ORDER BY cr.created_at DESC
        LIMIT $2 OFFSET $3
      `;
      const result = await pool.query(query, [userId, limit, offset]);
      return result.rows;
    } catch (error) {
      console.error('Error finding code reviews by user ID:', error.message);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const query = `
        SELECT 
          cr.*,
          r.name as repository_name,
          r.full_name as repository_full_name,
          u.github_username
        FROM code_reviews cr
        JOIN repositories r ON cr.repository_id = r.id
        JOIN users u ON cr.user_id = u.id
        WHERE cr.id = $1
      `;
      const result = await pool.query(query, [id]);
      return result.rows[0];
    } catch (error) {
      console.error('Error finding code review by ID:', error.message);
      throw error;
    }
  }

  static async updateStatus(reviewId, status, reviewerNotes = '') {
    try {
      const query = `
        UPDATE code_reviews 
        SET review_status = $2, reviewer_notes = $3, updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `;
      const result = await pool.query(query, [reviewId, status, reviewerNotes]);
      return result.rows[0];
    } catch (error) {
      console.error('Error updating review status:', error.message);
      throw error;
    }
  }

  static async addAIFeedback(reviewId, aiFeedback) {
    try {
      const query = `
        UPDATE code_reviews 
        SET ai_feedback = $2, updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `;
      const result = await pool.query(query, [reviewId, JSON.stringify(aiFeedback)]);
      return result.rows[0];
    } catch (error) {
      console.error('Error adding AI feedback:', error.message);
      throw error;
    }
  }

  static async getReviewStats(userId) {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_reviews,
          COUNT(CASE WHEN review_status = 'approved' THEN 1 END) as approved_reviews,
          COUNT(CASE WHEN review_status = 'pending' THEN 1 END) as pending_reviews,
          COUNT(CASE WHEN review_status = 'rejected' THEN 1 END) as rejected_reviews,
          COUNT(CASE WHEN review_status IN ('approved', 'completed') THEN 1 END) as completed_reviews,
          COUNT(CASE WHEN severity = 'high' THEN 1 END) as high_severity_reviews,
          COUNT(CASE WHEN severity = 'medium' THEN 1 END) as medium_severity_reviews,
          COUNT(CASE WHEN severity = 'low' THEN 1 END) as low_severity_reviews,
          AVG(files_changed) as avg_files_changed,
          AVG(additions) as avg_additions,
          AVG(deletions) as avg_deletions,
          AVG(comments_count) as avg_comments,
          AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/86400)::NUMERIC(10,1) as avg_resolution_days
        FROM code_reviews
        WHERE user_id = $1
      `;
      const result = await pool.query(query, [userId]);
      
      // Format the average resolution time
      const stats = result.rows[0];
      if (stats.avg_resolution_days) {
        stats.avg_resolution_time = `${stats.avg_resolution_days} days`;
      } else {
        stats.avg_resolution_time = 'N/A';
      }
      
      return stats;
    } catch (error) {
      console.error('Error getting review stats:', error.message);
      throw error;
    }
  }

  static async getRecentReviews(userId, limit = 10) {
    try {
      const query = `
        SELECT 
          cr.id,
          cr.pr_title,
          cr.pr_author,
          cr.review_status,
          cr.severity,
          cr.created_at,
          r.name as repository_name
        FROM code_reviews cr
        JOIN repositories r ON cr.repository_id = r.id
        WHERE cr.user_id = $1
        ORDER BY cr.created_at DESC
        LIMIT $2
      `;
      const result = await pool.query(query, [userId, limit]);
      return result.rows;
    } catch (error) {
      console.error('Error getting recent reviews:', error.message);
      throw error;
    }
  }

  static async getReviewsByStatus(userId, status) {
    try {
      const query = `
        SELECT 
          cr.*,
          r.name as repository_name,
          r.full_name as repository_full_name
        FROM code_reviews cr
        JOIN repositories r ON cr.repository_id = r.id
        WHERE cr.user_id = $1 AND cr.review_status = $2
        ORDER BY cr.created_at DESC
      `;
      const result = await pool.query(query, [userId, status]);
      return result.rows;
    } catch (error) {
      console.error('Error getting reviews by status:', error.message);
      throw error;
    }
  }
}

module.exports = CodeReview;
