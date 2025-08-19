const pool = require('../config/database');

class TeamMember {
  static async create(memberData) {
    try {
      const {
        user_id,
        team_name,
        role = 'developer',
        reviews_completed = 0,
        issues_found = 0,
        fixes_made = 0,
        avg_review_time = 0.0,
        performance_rating = 0.0
      } = memberData;

      const query = `
        INSERT INTO team_members 
        (user_id, team_name, role, reviews_completed, issues_found, fixes_made, avg_review_time, performance_rating)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const result = await pool.query(query, [
        user_id,
        team_name,
        role,
        reviews_completed,
        issues_found,
        fixes_made,
        avg_review_time,
        performance_rating
      ]);

      return result.rows[0];
    } catch (error) {
      console.error('Error creating team member:', error.message);
      throw error;
    }
  }

  static async findByUserId(userId) {
    try {
      const query = `
        SELECT 
          tm.*,
          u.github_username,
          u.avatar_url
        FROM team_members tm
        JOIN users u ON tm.user_id = u.id
        WHERE tm.user_id = $1
      `;
      const result = await pool.query(query, [userId]);
      return result.rows;
    } catch (error) {
      console.error('Error finding team members by user ID:', error.message);
      throw error;
    }
  }

  static async findByTeamName(teamName) {
    try {
      const query = `
        SELECT 
          tm.*,
          u.github_username,
          u.avatar_url
        FROM team_members tm
        JOIN users u ON tm.user_id = u.id
        WHERE tm.team_name = $1
      `;
      const result = await pool.query(query, [teamName]);
      return result.rows;
    } catch (error) {
      console.error('Error finding team members by team name:', error.message);
      throw error;
    }
  }

  static async updatePerformance(memberId, performanceData) {
    try {
      const {
        reviews_completed,
        issues_found,
        fixes_made,
        avg_review_time,
        performance_rating
      } = performanceData;

      const query = `
        UPDATE team_members
        SET 
          reviews_completed = $2,
          issues_found = $3,
          fixes_made = $4,
          avg_review_time = $5,
          performance_rating = $6,
          updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `;

      const result = await pool.query(query, [
        memberId,
        reviews_completed,
        issues_found,
        fixes_made,
        avg_review_time,
        performance_rating
      ]);

      return result.rows[0];
    } catch (error) {
      console.error('Error updating team member performance:', error.message);
      throw error;
    }
  }

  static async delete(memberId) {
    try {
      const query = `
        DELETE FROM team_members
        WHERE id = $1
        RETURNING *
      `;
      const result = await pool.query(query, [memberId]);
      return result.rows[0];
    } catch (error) {
      console.error('Error deleting team member:', error.message);
      throw error;
    }
  }

  static async getPerformanceMetrics(teamName) {
    try {
      const query = `
        SELECT 
          u.github_username as name,
          tm.reviews_completed as reviews,
          tm.issues_found as issues,
          tm.fixes_made as fixes,
          tm.avg_review_time as avg_time,
          tm.performance_rating as efficiency
        FROM team_members tm
        JOIN users u ON tm.user_id = u.id
        WHERE tm.team_name = $1
      `;
      const result = await pool.query(query, [teamName]);
      return result.rows;
    } catch (error) {
      console.error('Error getting team performance metrics:', error.message);
      throw error;
    }
  }
}

module.exports = TeamMember;
