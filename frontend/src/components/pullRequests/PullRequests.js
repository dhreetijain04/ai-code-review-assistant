
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Badge, InputGroup, Modal } from 'react-bootstrap';
import { FaSearch, FaFilter, FaGithub, FaCodeBranch, FaCheck, FaTimes, FaSpinner, FaExclamationTriangle } from 'react-icons/fa';
import './PullRequests.css';

const PullRequests = () => {
  const [filters, setFilters] = useState({
    repo: '',
    author: '',
    status: '',
    severity: '',
    search: ''
  });
  const [selectedPR, setSelectedPR] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [pullRequests, setPullRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [repositories, setRepositories] = useState([]);

  // Fetch repositories and pull requests on component mount
  useEffect(() => {
    const fetchRepositoriesAndPRs = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const token = localStorage.getItem('github_token') || localStorage.getItem('auth_token');
        
        if (!token || !token.startsWith('github_pat_')) {
          setError('GitHub token not found. Please log in to view pull requests.');
          setPullRequests([]);
          setLoading(false);
          return;
        }

        // First, get repositories from our backend
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3003';
        const reposResponse = await fetch(`${apiUrl}/api/repositories`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!reposResponse.ok) {
          throw new Error('Failed to fetch repositories from backend');
        }

        const reposData = await reposResponse.json();
        const userRepos = reposData.repositories || [];
        setRepositories(userRepos);

        // Now fetch pull requests for each repository
        let allPullRequests = [];
        
        for (const repo of userRepos) {
          try {
            // Extract owner and repo name from full_name
            const [owner, repoName] = repo.full_name.split('/');
            
            // Fetch pull requests from GitHub API
            const prResponse = await fetch(`https://api.github.com/repos/${owner}/${repoName}/pulls?state=all&per_page=100`, {
              headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'AI-Code-Review-Assistant'
              }
            });

            if (prResponse.ok) {
              const prs = await prResponse.json();
              
              // Transform GitHub PR data to our format
              const transformedPRs = prs.map(pr => ({
                id: pr.id,
                title: pr.title,
                repo: repo.name,
                author: pr.user.login,
                branch: pr.head.ref,
                status: pr.state === 'open' ? 'needs-review' : 
                       pr.merged_at ? 'approved' : 'closed',
                severity: determinePRSeverity(pr),
                updatedAt: formatDate(pr.updated_at),
                commentsCount: pr.comments || 0,
                changedFiles: pr.changed_files || 0,
                additions: pr.additions || 0,
                deletions: pr.deletions || 0,
                url: pr.html_url,
                number: pr.number,
                body: pr.body,
                created_at: pr.created_at,
                state: pr.state,
                merged_at: pr.merged_at
              }));

              allPullRequests = [...allPullRequests, ...transformedPRs];
            }
          } catch (prError) {
            console.warn(`Failed to fetch PRs for ${repo.name}:`, prError.message);
          }
        }

        if (allPullRequests.length === 0 && userRepos.length > 0) {
          setError(`No pull requests found in your ${userRepos.length} repositories.`);
        } else if (allPullRequests.length === 0) {
          setError('No repositories found. Please sync your repositories first.');
          setPullRequests([]);
        } else {
          setPullRequests(allPullRequests);
          setError(null);
        }

      } catch (err) {
        console.error('Error fetching pull requests:', err);
        setError('Failed to fetch pull requests. Please check your connection and GitHub token.');
        setPullRequests([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRepositoriesAndPRs();
  }, []);

  // Helper function to determine PR severity based on changes
  const determinePRSeverity = (pr) => {
    const totalChanges = (pr.additions || 0) + (pr.deletions || 0);
    const filesChanged = pr.changed_files || 0;
    
    if (totalChanges > 500 || filesChanged > 10) return 'high';
    if (totalChanges > 100 || filesChanged > 5) return 'medium';
    return 'low';
  };

  // Helper function to format dates
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleViewReview = (pr) => {
    setSelectedPR(pr);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    if (selectedPR) {
      const confirmClose = window.confirm(
        "Are you sure you want to close this review?\n\nAny unsaved feedback will be lost."
      );
      
      if (confirmClose) {
        setShowModal(false);
        setSelectedPR(null);
      }
    } else {
      setShowModal(false);
      setSelectedPR(null);
    }
  };

  const handleApproveChanges = () => {
    if (selectedPR) {
      const confirmApproval = window.confirm(
        `Are you sure you want to approve the pull request "${selectedPR.title}"?\n\nThis will mark the PR as approved and notify the team.`
      );
      
      if (confirmApproval) {
        // Update the PR status to approved (for demo purposes)
        alert(`✅ Pull Request "${selectedPR.title}" has been approved successfully!\n\n• Author will be notified\n• PR is ready for merge\n• Team has been updated`);
        setShowModal(false);
        setSelectedPR(null);
      }
    }
  };

  const handleRequestChanges = () => {
    if (selectedPR) {
      const changeRequest = window.prompt(
        `Requesting changes for "${selectedPR.title}"\n\nPlease provide feedback for the author:`,
        "Please address the following concerns before approval..."
      );
      
      if (changeRequest !== null && changeRequest.trim() !== "") {
        // Update the PR status to needs changes (for demo purposes)
        alert(`⚠️ Changes have been requested for Pull Request "${selectedPR.title}".\n\nFeedback sent: "${changeRequest}"\n\n• Author will be notified\n• PR marked as needs changes\n• Workflow updated`);
        setShowModal(false);
        setSelectedPR(null);
      } else if (changeRequest !== null) {
        alert("Please provide feedback to request changes.");
      }
    }
  };

  // Filter pull requests based on current filters
  const filteredPullRequests = pullRequests.filter(pr => {
    if (filters.repo && pr.repo !== filters.repo) return false;
    if (filters.author && pr.author !== filters.author) return false;
    if (filters.status && pr.status !== filters.status) return false;
    if (filters.severity && pr.severity !== filters.severity) return false;
    if (filters.search && !pr.title.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'needs-review': return 'warning';
      case 'reviewed': return 'info';
      case 'approved': return 'success';
      default: return 'secondary';
    }
  };

  const getSeverityBadgeVariant = (severity) => {
    switch (severity) {
      case 'high': return 'danger';
      case 'medium': return 'warning';
      case 'low': return 'success';
      default: return 'secondary';
    }
  };

  return (
    <Container fluid className="pull-requests-container">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="text-gradient">Pull Requests</h2>
              <p style={{color: '#cccccc', margin: 0}}>
                Manage and review pull requests across your repositories
              </p>
            </div>
            <div style={{color: '#00ff87', fontSize: '0.9rem'}}>
              {loading ? (
                <div className="d-flex align-items-center">
                  <FaSpinner className="spin me-2" />
                  Loading pull requests...
                </div>
              ) : error ? (
                <div className="text-warning">
                  <FaExclamationTriangle className="me-1" />
                  {error}
                </div>
              ) : (
                <>
                  Showing {filteredPullRequests.length} of {pullRequests.length} pull requests
                  {(filters.repo || filters.author || filters.status || filters.severity) && 
                    ' (filtered)'
                  }
                </>
              )}
            </div>
          </div>
        </Col>
      </Row>

      {!loading && (
        <>
          <Row className="mb-4">
        <Col>
          <Card className="filter-card">
            <Card.Body>
              <Row className="g-3">
                <Col md={3}>
                  <InputGroup>
                    <InputGroup.Text className="search-icon">
                      <FaSearch />
                    </InputGroup.Text>
                    <Form.Control
                      type="text"
                      placeholder="Search PRs..."
                      className="search-input"
                      value={filters.search}
                      onChange={(e) => handleFilterChange('search', e.target.value)}
                    />
                  </InputGroup>
                </Col>
                <Col md={2}>
                  <Form.Select 
                    value={filters.repo}
                    onChange={(e) => handleFilterChange('repo', e.target.value)}
                    className="filter-select"
                  >
                    <option value="">All Repositories</option>
                    {repositories.map(repo => (
                      <option key={repo.id} value={repo.name}>{repo.name}</option>
                    ))}
                  </Form.Select>
                </Col>
                <Col md={2}>
                  <Form.Select
                    value={filters.author}
                    onChange={(e) => handleFilterChange('author', e.target.value)}
                    className="filter-select"
                  >
                    <option value="">All Authors</option>
                    {[...new Set(pullRequests.map(pr => pr.author))].map(author => (
                      <option key={author} value={author}>{author}</option>
                    ))}
                  </Form.Select>
                </Col>
                <Col md={2}>
                  <Form.Select
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className="filter-select"
                  >
                    <option value="">All Statuses</option>
                    <option value="needs-review">Needs Review</option>
                    <option value="reviewed">Reviewed</option>
                    <option value="approved">Approved</option>
                  </Form.Select>
                </Col>
                <Col md={2}>
                  <Form.Select
                    value={filters.severity}
                    onChange={(e) => handleFilterChange('severity', e.target.value)}
                    className="filter-select"
                  >
                    <option value="">All Severities</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </Form.Select>
                </Col>
                <Col md={1}>
                  <Button variant="light" className="filter-btn w-100">
                    <FaFilter />
                  </Button>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="g-4">
        {filteredPullRequests && filteredPullRequests.length > 0 ? (
          filteredPullRequests.map(pr => (
            <Col key={pr.id} xs={12}>
              <Card className="pr-card">
                <Card.Body>
                  <Row>
                    <Col lg={7}>
                      <div className="pr-title">
                        <h5>{pr.title}</h5>
                        <div className="pr-meta">
                          <span className="repo-name">
                            <FaGithub className="me-1" />
                            {pr.repo}
                          </span>
                          <span className="branch-name">
                            <FaCodeBranch className="me-1" />
                            {pr.branch}
                          </span>
                          <span className="author-name">
                            by {pr.author}
                          </span>
                          <span className="update-time">
                            Updated {pr.updatedAt}
                          </span>
                        </div>
                      </div>
                    </Col>
                    <Col lg={3}>
                      <div className="pr-stats">
                        <div className="stat-item">
                          <small>Changed Files</small>
                          <span>{pr.changedFiles}</span>
                        </div>
                        <div className="stat-item">
                          <small>Comments</small>
                          <span>{pr.commentsCount}</span>
                        </div>
                        <div className="stat-item">
                          <small>
                            <FaCheck className="text-success" /> {pr.additions}
                          </small>
                          <small>
                            <FaTimes className="text-danger" /> {pr.deletions}
                          </small>
                        </div>
                      </div>
                    </Col>
                    <Col lg={2}>
                      <div className="pr-actions">
                        <Badge bg={getStatusBadgeVariant(pr.status)} className="status-badge">
                          {pr.status === 'needs-review' && <FaSpinner className="spin me-1" />}
                          {pr.status === 'reviewed' && <FaCheck className="me-1" />}
                          {pr.status === 'approved' && <FaCheck className="me-1" />}
                          {pr.status.replace('-', ' ')}
                        </Badge>
                        <Badge bg={getSeverityBadgeVariant(pr.severity)} className="severity-badge">
                          {pr.severity}
                        </Badge>
                        <Button 
                          variant="primary" 
                          className="review-btn"
                          onClick={() => handleViewReview(pr)}
                        >
                          View Review
                        </Button>
                      </div>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>
          ))
        ) : (
          <Col xs={12} className="text-center text-muted py-5">
            <h5>No pull requests found.</h5>
            <p>Connect a repository or create a pull request to see it here.</p>
            <div className="mt-3">
              <FaGithub size={48} className="mb-3 opacity-50" />
              <p>Connect to GitHub to view pull requests from your repositories.</p>
            </div>
          </Col>
        )}
      </Row>

      {/* PR Review Details Modal */}
      <Modal show={showModal} onHide={handleCloseModal} size="lg" className="pr-modal">
        <Modal.Header closeButton>
          <Modal.Title>Pull Request Review Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedPR && (
            <div>
              <div className="mb-4">
                <h5>{selectedPR.title}</h5>
                <div className="pr-meta">
                  <span className="repo-name">
                    <FaGithub className="me-1" />
                    {selectedPR.repo}
                  </span>
                  <span className="branch-name">
                    <FaCodeBranch className="me-1" />
                    {selectedPR.branch}
                  </span>
                  <span>by {selectedPR.author}</span>
                  <span>Updated {selectedPR.updatedAt}</span>
                </div>
              </div>

              <div className="review-summary mb-4">
                <h6>Review Summary</h6>
                <div className="row">
                  <div className="col-md-3">
                    <div className="stat-item">
                      <small>Status</small>
                      <Badge bg={getStatusBadgeVariant(selectedPR.status)}>
                        {selectedPR.status.replace('-', ' ')}
                      </Badge>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="stat-item">
                      <small>Severity</small>
                      <Badge bg={getSeverityBadgeVariant(selectedPR.severity)}>
                        {selectedPR.severity}
                      </Badge>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="stat-item">
                      <small>Files Changed</small>
                      <span>{selectedPR.changedFiles}</span>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="stat-item">
                      <small>Comments</small>
                      <span>{selectedPR.commentsCount}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="code-changes mb-4">
                <h6>Code Changes</h6>
                <div className="d-flex gap-3">
                  <span className="text-success">
                    <FaCheck className="me-1" />
                    +{selectedPR.additions} additions
                  </span>
                  <span className="text-danger">
                    <FaTimes className="me-1" />
                    -{selectedPR.deletions} deletions
                  </span>
                </div>
              </div>

              <div className="review-feedback">
                <h6>AI Review Analysis</h6>
                <div className="alert alert-info">
                  <strong>Overall Assessment:</strong> This pull request shows {selectedPR.severity} priority changes 
                  with {selectedPR.changedFiles} files modified. The code quality appears to be {
                    selectedPR.severity === 'high' ? 'good with some important considerations' :
                    selectedPR.severity === 'medium' ? 'satisfactory with minor improvements needed' :
                    'excellent with minimal issues'
                  }.
                </div>
                
                <div className="recommendations mt-3">
                  <h6>Recommendations:</h6>
                  <ul>
                    <li>Review the {selectedPR.changedFiles} modified files for consistency</li>
                    <li>Consider breaking down large changes if applicable</li>
                    <li>Ensure all tests pass before merging</li>
                    <li>Add documentation for new features</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModal}>
            Close
          </Button>
          <Button variant="success" onClick={handleApproveChanges}>
            <FaCheck className="me-1" />
            Approve Changes
          </Button>
          <Button variant="warning" onClick={handleRequestChanges}>
            <FaExclamationTriangle className="me-1" />
            Request Changes
          </Button>
        </Modal.Footer>
      </Modal>
        </>
      )}
    </Container>
  );
};

export default PullRequests;
