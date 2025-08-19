import React from 'react';
import { Navbar, Nav, NavDropdown, Container } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import './Navigation.css';

const Navigation = ({ user, onLogout }) => {
  return (
    <Navbar bg="dark" variant="dark" expand="lg" className="shadow-sm">
      <Container>
        <Navbar.Brand as={Link} to="/dashboard">
          <i className="fas fa-code-branch me-2"></i>
          AI Code Review Assistant
        </Navbar.Brand>
        
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link as={Link} to="/dashboard">
              <i className="fas fa-tachometer-alt me-1"></i>
              Dashboard
            </Nav.Link>
            
            <Nav.Link as={Link} to="/repositories">
              <i className="fas fa-folder me-1"></i>
              Repositories
            </Nav.Link>
            
            <Nav.Link as={Link} to="/review">
              <i className="fas fa-robot me-1"></i>
              AI Review
            </Nav.Link>
            
            <Nav.Link as={Link} to="/history">
              <i className="fas fa-history me-1"></i>
              Review History
            </Nav.Link>
          </Nav>
          
          <Nav>
            <Nav.Link as={Link} to="/settings">
              <i className="fas fa-cog me-1"></i>
              Settings
            </Nav.Link>
            
            <NavDropdown 
              title={
                <span>
                  <img 
                    src={user?.avatar_url || 'https://github.com/identicons/default.png'} 
                    alt="Avatar" 
                    className="rounded-circle me-2" 
                    style={{ width: '20px', height: '20px' }}
                  />
                  {user?.login || 'User'}
                </span>
              } 
              id="user-dropdown"
              align="end"
            >
              <NavDropdown.Item onClick={onLogout}>
                <i className="fas fa-sign-out-alt me-2"></i>
                Logout
              </NavDropdown.Item>
            </NavDropdown>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default Navigation;