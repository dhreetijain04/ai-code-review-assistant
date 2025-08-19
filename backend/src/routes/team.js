const express = require('express');
const TeamMember = require('../models/TeamMember');
const User = require('../models/User');
const { authenticateToken } = require('./auth');
const router = express.Router();

// Get all team members for the authenticated user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const teamMembers = await TeamMember.findByUserId(req.user.id);
    
    res.json({
      success: true,
      teamMembers
    });
  } catch (error) {
    console.error('Get team members error:', error.message);
    res.status(500).json({ error: 'Failed to get team members' });
  }
});

// Get team members by team name
router.get('/team/:teamName', authenticateToken, async (req, res) => {
  try {
    const teamMembers = await TeamMember.findByTeamName(req.params.teamName);
    
    res.json({
      success: true,
      teamMembers
    });
  } catch (error) {
    console.error('Get team members by team name error:', error.message);
    res.status(500).json({ error: 'Failed to get team members by team name' });
  }
});

// Add a new team member
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      team_name,
      role,
      github_username
    } = req.body;
    
    if (!team_name || !github_username) {
      return res.status(400).json({ error: 'Team name and GitHub username are required' });
    }
    
    // Check if the user exists in the database
    let user = await User.findByGithubUsername(github_username);
    
    // If the user doesn't exist, create a placeholder user
    if (!user) {
      user = await User.create({
        github_id: null,
        github_username,
        email: null,
        avatar_url: `https://github.com/${github_username}.png`
      });
    }
    
    // Create team member
    const memberData = {
      user_id: user.id,
      team_name,
      role,
      reviews_completed: 0,
      issues_found: 0,
      fixes_made: 0,
      avg_review_time: 0.0,
      performance_rating: 0.0
    };
    
    const teamMember = await TeamMember.create(memberData);
    
    res.status(201).json({
      success: true,
      teamMember
    });
  } catch (error) {
    console.error('Add team member error:', error.message);
    res.status(500).json({ error: 'Failed to add team member' });
  }
});

// Update team member performance
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const {
      reviews_completed,
      issues_found,
      fixes_made,
      avg_review_time,
      performance_rating
    } = req.body;
    
    const teamMember = await TeamMember.updatePerformance(req.params.id, {
      reviews_completed,
      issues_found,
      fixes_made,
      avg_review_time,
      performance_rating
    });
    
    if (!teamMember) {
      return res.status(404).json({ error: 'Team member not found' });
    }
    
    res.json({
      success: true,
      teamMember
    });
  } catch (error) {
    console.error('Update team member error:', error.message);
    res.status(500).json({ error: 'Failed to update team member' });
  }
});

// Remove a team member
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const teamMember = await TeamMember.delete(req.params.id);
    
    if (!teamMember) {
      return res.status(404).json({ error: 'Team member not found' });
    }
    
    res.json({
      success: true,
      message: 'Team member removed successfully',
      teamMember
    });
  } catch (error) {
    console.error('Delete team member error:', error.message);
    res.status(500).json({ error: 'Failed to delete team member' });
  }
});

module.exports = router;
