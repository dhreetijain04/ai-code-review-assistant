const { pool } = require('./src/config/database');

async function addSampleReviews() {
  try {
    console.log('Adding sample review data...');
    
    // First, let's check if we have repositories and users
    const repoResult = await pool.query('SELECT id, name FROM repositories LIMIT 3');
    console.log('Available repositories:', repoResult.rows);
    
    if (repoResult.rows.length === 0) {
      console.log('No repositories found. Adding a sample repository...');
      const repoInsert = await pool.query(`
        INSERT INTO repositories (name, full_name, description, language, github_repo_id)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, ['sample-repo', 'user/sample-repo', 'Sample repository for testing', 'JavaScript', 12345]);
      console.log('Added sample repository with ID:', repoInsert.rows[0].id);
    }
    
    // Get repositories again
    const repos = await pool.query('SELECT id, name FROM repositories LIMIT 3');
    
    // Sample review data
    const sampleReviews = [
      {
        user_id: 1,
        repository_id: repos.rows[0].id,
        pr_number: 101,
        pr_title: 'Add user authentication system',
        pr_author: 'john.doe',
        pr_branch: 'feature/auth-system',
        review_status: 'approved',
        severity: 'medium',
        files_changed: 8,
        additions: 245,
        deletions: 23,
        comments_count: 3,
        ai_feedback: {
          suggestions: [
            'Consider using bcrypt for password hashing',
            'Add input validation for email addresses',
            'Implement rate limiting for login attempts'
          ],
          analysis_summary: 'Good implementation of authentication with room for security improvements',
          issues_count: 3
        },
        reviewer_notes: 'Well-structured code with good separation of concerns. Added security recommendations.'
      },
      {
        user_id: 1,
        repository_id: repos.rows[0].id,
        pr_number: 102,
        pr_title: 'Fix database connection pool issue',
        pr_author: 'jane.smith',
        pr_branch: 'bugfix/db-pool',
        review_status: 'completed',
        severity: 'high',
        files_changed: 3,
        additions: 67,
        deletions: 12,
        comments_count: 2,
        ai_feedback: {
          suggestions: [
            'Add connection pool monitoring',
            'Implement proper error handling for connection failures'
          ],
          analysis_summary: 'Critical bug fix that resolves database connection issues',
          issues_count: 2
        },
        reviewer_notes: 'Excellent fix for the connection pool issue. Tested locally and works perfectly.'
      },
      {
        user_id: 1,
        repository_id: repos.rows.length > 1 ? repos.rows[1].id : repos.rows[0].id,
        pr_number: 103,
        pr_title: 'Implement dark mode theme',
        pr_author: 'alex.wilson',
        pr_branch: 'feature/dark-mode',
        review_status: 'pending',
        severity: 'low',
        files_changed: 15,
        additions: 189,
        deletions: 45,
        comments_count: 5,
        ai_feedback: {
          suggestions: [
            'Consider using CSS custom properties for theme variables',
            'Add accessibility support for high contrast mode',
            'Implement smooth transitions between themes'
          ],
          analysis_summary: 'Good UI enhancement with proper theme implementation',
          issues_count: 3
        },
        reviewer_notes: 'Nice implementation of dark mode. Suggested some accessibility improvements.'
      }
    ];

    for (const review of sampleReviews) {
      const result = await pool.query(`
        INSERT INTO code_reviews 
        (user_id, repository_id, pr_number, pr_title, pr_author, pr_branch, 
         review_status, severity, files_changed, additions, deletions, 
         comments_count, ai_feedback, reviewer_notes, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW() - INTERVAL '2 days' + random() * INTERVAL '2 days')
        RETURNING id, pr_title
      `, [
        review.user_id,
        review.repository_id,
        review.pr_number,
        review.pr_title,
        review.pr_author,
        review.pr_branch,
        review.review_status,
        review.severity,
        review.files_changed,
        review.additions,
        review.deletions,
        review.comments_count,
        JSON.stringify(review.ai_feedback),
        review.reviewer_notes
      ]);
      
      console.log(`✅ Added review: ${result.rows[0].pr_title} (ID: ${result.rows[0].id})`);
    }

    console.log('\n🎉 Sample review data added successfully!');
    
    // Verify the data
    const verifyResult = await pool.query('SELECT COUNT(*) as count FROM code_reviews');
    console.log(`Total reviews in database: ${verifyResult.rows[0].count}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error adding sample reviews:', error);
    process.exit(1);
  }
}

addSampleReviews();
