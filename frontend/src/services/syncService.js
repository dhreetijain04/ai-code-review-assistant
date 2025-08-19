import { githubService } from './githubService';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3002';

class SyncService {
  async quickSync() {
    try {
      const token = localStorage.getItem('github_token');
      if (!token) {
        throw new Error('No GitHub token found');
      }

      githubService.setAuthToken(token);
      
      // Get user info
      const user = await githubService.getCurrentUser();
      
      // Get repositories
      const repos = await githubService.getUserRepositories();
      
      console.log(`Syncing ${repos.length} repositories...`);
      
      // Send to backend
      const response = await fetch(`${API_BASE_URL}/api/repositories/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          user,
          repositories: repos
        })
      });

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Quick sync completed:', result);
      
      return {
        success: true,
        stats: result
      };
    } catch (error) {
      console.error('Quick sync failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async forceSync() {
    try {
      const token = localStorage.getItem('github_token');
      if (!token) {
        throw new Error('No GitHub token found');
      }

      githubService.setAuthToken(token);
      
      // Get all repositories with detailed info
      const repos = await githubService.getUserRepositories();
      
      const detailedRepos = [];
      for (const repo of repos) {
        try {
          const [pullRequests, issues] = await Promise.all([
            githubService.getPullRequests(repo.owner.login, repo.name),
            githubService.getIssues(repo.owner.login, repo.name)
          ]);
          
          detailedRepos.push({
            ...repo,
            pr_count: pullRequests.length,
            issues_count: issues.length
          });
        } catch (error) {
          console.warn(`Failed to get details for ${repo.name}:`, error.message);
          detailedRepos.push(repo);
        }
      }
      
      // Send to backend
      const response = await fetch(`${API_BASE_URL}/api/repositories/force-sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          repositories: detailedRepos
        })
      });

      if (!response.ok) {
        throw new Error(`Force sync failed: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Force sync completed:', result);
      
      return {
        success: true,
        stats: result
      };
    } catch (error) {
      console.error('Force sync failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

const syncService = new SyncService();
export default syncService;