import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Form, Modal, Alert } from 'react-bootstrap';
import './ReviewHistory.css';

const ReviewHistory = ({ githubToken }) => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [selectedReview, setSelectedReview] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    fetchReviewHistory();
  }, [githubToken]);

  const fetchReviewHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3002';
      const response = await fetch(`${apiUrl}/api/reviews`, {
        headers: {
          'Authorization': `Bearer ${githubToken}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch reviews: ${response.status}`);
      }
      
      const data = await response.json();
      setReviews(data.reviews || []);
    } catch (err) {
      console.error('Error fetching review history:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredReviews = reviews.filter(review => {
    const statusMatch = filterStatus === 'all' || review.review_status === filterStatus;
    const severityMatch = filterSeverity === 'all' || review.severity === filterSeverity;
    return statusMatch && severityMatch;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'pending': return 'warning';
      case 'in_progress': return 'info';
      case 'failed': return 'danger';
      default: return 'secondary';
    }
  };

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'critical': return 'danger';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'secondary';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return `${Math.floor(diffInHours / 24)}d ago`;
  };

  const viewReviewDetails = (review) => {
    setSelectedReview(review);
    setShowDetailsModal(true);
  };

  if (loading) {
    return (
      <div className="review-history-container">
        <Container fluid>
          <div className="text-center py-5">
            <div className="neon-spinner">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
            <p className="mt-3">Loading review history...</p>
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div className="review-history-container">
      <Container fluid>
        <Row className="mb-4">
          <Col>
            <div className="history-header">
              <h2 className="text-gradient">
                <i className="fas fa-history me-3"></i>
                Review History
              </h2>
              <p className="text-muted">Track your AI code review sessions and results</p>
            </div>
          </Col>
        </Row>

        {error && (
          <Row className="mb-4">
            <Col>
              <Alert variant="danger" className="neon-alert">
                <Alert.Heading>Error Loading Reviews</Alert.Heading>
                <p>{error}</p>
                <Button variant="outline-danger" onClick={fetchReviewHistory}>
                  Retry
                </Button>
              </Alert>
            </Col>
          </Row>
        )}

        <Row className="mb-4">
          <Col>
            <Card className="filters-card">
              <Card.Body>
                <Row className="align-items-end">
                  <Col md={3}>
                    <Form.Group>
                      <Form.Label>Filter by Status</Form.Label>
                      <Form.Select 
                        value={filterStatus} 
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="neon-input"
                      >
                        <option value="all">All Statuses</option>
                        <option value="completed">Completed</option>
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="failed">Failed</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group>
                      <Form.Label>Filter by Severity</Form.Label>
                      <Form.Select 
                        value={filterSeverity} 
                        onChange={(e) => setFilterSeverity(e.target.value)}
                        className="neon-input"
                      >
                        <option value="all">All Severities</option>
                        <option value="critical">Critical</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Button 
                      variant="primary" 
                      onClick={fetchReviewHistory}
                      className="refresh-btn"
                    >
                      <i className="fas fa-sync-alt me-2"></i>
                      Refresh
                    </Button>
                  </Col>
                  <Col md={3} className="text-end">
                    <div className="stats-summary">
                      <small className="text-muted">
                        Showing {filteredReviews.length} of {reviews.length} reviews
                      </small>
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Row>
          <Col>
            <Card className="history-table-card">
              <Card.Header>
                <h5 className="mb-0">
                  <i className="fas fa-list me-2"></i>
                  Review Sessions
                </h5>
              </Card.Header>
              <Card.Body>
                {filteredReviews.length > 0 ? (
                  <Table hover responsive className="history-table">
                    <thead>
                      <tr>
                        <th>Repository</th>
                        <th>PR/Branch</th>
                        <th>Status</th>
                        <th>Severity</th>
                        <th>Issues Found</th>
                        <th>Created</th>
                        <th>Completed</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredReviews.map((review) => (
                        <tr key={review.id} className="review-row">
                          <td>
                            <div className="repo-info">
                              <i className="fas fa-folder me-2"></i>
                              <span className="repo-name">{review.repository_name || 'Unknown'}</span>
                            </div>
                          </td>
                          <td>
                            <div className="pr-info">
                              {review.pr_number ? (
                                <Badge bg="info" className="me-2">PR #{review.pr_number}</Badge>
                              ) : (
                                <Badge bg="secondary" className="me-2">Direct</Badge>
                              )}
                              <small className="text-muted">{review.pr_title || 'Code Review'}</small>
                            </div>
                          </td>
                          <td>
                            <Badge bg={getStatusBadge(review.review_status)}>
                              {review.review_status}
                            </Badge>
                          </td>
                          <td>
                            <Badge bg={getSeverityBadge(review.severity)}>
                              {review.severity}
                            </Badge>
                          </td>
                          <td>
                            <span className="issues-count">
                              {review.ai_feedback?.issues_count || 0}
                            </span>
                          </td>
                          <td>
                            <div>
                              <small className="text-muted">{formatDate(review.created_at)}</small>
                              <br />
                              <small className="time-ago">{getTimeAgo(review.created_at)}</small>
                            </div>
                          </td>
                          <td>
                            {review.completed_at ? (
                              <div>
                                <small className="text-muted">{formatDate(review.completed_at)}</small>
                                <br />
                                <small className="time-ago">{getTimeAgo(review.completed_at)}</small>
                              </div>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                          <td>
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => viewReviewDetails(review)}
                              className="view-btn"
                            >
                              <i className="fas fa-eye me-1"></i>
                              View
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                ) : (
                  <div className="empty-state">
                    <i className="fas fa-inbox fa-3x mb-3"></i>
                    <h5>No Reviews Found</h5>
                    <p className="text-muted">
                      {reviews.length === 0 
                        ? "You haven't run any AI code reviews yet. Start by going to the AI Review panel."
                        : "No reviews match your current filters. Try adjusting the filter criteria."
                      }
                    </p>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Review Details Modal */}
        <Modal 
          show={showDetailsModal} 
          onHide={() => setShowDetailsModal(false)} 
          size="lg"
          className="review-details-modal"
        >
          <Modal.Header closeButton>
            <Modal.Title>
              <i className="fas fa-search-plus me-2"></i>
              Review Details
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {selectedReview && (
              <div className="review-details">
                <Row className="mb-3">
                  <Col md={6}>
                    <strong>Repository:</strong> {selectedReview.repository_name}
                  </Col>
                  <Col md={6}>
                    <strong>Status:</strong> 
                    <Badge bg={getStatusBadge(selectedReview.review_status)} className="ms-2">
                      {selectedReview.review_status}
                    </Badge>
                  </Col>
                </Row>
                
                <Row className="mb-3">
                  <Col md={6}>
                    <strong>Severity:</strong> 
                    <Badge bg={getSeverityBadge(selectedReview.severity)} className="ms-2">
                      {selectedReview.severity}
                    </Badge>
                  </Col>
                  <Col md={6}>
                    <strong>Issues Found:</strong> {selectedReview.ai_feedback?.issues_count || 0}
                  </Col>
                </Row>

                {selectedReview.ai_feedback?.summary && (
                  <div className="mb-3">
                    <strong>Summary:</strong>
                    <p className="mt-2">{selectedReview.ai_feedback.summary}</p>
                  </div>
                )}

                {selectedReview.ai_feedback?.issues && selectedReview.ai_feedback.issues.length > 0 && (
                  <div className="mb-3">
                    <strong>Issues:</strong>
                    <div className="issues-list mt-2">
                      {selectedReview.ai_feedback.issues.map((issue, index) => (
                        <Card key={index} className="issue-detail-card mb-2">
                          <Card.Body>
                            <div className="d-flex justify-content-between align-items-start mb-2">
                              <h6>{issue.title}</h6>
                              <Badge bg={getSeverityBadge(issue.severity)}>
                                {issue.severity}
                              </Badge>
                            </div>
                            <p className="mb-1">{issue.description}</p>
                            {issue.line && (
                              <small className="text-muted">Line: {issue.line}</small>
                            )}
                          </Card.Body>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {selectedReview.ai_feedback?.recommendations && selectedReview.ai_feedback.recommendations.length > 0 && (
                  <div>
                    <strong>Recommendations:</strong>
                    <ul className="mt-2">
                      {selectedReview.ai_feedback.recommendations.map((rec, index) => (
                        <li key={index} className="mb-1">{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowDetailsModal(false)}>
              Close
            </Button>
          </Modal.Footer>
        </Modal>
      </Container>
    </div>
  );
};

export default ReviewHistory;