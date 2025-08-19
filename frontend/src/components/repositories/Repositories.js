import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Table, Badge, Modal } from 'react-bootstrap';
import { FaGithub, FaSync, FaTrash, FaPlus, FaExclamationCircle } from 'react-icons/fa';
import { githubService } from '../../services/githubService';
import syncService from '../../services/syncService';
import './Repositories.css';

const Repositories = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRepo, setNewRepo] = useState({ url: '', token: '' });
  const [repositories, setRepositories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [fetchingCounts, setFetchingCounts] = useState(false);

  // Fetch all user repos on mount
  useEffect(() => {
    const fetchRepos = async () => {
      setLoading(true);
      setError(null);
      try {
        // Try to get token from localStorage
        let token = localStorage.getItem('github_token');
        if (!token) {
          setError('GitHub token required. Please sign in to connect your repositories.');
          setRepositories([]);
          setLoading(false);
          return;
        }
        
        // Set up GitHub service with token
        githubService.setAuthToken(token);
        
        console.log('🔄 Auto-syncing repositories...');
        await syncService.quickSync();
        
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3003';
        
        // Get repositories from database
        console.log('📥 Fetching repositories from database...');
        const response = await fetch(`${apiUrl}/api/repositories`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('✅ Repositories loaded:', data.repositories?.length || 0);
          
          setFetchingCounts(true);
          // Convert backend repository format to frontend format
          const formattedRepos = await Promise.all((data.repositories || []).map(async (repo) => {
            // Fetch real-time PR and issue counts from GitHub API
            let prCount = 0;
            let issuesCount = repo.issues_count || 0;
            
            try {
              if (repo.full_name) {
                const [owner, repoName] = repo.full_name.split('/');
                const [pullRequests, issues] = await Promise.all([
                  githubService.getPullRequests(owner, repoName),
                  githubService.getIssues(owner, repoName)
                ]);
                
                prCount = pullRequests.length;
                issuesCount = issues.length;
              }
            } catch (error) {
              console.warn(`Failed to fetch real-time data for ${repo.name}:`, error.message);
              // Fallback to stored data
              prCount = repo.pr_count || 0;
              issuesCount = repo.issues_count || 0;
            }
            
            return {
              id: repo.github_repo_id,
              name: repo.name,
              url: `https://github.com/${repo.full_name}`,
              status: 'connected',
              lastReview: repo.last_review_at ? new Date(repo.last_review_at).toLocaleDateString() : 'Never',
              issuesFound: issuesCount,
              prCount: prCount
            };
          }));
          
          setRepositories(formattedRepos);
          setError(null);
          setFetchingCounts(false);
          
          // Trigger dashboard refresh
          window.dispatchEvent(new CustomEvent('repositoryChange'));
        } else {
          // Fallback: try to fetch existing repositories from backend
          console.log('Auto-sync failed, fetching existing repositories...');
          const backendResponse = await fetch(`${apiUrl}/api/repositories`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (backendResponse.ok) {
            const data = await backendResponse.json();
            if (data.repositories && data.repositories.length > 0) {
              const formattedRepos = await Promise.all(data.repositories.map(async (repo) => {
                // Fetch real-time PR and issue counts from GitHub API
                let prCount = 0;
                let issuesCount = repo.issues_count || 0;
                
                try {
                  if (repo.full_name) {
                    const [owner, repoName] = repo.full_name.split('/');
                    const [pullRequests, issues] = await Promise.all([
                      githubService.getPullRequests(owner, repoName),
                      githubService.getIssues(owner, repoName)
                    ]);
                    
                    prCount = pullRequests.length;
                    issuesCount = issues.length;
                    
                    console.log(`📊 ${repo.name}: ${prCount} PRs, ${issuesCount} issues (filtered)`);
                  }
                } catch (error) {
                  console.warn(`Failed to fetch real-time data for ${repo.name}:`, error.message);
                  // Fallback to stored data
                  prCount = repo.pr_count || 0;
                  issuesCount = repo.issues_count || 0;
                }
                
                return {
                  id: repo.github_repo_id,
                  name: repo.name,
                  url: `https://github.com/${repo.full_name}`,
                  status: 'connected',
                  lastReview: repo.last_review_at ? new Date(repo.last_review_at).toLocaleDateString() : 'Never',
                  issuesFound: issuesCount,
                  prCount: prCount
                };
              }));
              
              setRepositories(formattedRepos);
            } else {
              setError('No repositories found. Your GitHub repositories will be synced automatically.');
              setRepositories([]);
            }
          } else {
            throw new Error('Failed to fetch repositories from backend');
          }
        }
      } catch (err) {
        console.log('Repository fetching failed:', err);
        setError('Failed to sync repositories. Please check your GitHub token and try again.');
        setRepositories([]);
      } finally {
        setLoading(false);
      }
    };
    fetchRepos();
  }, []);

  // Manual sync function
  const handleManualSync = async () => {
    setSyncing(true);
    setError(null);
    try {
      console.log('🔄 Manual sync triggered...');
      const token = localStorage.getItem('github_token');
      if (!token) {
        setError('GitHub token required for sync');
        setSyncing(false);
        return;
      }
      
      // Set up GitHub service with token
      githubService.setAuthToken(token);
      
      const result = await syncService.forceSync();
      
      if (result.success) {
        console.log('✅ Manual sync completed:', result.stats);
        // Refresh the repositories list with real-time data
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3002';
        const response = await fetch(`${apiUrl}/api/repositories`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          const formattedRepos = await Promise.all((data.repositories || []).map(async (repo) => {
            // Fetch real-time PR and issue counts from GitHub API
            let prCount = 0;
            let issuesCount = repo.issues_count || 0;
            
            try {
              if (repo.full_name) {
                const [owner, repoName] = repo.full_name.split('/');
                const [pullRequests, issues] = await Promise.all([
                  githubService.getPullRequests(owner, repoName),
                  githubService.getIssues(owner, repoName)
                ]);
                
                prCount = pullRequests.length;
                issuesCount = issues.length;
              }
            } catch (error) {
              console.warn(`Failed to fetch real-time data for ${repo.name}:`, error.message);
              // Fallback to stored data
              prCount = repo.pr_count || 0;
              issuesCount = repo.issues_count || 0;
            }
            
            return {
              id: repo.github_repo_id,
              name: repo.name,
              url: `https://github.com/${repo.full_name}`,
              status: 'connected',
              lastReview: repo.last_review_at ? new Date(repo.last_review_at).toLocaleDateString() : 'Never',
              issuesFound: issuesCount,
              prCount: prCount
            };
          }));
          
          setRepositories(formattedRepos);
          setError(null);
        }
      } else {
        setError(result.error || 'Sync failed');
      }
    } catch (error) {
      console.error('❌ Manual sync failed:', error);
      setError('Manual sync failed: ' + error.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleAddRepo = async () => {
    console.log('handleAddRepo called with:', newRepo);
    
    // Simple validation
    if (!newRepo.url || !newRepo.token) {
      alert('Please fill in all fields');
      return;
    }

    // Extract repo name from URL
    const urlMatch = newRepo.url.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!urlMatch) {
      alert('Invalid GitHub repository URL');
      return;
    }

    const [, owner, repoName] = urlMatch;
    
    try {
      setLoading(true);
      
      // Store the token in localStorage for future use
      localStorage.setItem('github_token', newRepo.token);
      githubService.setAuthToken(newRepo.token);
      
      // First, verify we have access to the repository
      const repoDetails = await githubService.getRepositoryDetails(owner, repoName);
      
      // Then, add it to our backend
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3002';
      const response = await fetch(`${apiUrl}/api/repositories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${newRepo.token}`
        },
        body: JSON.stringify({
          github_repo_id: repoDetails.id,
          name: repoDetails.name,
          full_name: repoDetails.full_name,
          description: repoDetails.description,
          "private": repoDetails.private,
          language: repoDetails.language,
          stars_count: repoDetails.stargazers_count,
          forks_count: repoDetails.forks_count,
          issues_count: repoDetails.open_issues_count
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to add repository to backend');
      }
      
      // Add the new repository to the list
      const newRepoData = {
        id: repoDetails.id,
        name: repoDetails.name,
        url: repoDetails.html_url,
        status: 'connected',
        lastReview: 'Never',
        issuesFound: repoDetails.open_issues_count,
        prCount: repoDetails.open_issues_count
      };
      
      setRepositories(prev => [...prev, newRepoData]);
      setShowAddModal(false);
      setNewRepo({ url: '', token: '' });
      
      // Trigger dashboard refresh
      window.dispatchEvent(new CustomEvent('repositoryChange'));
      
      alert('Repository connected successfully!');
    } catch (error) {
      console.error('Failed to add repository:', error);
      alert(`Failed to connect repository: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshRepo = async (id) => {
    try {
      const token = localStorage.getItem('github_token');
      if (!token) {
        alert('GitHub token required to refresh repository data');
        return;
      }
      
      const repo = repositories.find(r => r.id === id);
      if (!repo) return;

      const urlMatch = repo.url.match(/github\.com\/([^/]+)\/([^/]+)/);
      if (!urlMatch) return;

      const [, owner, repoName] = urlMatch;
      
      // Set up GitHub service with token
      githubService.setAuthToken(token);

      // Fetch real-time data
      const [repoData, pullRequests, issues] = await Promise.all([
        fetch(`https://api.github.com/repos/${owner}/${repoName}`, {
          headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }).then(res => res.json()),
        githubService.getPullRequests(owner, repoName),
        githubService.getIssues(owner, repoName)
      ]);

      setRepositories(prev => prev.map(r => r.id === id ? {
        ...r,
        status: 'connected',
        prCount: pullRequests.length,
        issuesFound: issues.length
      } : r));
      
      console.log(`✅ Refreshed ${repo.name}: ${pullRequests.length} PRs, ${issues.length} issues`);
    } catch (error) {
      console.error('Failed to refresh repository:', error);
      setRepositories(prev => prev.map(r => r.id === id ? {
        ...r,
        status: 'error'
      } : r));
      alert(`Failed to refresh repository: ${error.message}`);
    }
  };

  const handleRemoveRepo = async (id) => {
    try {
      const token = localStorage.getItem('github_token');
      if (!token) {
        alert('GitHub token required to remove repository');
        return;
      }
      
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3002';
      const response = await fetch(`${apiUrl}/api/repositories/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to remove repository from backend');
      }
      
      setRepositories(repositories.filter(repo => repo.id !== id));
      alert('Repository removed successfully');
    } catch (error) {
      console.error('Failed to remove repository:', error);
      alert(`Failed to remove repository: ${error.message}`);
    }
  };

  return (
    <Container fluid className="repositories-container">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="text-gradient">Repositories</h2>
              {repositories.length > 0 && (
                <p style={{color: '#666666', margin: 0}}>
                  {repositories.length} repositories connected
                </p>
              )}
            </div>
            <Button 
              variant="primary" 
              className="add-repo-btn"
              onClick={() => {
                console.log('Connect Repository button clicked');
                setShowAddModal(true);
              }}
            >
              <FaPlus className="me-2" />
              Connect Repository
            </Button>
            
            <Button 
              variant="success" 
              className="ms-2"
              onClick={handleManualSync}
              disabled={syncing}
            >
              <FaSync className={`me-2 ${syncing ? 'fa-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync All Repos'}
            </Button>
          </div>
        </Col>
      </Row>

      <Row>
        <Col>
          <Card className="repo-card">
            <Card.Body>
              {loading && (
                <div className="text-center p-5">
                  <div className="spinner-border text-primary mb-3" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <h5 className="text-muted">Loading your repositories...</h5>
                  <p className="text-muted">Syncing with GitHub API</p>
                </div>
              )}
              {error && (
                <div className="alert alert-warning mb-3 d-flex align-items-center">
                  <FaExclamationCircle className="me-2" />
                  <div>
                    <strong>Notice: </strong>{error}
                    {error.includes('token') && (
                      <div className="mt-2">
                        <Button 
                          variant="outline-primary" 
                          size="sm"
                          onClick={() => setShowAddModal(true)}
                        >
                          Connect Repository
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {!loading && repositories.length === 0 && (
                <div className="text-center p-5">
                  <FaGithub size={64} className="text-muted mb-3" />
                  <h5 className="text-muted">No repositories connected</h5>
                  <p className="text-muted mb-4">
                    Connect your GitHub repositories to start AI-powered code reviews.
                    <br />
                    Make sure you have a valid GitHub token configured.
                  </p>
                  <Button 
                    variant="primary" 
                    onClick={() => setShowAddModal(true)}
                    className="add-repo-btn"
                  >
                    <FaPlus className="me-2" />
                    Connect Your First Repository
                  </Button>
                </div>
              )}
              
              {repositories.length > 0 && (
                <Table hover responsive className="repo-table">
                  <thead>
                    <tr>
                      <th>Repository Name</th>
                      <th>Connection Status</th>
                      <th>Last Review</th>
                      <th>Open Issues</th>
                      <th>Open Pull Requests</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {repositories.map(repo => (
                      <tr key={repo.id}>
                        <td>
                          <div className="repo-name">
                            <FaGithub className="me-2" />
                            <div>
                              <div>{repo.name}</div>
                              <small className="text-muted">{repo.url}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <Badge bg={repo.status === 'connected' ? 'success' : 'danger'}>
                            {repo.status === 'connected' ? 'Connected' : 'Error'}
                            {repo.status === 'error' && (
                              <FaExclamationCircle className="ms-2" />
                            )}
                          </Badge>
                        </td>
                        <td>{repo.lastReview}</td>
                        <td>
                          {fetchingCounts ? (
                            <div className="d-flex align-items-center justify-content-center">
                              <i className="fas fa-spinner fa-spin me-1"></i>
                              {repo.issuesFound || 0}
                            </div>
                          ) : (
                            repo.issuesFound || 0
                          )}
                        </td>
                        <td>
                          {fetchingCounts ? (
                            <div className="d-flex align-items-center justify-content-center">
                              <i className="fas fa-spinner fa-spin me-1"></i>
                              {repo.prCount || 0}
                            </div>
                          ) : (
                            repo.prCount || 0
                          )}
                        </td>
                        <td>
                          <div className="repo-actions">
                            <Button 
                              variant="light" 
                              size="sm" 
                              className="action-btn"
                              onClick={() => handleRefreshRepo(repo.id)}
                            >
                              <FaSync />
                            </Button>
                            <Button 
                              variant="light" 
                              size="sm" 
                              className="action-btn"
                              onClick={() => handleRemoveRepo(repo.id)}
                            >
                              <FaTrash />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Modal 
        show={showAddModal} 
        onHide={() => setShowAddModal(false)}
        className="repo-modal"
      >
        <Modal.Header closeButton>
          <Modal.Title>Connect New Repository</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Repository URL</Form.Label>
              <Form.Control
                type="text"
                placeholder="https://github.com/username/repo"
                value={newRepo.url}
                onChange={(e) => setNewRepo({ ...newRepo, url: e.target.value })}
                className="repo-input"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>GitHub Token</Form.Label>
              <Form.Control
                type="password"
                placeholder="Enter your GitHub token"
                value={newRepo.token}
                onChange={(e) => setNewRepo({ ...newRepo, token: e.target.value })}
                className="repo-input"
              />
              <Form.Text className="text-muted">
                Token requires repo and user scopes
              </Form.Text>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAddModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleAddRepo} 
            className="connect-btn"
            disabled={!newRepo.url || !newRepo.token}
          >
            Connect Repository
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default Repositories;
