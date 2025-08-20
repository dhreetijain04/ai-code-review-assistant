import React, { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import './Auth.css';

const LoginForm = ({ onLogin }) => {
  const [githubToken, setGithubToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validateAndLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!githubToken.trim()) {
      setError('Please enter your GitHub token');
      setLoading(false);
      return;
    }

    try {
      // Validate the token by making a test API call to GitHub
      const response = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('GitHub API Error:', response.status, errorData);
        throw new Error(`GitHub API Error: ${response.status} - ${errorData.message || 'Invalid token'}`);
      }

      const userData = await response.json();
      console.log('Login successful for user:', userData.login);
      
      // Call the parent component's login handler
      onLogin(githubToken, userData);
    } catch (err) {
      console.error('Login error:', err);
      setError(`Login failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <Container fluid>
        <Row className="justify-content-center align-items-center min-vh-100">
          <Col xs={12} sm={11} md={10} lg={8} xl={7}>
            <Card className="shadow-lg login-card">
              <Card.Body className="p-4">
                <div className="text-center mb-4">
                  <h1 className="text-primary mb-2">
                    <i className="fas fa-code-branch me-2"></i>
                    AI Code Review Assistant
                  </h1>
                  <p className="text-muted">Connect your GitHub account to get started</p>
                </div>

                <Form onSubmit={validateAndLogin}>
                  <Row className="align-items-end">
                    <Col md={8}>
                      <Form.Group className="mb-3">
                        <Form.Label>GitHub Personal Access Token</Form.Label>
                        <Form.Control
                          type="password"
                          placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                          value={githubToken}
                          onChange={(e) => setGithubToken(e.target.value)}
                          disabled={loading}
                          required
                          className="token-input"
                        />
                        <Form.Text className="text-muted">
                          Need a token? <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer">Generate one here</a>
                        </Form.Text>
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <div className="d-grid mb-3">
                        <Button 
                          variant="primary" 
                          type="submit" 
                          disabled={loading}
                          className="connect-btn"
                        >
                          {loading ? (
                            <>
                              <Spinner
                                as="span"
                                animation="border"
                                size="sm"
                                role="status"
                                aria-hidden="true"
                                className="me-2"
                              />
                              Connecting...
                            </>
                          ) : (
                            <>
                              <i className="fab fa-github me-2"></i>
                              Connect
                            </>
                          )}
                        </Button>
                      </div>
                    </Col>
                  </Row>

                  {error && (
                    <Alert variant="danger" className="mb-3">
                      <i className="fas fa-exclamation-triangle me-2"></i>
                      {error}
                    </Alert>
                  )}
                </Form>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default LoginForm;