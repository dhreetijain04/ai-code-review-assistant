import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Badge, Modal } from 'react-bootstrap';
import './CodeReviewPanel.css';
import './CodeReviewProcess.css';

const CodeReviewPanel = ({ githubToken }) => {
  const [language, setLanguage] = useState('javascript');
  const [repository, setRepository] = useState('');
  const [repositories, setRepositories] = useState([]);
  const [prNumber, setPrNumber] = useState('');
  const [pullRequests, setPullRequests] = useState([]);
  const [reviewResult, setReviewResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingPRs, setLoadingPRs] = useState(false);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    fetchRepositories();
  }, [githubToken]);

  const fetchRepositories = async () => {
    try {
      const response = await fetch('http://localhost:3002/api/repositories', {
        headers: {
          'Authorization': `Bearer ${githubToken}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setRepositories(data.repositories || []);
      }
    } catch (error) {
      console.error('Error fetching repositories:', error);
    }
  };

  const fetchPullRequests = async (repoFullName) => {
    if (!repoFullName || !githubToken) return;
    
    setLoadingPRs(true);
    try {
      const [owner, repo] = repoFullName.split('/');
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls?state=open&per_page=50`, {
        headers: {
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      
      if (response.ok) {
        const prs = await response.json();
        setPullRequests(prs);
        console.log(`📋 Loaded ${prs.length} open PRs for ${repoFullName}`);
      } else {
        console.error('Failed to fetch pull requests');
        setPullRequests([]);
      }
    } catch (error) {
      console.error('Error fetching pull requests:', error);
      setPullRequests([]);
    } finally {
      setLoadingPRs(false);
    }
  };

  const handleRepositoryChange = (repoFullName) => {
    setRepository(repoFullName);
    setPrNumber(''); // Reset PR selection
    setPullRequests([]); // Clear previous PRs
    
    if (repoFullName) {
      fetchPullRequests(repoFullName);
    }
  };

  const handleReview = async () => {
    if (!repository) {
      alert('Please select a repository');
      return;
    }

    if (!prNumber) {
      alert('Please select a pull request');
      return;
    }

    setLoading(true);
    setReviewResult(null);

    try {
      console.log('🚀 Starting PR review...', {
        repository,
        prNumber
      });

      const requestBody = {
        repository,
        pr_number: prNumber
      };

      const response = await fetch('http://localhost:3002/api/review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${githubToken}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ PR review completed:', result);
        setReviewResult(result);
        setShowResult(true);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get AI review');
      }
    } catch (error) {
      console.error('❌ PR review failed:', error);
      alert(`Failed to get PR review: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return 'danger';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'secondary';
    }
  };

  return (
    <div className="code-review-container">
      <Container fluid>
        <Row className="mb-4">
          <Col>
            <div className="review-header">
              <h2 className="text-gradient">
                <i className="fas fa-code-branch me-3"></i>
                AI Pull Request Review
              </h2>
              <p className="text-muted">Select a repository and pull request to get intelligent code analysis</p>
            </div>
          </Col>
        </Row>

        <Row className="g-4">
          <Col lg={6}>
            <Card className="review-settings-card">
              <Card.Header>
                <h5 className="mb-0">
                  <i className="fas fa-cog me-2"></i>
                  Select Pull Request
                </h5>
              </Card.Header>
              <Card.Body>
                <Form>
                  <Form.Group className="mb-3">
                    <Form.Label>Repository *</Form.Label>
                    <Form.Select 
                      value={repository} 
                      onChange={(e) => handleRepositoryChange(e.target.value)}
                      className="neon-input"
                      required
                    >
                      <option value="">Select repository...</option>
                      {repositories.map((repo) => (
                        <option key={repo.id} value={repo.full_name}>
                          {repo.name}
                        </option>
                      ))}
                    </Form.Select>
                    <Form.Text className="text-muted">
                      Choose the repository containing the PR to review
                    </Form.Text>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Pull Request *</Form.Label>
                    <Form.Select
                      value={prNumber}
                      onChange={(e) => setPrNumber(e.target.value)}
                      className="neon-input"
                      disabled={!repository || loadingPRs}
                      required
                    >
                      <option value="">
                        {loadingPRs ? 'Loading PRs...' : 'Select pull request...'}
                      </option>
                      {pullRequests.map((pr) => (
                        <option key={pr.number} value={pr.number}>
                          #{pr.number} - {pr.title}
                        </option>
                      ))}
                    </Form.Select>
                    <Form.Text className="text-muted">
                      {!repository ? 'Select a repository first' : 
                       pullRequests.length === 0 && !loadingPRs ? 'No open pull requests found' :
                       'AI will analyze all code changes in this PR'}
                    </Form.Text>
                  </Form.Group>

                  <div className="d-grid">
                    <Button 
                      variant="primary" 
                      onClick={handleReview} 
                      disabled={loading || !repository || !prNumber}
                      className="review-btn"
                      size="lg"
                    >
                      {loading ? (
                        <>
                          <div className="spinner-border spinner-border-sm me-2" role="status">
                            <span className="visually-hidden">Loading...</span>
                          </div>
                          Analyzing PR Changes...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-search me-2"></i>
                          Review Pull Request
                        </>
                      )}
                    </Button>
                  </div>
                </Form>
              </Card.Body>
            </Card>
          </Col>

          <Col lg={6}>
            <Card className="info-card">
              <Card.Header>
                <h5 className="mb-0">
                  <i className="fas fa-info-circle me-2"></i>
                  How It Works
                </h5>
              </Card.Header>
              <Card.Body>
                <div className="review-process">
                  <div className="process-step">
                    <div className="step-number">1</div>
                    <div className="step-content">
                      <h6>Select Repository & PR</h6>
                      <p>Choose the repository and specific pull request you want to review</p>
                    </div>
                  </div>
                  
                  <div className="process-step">
                    <div className="step-number">2</div>
                    <div className="step-content">
                      <h6>Fetch PR Changes</h6>
                      <p>AI automatically fetches all code changes from the selected PR</p>
                    </div>
                  </div>
                  
                  <div className="process-step">
                    <div className="step-number">3</div>
                    <div className="step-content">
                      <h6>Analyze & Report</h6>
                      <p>Get detailed analysis with issues, security vulnerabilities, and recommendations</p>
                    </div>
                  </div>
                </div>

                <div className="analysis-features mt-4">
                  <h6 className="text-primary mb-2">Analysis Includes:</h6>
                  <ul className="feature-list">
                    <li>🔍 Code quality assessment</li>
                    <li>🛡️ Security vulnerability detection</li>
                    <li>⚡ Performance optimization suggestions</li>
                    <li>📝 Best practices recommendations</li>
                    <li>🧹 Code style improvements</li>
                    <li>🚨 Error and bug detection</li>
                    <li>📋 PR-specific change analysis</li>
                  </ul>
                </div>
                
                {(!repository || !prNumber) && (
                  <div className="alert alert-warning mt-3 mb-0">
                    <i className="fas fa-exclamation-triangle me-2"></i>
                    <strong>Required:</strong> Please select both a repository and pull request to proceed.
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Results Modal */}
        <Modal 
          show={showResult} 
          onHide={() => setShowResult(false)} 
          size="lg"
          className="review-results-modal"
        >
          <Modal.Header closeButton>
            <Modal.Title>
              <i className="fas fa-chart-line me-2"></i>
              AI Review Results
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {reviewResult && (
              <div className="review-results">
                <div className="results-header mb-4">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h5>Overall Assessment</h5>
                      <Badge bg={getSeverityColor(reviewResult.severity)} className="severity-badge">
                        {reviewResult.severity || 'Unknown'} Severity
                      </Badge>
                      {reviewResult.analysis_context && (
                        <div className="mt-2">
                          <small className="text-muted">
                            <i className="fas fa-info-circle me-1"></i>
                            Analyzed: {reviewResult.analysis_context}
                          </small>
                        </div>
                      )}
                    </div>
                    <div className="score-display">
                      <div className="quality-score">
                        <span className="score-number">{reviewResult.quality_score || 0}</span>
                        <span className="score-label">Quality Score</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="issues-section mb-4">
                  <h6 className="section-title">
                    <i className="fas fa-exclamation-triangle me-2"></i>
                    Issues Found ({reviewResult.ai_feedback?.issues?.length || 0})
                  </h6>
                  {reviewResult.ai_feedback?.issues?.length > 0 ? (
                    <div className="issues-list">
                      {reviewResult.ai_feedback.issues.map((issue, index) => (
                        <Card key={index} className="issue-card mb-2">
                          <Card.Body>
                            <div className="d-flex justify-content-between align-items-start mb-2">
                              <h6 className="issue-title">{issue.title}</h6>
                              <Badge bg={getSeverityColor(issue.severity)} className="ms-2">
                                {issue.severity}
                              </Badge>
                            </div>
                            <p className="issue-description">{issue.description}</p>
                            {issue.line && (
                              <small className="text-muted">Line {issue.line}</small>
                            )}
                          </Card.Body>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-3">
                      <i className="fas fa-check-circle fa-2x text-success mb-2"></i>
                      <p>No issues found! Great code quality.</p>
                    </div>
                  )}
                </div>

                <div className="recommendations-section">
                  <h6 className="section-title">
                    <i className="fas fa-lightbulb me-2"></i>
                    Recommendations
                  </h6>
                  {reviewResult.ai_feedback?.recommendations?.length > 0 ? (
                    <ul className="recommendations-list">
                      {reviewResult.ai_feedback.recommendations.map((rec, index) => (
                        <li key={index} className="recommendation-item">{rec}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted">No specific recommendations at this time.</p>
                  )}
                </div>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowResult(false)}>
              Close
            </Button>
            <Button variant="primary" onClick={() => window.print()}>
              <i className="fas fa-print me-2"></i>
              Export Report
            </Button>
          </Modal.Footer>
        </Modal>
      </Container>
    </div>
  );
};

export default CodeReviewPanel;