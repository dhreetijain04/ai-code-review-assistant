const express = require('express');
const CodeReview = require('../models/CodeReview');
const Repository = require('../models/Repository');
const User = require('../models/User');
const TeamMember = require('../models/TeamMember');
const { authenticateToken } = require('./auth');
const router = express.Router();

// Get dashboard data for the authenticated user
router.get('/', authenticateToken, async (req, res) => {
  try {
    console.log('Dashboard API called');
    
    // Get user data and stats
    const user = await User.findById(req.user.id);
    console.log('User found:', user ? user.username : 'none');
    
    // Get repository count
    const repositories = await Repository.findByUserId(req.user.id);
    console.log('Repositories found:', repositories.length);
    
    // Get review stats
    const reviewStats = await CodeReview.getReviewStats(req.user.id);
    console.log('Review stats:', reviewStats);
    
    // Get recent reviews
    const recentReviews = await CodeReview.getRecentReviews(req.user.id, 5);
    console.log('Recent reviews:', recentReviews.length);
    
    // Get real-time active PR count from all repositories
    let totalActivePRs = 0;
    const recentPullRequests = [];
    
    try {
      // Get all repositories for the user
      const repositories = await Repository.findByUserId(req.user.id);
      console.log(`Fetching real-time PR counts from ${repositories.length} repositories...`);
      
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        console.log('No GitHub token found, using database PR counts');
        // Fallback to database pr_count values
        totalActivePRs = repositories.reduce((sum, repo) => sum + (repo.pr_count || 0), 0);
      } else {
        // Fetch real-time PR counts from GitHub API
        for (const repo of repositories) {
          try {
            const response = await fetch(`https://api.github.com/repos/${repo.full_name}/pulls?state=open`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'AI-Code-Review-Assistant'
              }
            });
            
            if (response.ok) {
              const prs = await response.json();
              const activePRsCount = prs.length;
              totalActivePRs += activePRsCount;
              
              console.log(`${repo.name}: ${activePRsCount} active PRs`);
              
              // Update repository PR count in database
              await Repository.updatePRCount(repo.id, activePRsCount);
              
              // Add recent PRs to the list (limit to 3 most recent)
              const recentPRs = prs.slice(0, 3);
              for (const pr of recentPRs) {
                recentPullRequests.push({
                  id: `PR-${pr.number}`,
                  title: pr.title,
                  repository: repo.name,
                  author: pr.user.login,
                  timeAgo: getTimeAgo(new Date(pr.created_at)),
                  status: 'Open',
                  issuesFound: Math.floor(Math.random() * 5), // Mock data for now
                  severity: ['Low', 'Medium', 'High'][Math.floor(Math.random() * 3)]
                });
              }
            } else {
              console.log(`Failed to fetch PRs for ${repo.name}: ${response.status}`);
              // Use cached database count as fallback
              totalActivePRs += repo.pr_count || 0;
            }
          } catch (error) {
            console.error(`Error fetching PRs for ${repo.name}:`, error.message);
            // Use cached database count as fallback
            totalActivePRs += repo.pr_count || 0;
          }
        }
      }
    } catch (error) {
      console.error('Error fetching repositories or PRs:', error.message);
      // Keep totalActivePRs as is (0 if no PRs were successfully fetched)
    }
    
    console.log(`Total active PRs: ${totalActivePRs}`);
    console.log(`Recent PRs found: ${recentPullRequests.length}`);
    
    // If no real PRs found, use database reviews for recent PRs display
    if (recentPullRequests.length === 0 && recentReviews.length > 0) {
      recentReviews.forEach(review => {
        recentPullRequests.push({
          id: `PR-${review.pr_number || 'Unknown'}`,
          title: review.pr_title,
          repository: review.repository_name,
          author: review.pr_author,
          timeAgo: getTimeAgo(new Date(review.created_at)),
          status: review.review_status.charAt(0).toUpperCase() + review.review_status.slice(1),
          issuesFound: review.ai_feedback?.issues_count || 0,
          severity: review.severity.charAt(0).toUpperCase() + review.severity.slice(1)
        });
      });
    }
    
    // Calculate severity distribution
    const severityDistribution = [
      { name: 'Critical', value: parseInt(reviewStats?.high_severity_reviews || 0) * 0.3, color: '#ff0000' },
      { name: 'High', value: parseInt(reviewStats?.high_severity_reviews || 0) * 0.7, color: '#ff6b6b' },
      { name: 'Medium', value: parseInt(reviewStats?.medium_severity_reviews || 0), color: '#feca57' },
      { name: 'Low', value: parseInt(reviewStats?.low_severity_reviews || 0), color: '#00ff87' }
    ];

    // Generate review trends (mock data for now, could be replaced with actual data)
    const currentDate = new Date();
    const reviewTrends = [];
    
    for (let i = 5; i >= 0; i--) {
      const month = new Date(currentDate);
      month.setMonth(currentDate.getMonth() - i);
      const monthName = month.toLocaleString('default', { month: 'short' });
      
      reviewTrends.push({
        month: monthName,
        reviews: Math.floor(Math.random() * 10) + 15,
        pullRequests: Math.floor(Math.random() * 8) + 10,
        issuesFound: Math.floor(Math.random() * 15) + 20
      });
    }
    
    // Generate team performance data
    const teamMembers = await getTeamPerformanceData(req.user.id);
    
    // Construct response data
    const dashboardData = {
      overview: {
        totalRepositories: repositories.length,
        totalReviews: parseInt(reviewStats?.total_reviews || 0),
        activePullRequests: totalActivePRs, // Use real GitHub PR count
        teamMembers: teamMembers.length,
        totalIssuesFound: parseInt(reviewStats?.high_severity_reviews || 0) + 
                         parseInt(reviewStats?.medium_severity_reviews || 0) + 
                         parseInt(reviewStats?.low_severity_reviews || 0),
        criticalIssues: Math.round(parseInt(reviewStats?.high_severity_reviews || 0) * 0.3),
        fixedIssues: parseInt(reviewStats?.completed_reviews || 0),
        avgResolutionTime: reviewStats?.avg_resolution_time || 'N/A'
      },
      reviewTrends,
      teamPerformance: teamMembers,
      severityDistribution,
      recentPullRequests
    };
    
    res.json(dashboardData);
  } catch (error) {
    console.error('Dashboard data error:', error.message);
    res.status(500).json({ error: 'Failed to get dashboard data' });
  }
});

// Get team performance data for the authenticated user
router.get('/team', authenticateToken, async (req, res) => {
  try {
    const teamMembers = await getTeamPerformanceData(req.user.id);
    
    // Generate developer-specific issue types data
    const developerIssueTypes = teamMembers.map(member => {
      // Generate random issue distribution
      const securityCount = Math.floor(Math.random() * 30) + 20;
      const performanceCount = Math.floor(Math.random() * 25) + 15;
      const codeQualityCount = Math.floor(Math.random() * 20) + 10;
      const uiuxCount = Math.floor(Math.random() * 15) + 5;
      
      const total = securityCount + performanceCount + codeQualityCount + uiuxCount;
      
      return {
        developer: member.name,
        issues: [
          { type: 'Security', count: securityCount, percentage: Math.round((securityCount / total) * 100), color: '#ff6b6b' },
          { type: 'Performance', count: performanceCount, percentage: Math.round((performanceCount / total) * 100), color: '#ffd43b' },
          { type: 'Code Quality', count: codeQualityCount, percentage: Math.round((codeQualityCount / total) * 100), color: '#4dabf7' },
          { type: 'UI/UX', count: uiuxCount, percentage: Math.round((uiuxCount / total) * 100), color: '#51cf66' }
        ]
      };
    });
    
    // Generate timeline data
    const timelineData = [];
    const currentDate = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const week = new Date(currentDate);
      week.setDate(currentDate.getDate() - (i * 7));
      
      timelineData.push({
        date: `Week ${6-i}`,
        reviews: Math.floor(Math.random() * 10) + 25,
        fixes: Math.floor(Math.random() * 8) + 20,
        avgTime: (Math.random() * 1.5 + 1.5).toFixed(1)
      });
    }
    
    // Generate issue types data
    const issueTypes = [
      { name: 'Bugs', value: 35, color: '#ff6b6b' },
      { name: 'Performance', value: 25, color: '#4dabf7' },
      { name: 'Style', value: 20, color: '#51cf66' },
      { name: 'Security', value: 20, color: '#ffd43b' }
    ];
    
    res.json({
      performanceData: teamMembers,
      developerIssueTypes,
      timelineData,
      issueTypes
    });
  } catch (error) {
    console.error('Team performance data error:', error.message);
    res.status(500).json({ error: 'Failed to get team performance data' });
  }
});

// Helper function to generate time ago string
function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  
  let interval = Math.floor(seconds / 31536000);
  if (interval > 1) return interval + ' years ago';
  
  interval = Math.floor(seconds / 2592000);
  if (interval > 1) return interval + ' months ago';
  
  interval = Math.floor(seconds / 86400);
  if (interval > 1) return interval + ' days ago';
  if (interval === 1) return '1 day ago';
  
  interval = Math.floor(seconds / 3600);
  if (interval > 1) return interval + ' hours ago';
  if (interval === 1) return '1 hour ago';
  
  interval = Math.floor(seconds / 60);
  if (interval > 1) return interval + ' minutes ago';
  if (interval === 1) return '1 minute ago';
  
  return 'just now';
}

// Helper function to get team performance data
async function getTeamPerformanceData(userId) {
  try {
    // First try to get team members from the database
    const teamMembers = await TeamMember.getPerformanceMetrics('default');
    
    // If we have team members in the database, return them
    if (teamMembers && teamMembers.length > 0) {
      return teamMembers;
    }
    
    // Otherwise, return mock data
    return [
      { name: 'John Doe', reviews: 45, issues: 123, fixes: 98, avgTime: 2.5, efficiency: 82 },
      { name: 'Jane Smith', reviews: 38, issues: 95, fixes: 85, avgTime: 1.8, efficiency: 89 },
      { name: 'Bob Wilson', reviews: 42, issues: 110, fixes: 92, avgTime: 2.2, efficiency: 84 },
      { name: 'Alice Brown', reviews: 35, issues: 88, fixes: 78, avgTime: 1.5, efficiency: 92 }
    ];
  } catch (error) {
    console.error('Error getting team performance data:', error.message);
    return [
      { name: 'John Doe', reviews: 45, issues: 123, fixes: 98, avgTime: 2.5, efficiency: 82 },
      { name: 'Jane Smith', reviews: 38, issues: 95, fixes: 85, avgTime: 1.8, efficiency: 89 },
      { name: 'Bob Wilson', reviews: 42, issues: 110, fixes: 92, avgTime: 2.2, efficiency: 84 },
      { name: 'Alice Brown', reviews: 35, issues: 88, fixes: 78, avgTime: 1.5, efficiency: 92 }
    ];
  }
}

module.exports = router;
