const GITHUB_API_BASE = 'https://api.github.com';

class GitHubService {
  constructor() {
    this.token = null;
  }

  setAuthToken(token) {
    this.token = token;
  }

  async makeRequest(endpoint, options = {}) {
    const url = `${GITHUB_API_BASE}${endpoint}`;
    const headers = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'AI-Code-Review-Assistant',
      ...options.headers
    };

    if (this.token) {
      headers.Authorization = `token ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      throw new Error(`GitHub API request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getCurrentUser() {
    return this.makeRequest('/user');
  }

  async getUserRepositories() {
    return this.makeRequest('/user/repos?per_page=100&sort=updated');
  }

  async getRepositoryDetails(owner, repo) {
    return this.makeRequest(`/repos/${owner}/${repo}`);
  }

  async getPullRequests(owner, repo, state = 'open') {
    return this.makeRequest(`/repos/${owner}/${repo}/pulls?state=${state}&per_page=30`);
  }

  async getRepositoryContent(owner, repo, path = '') {
    return this.makeRequest(`/repos/${owner}/${repo}/contents/${path}`);
  }

  async getCommits(owner, repo, options = {}) {
    const params = new URLSearchParams({
      per_page: '30',
      ...options
    });
    return this.makeRequest(`/repos/${owner}/${repo}/commits?${params}`);
  }

  async getIssues(owner, repo, state = 'open') {
    const issues = await this.makeRequest(`/repos/${owner}/${repo}/issues?state=${state}&per_page=30`);
    // Filter out pull requests (GitHub API includes PRs in issues endpoint)
    return issues.filter(issue => !issue.pull_request);
  }
}

export const githubService = new GitHubService();