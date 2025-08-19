import React, { useState, useEffect } from 'react';
import './Settings.css';

const Settings = () => {
  const [settings, setSettings] = useState({
    githubToken: localStorage.getItem('github_token') || '',
    username: localStorage.getItem('github_username') || '',
    repositories: JSON.parse(localStorage.getItem('monitored_repos') || '[]'),
    notifications: {
      email: true,
      browser: true,
      pullRequests: true,
      reviews: true,
      mentions: true
    },
    appearance: {
      theme: 'neon-dark',
      compactMode: false,
      showAnimations: true
    },
    autoSync: {
      enabled: true,
      interval: 5 // minutes
    }
  });

  const [repositories, setRepositories] = useState([]);
  const [newRepo, setNewRepo] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchUserRepositories();
  }, []);

  const fetchUserRepositories = async () => {
    const token = localStorage.getItem('github_token');
    if (!token) return;

    try {
      const response = await fetch('https://api.github.com/user/repos?per_page=100', {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (response.ok) {
        const repos = await response.json();
        setRepositories(repos.map(repo => ({
          id: repo.id,
          name: repo.name,
          full_name: repo.full_name,
          private: repo.private
        })));
      }
    } catch (error) {
      console.error('Error fetching repositories:', error);
    }
  };

  const handleInputChange = (section, field, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleTokenUpdate = (token) => {
    setSettings(prev => ({ ...prev, githubToken: token }));
  };

  const addRepository = () => {
    if (newRepo && !settings.repositories.includes(newRepo)) {
      const updatedRepos = [...settings.repositories, newRepo];
      setSettings(prev => ({ ...prev, repositories: updatedRepos }));
      setNewRepo('');
    }
  };

  const removeRepository = (repo) => {
    const updatedRepos = settings.repositories.filter(r => r !== repo);
    setSettings(prev => ({ ...prev, repositories: updatedRepos }));
  };

  const saveSettings = async () => {
    setSaving(true);
    
    // Save to localStorage
    localStorage.setItem('github_token', settings.githubToken);
    localStorage.setItem('monitored_repos', JSON.stringify(settings.repositories));
    localStorage.setItem('app_settings', JSON.stringify({
      notifications: settings.notifications,
      appearance: settings.appearance,
      autoSync: settings.autoSync
    }));

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setSaving(false);
    
    // Show success message
    const successMessage = document.createElement('div');
    successMessage.className = 'alert alert-success position-fixed';
    successMessage.style.cssText = 'top: 20px; right: 20px; z-index: 9999;';
    successMessage.textContent = 'Settings saved successfully!';
    document.body.appendChild(successMessage);
    
    setTimeout(() => {
      if (document.body.contains(successMessage)) {
        document.body.removeChild(successMessage);
      }
    }, 3000);
  };

  const resetSettings = () => {
    if (window.confirm('Are you sure you want to reset all settings to default?')) {
      localStorage.removeItem('app_settings');
      window.location.reload();
    }
  };

  return (
    <div className="settings-container">
      <div className="container-fluid">
        {/* Header */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="neon-card">
              <div className="card-body text-center">
                <h2 className="settings-title">
                  <i className="fas fa-cog me-3"></i>
                  Settings
                </h2>
                <p className="settings-subtitle">
                  Configure your AI Code Review Assistant
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="row">
          {/* GitHub Integration */}
          <div className="col-lg-6 mb-4">
            <div className="neon-card settings-card">
              <div className="card-header">
                <h5><i className="fab fa-github me-2"></i>GitHub Integration</h5>
              </div>
              <div className="card-body">
                <div className="mb-3">
                  <label className="form-label">GitHub Token</label>
                  <input
                    type="password"
                    className="form-control neon-input"
                    value={settings.githubToken}
                    onChange={(e) => handleTokenUpdate(e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxx"
                  />
                  <small className="form-text text-muted">
                    Personal access token for GitHub API access
                  </small>
                </div>
                <div className="mb-3">
                  <label className="form-label">Username</label>
                  <input
                    type="text"
                    className="form-control neon-input"
                    value={settings.username}
                    onChange={(e) => setSettings(prev => ({ ...prev, username: e.target.value }))}
                    placeholder="Your GitHub username"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Repository Monitoring */}
          <div className="col-lg-6 mb-4">
            <div className="neon-card settings-card">
              <div className="card-header">
                <h5><i className="fas fa-code-branch me-2"></i>Repository Monitoring</h5>
              </div>
              <div className="card-body">
                <div className="mb-3">
                  <label className="form-label">Add Repository</label>
                  <div className="input-group">
                    <input
                      type="text"
                      className="form-control neon-input"
                      value={newRepo}
                      onChange={(e) => setNewRepo(e.target.value)}
                      placeholder="username/repository"
                    />
                    <button 
                      className="btn btn-neon" 
                      onClick={addRepository}
                      disabled={!newRepo}
                    >
                      <i className="fas fa-plus"></i>
                    </button>
                  </div>
                </div>
                
                <div className="monitored-repos">
                  <label className="form-label">Monitored Repositories</label>
                  {settings.repositories.length === 0 ? (
                    <p className="text-muted">No repositories monitored</p>
                  ) : (
                    <div className="repo-list">
                      {settings.repositories.map((repo, index) => (
                        <div key={index} className="repo-item">
                          <span className="repo-name">{repo}</span>
                          <button 
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => removeRepository(repo)}
                          >
                            <i className="fas fa-times"></i>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className="col-lg-6 mb-4">
            <div className="neon-card settings-card">
              <div className="card-header">
                <h5><i className="fas fa-bell me-2"></i>Notifications</h5>
              </div>
              <div className="card-body">
                <div className="form-check mb-3">
                  <input
                    className="form-check-input neon-checkbox"
                    type="checkbox"
                    checked={settings.notifications.email}
                    onChange={(e) => handleInputChange('notifications', 'email', e.target.checked)}
                  />
                  <label className="form-check-label">Email Notifications</label>
                </div>
                <div className="form-check mb-3">
                  <input
                    className="form-check-input neon-checkbox"
                    type="checkbox"
                    checked={settings.notifications.browser}
                    onChange={(e) => handleInputChange('notifications', 'browser', e.target.checked)}
                  />
                  <label className="form-check-label">Browser Notifications</label>
                </div>
                <div className="form-check mb-3">
                  <input
                    className="form-check-input neon-checkbox"
                    type="checkbox"
                    checked={settings.notifications.pullRequests}
                    onChange={(e) => handleInputChange('notifications', 'pullRequests', e.target.checked)}
                  />
                  <label className="form-check-label">Pull Request Updates</label>
                </div>
                <div className="form-check mb-3">
                  <input
                    className="form-check-input neon-checkbox"
                    type="checkbox"
                    checked={settings.notifications.reviews}
                    onChange={(e) => handleInputChange('notifications', 'reviews', e.target.checked)}
                  />
                  <label className="form-check-label">Review Completions</label>
                </div>
                <div className="form-check">
                  <input
                    className="form-check-input neon-checkbox"
                    type="checkbox"
                    checked={settings.notifications.mentions}
                    onChange={(e) => handleInputChange('notifications', 'mentions', e.target.checked)}
                  />
                  <label className="form-check-label">Mentions & Comments</label>
                </div>
              </div>
            </div>
          </div>

          {/* Appearance */}
          <div className="col-lg-6 mb-4">
            <div className="neon-card settings-card">
              <div className="card-header">
                <h5><i className="fas fa-palette me-2"></i>Appearance</h5>
              </div>
              <div className="card-body">
                <div className="mb-3">
                  <label className="form-label">Theme</label>
                  <select
                    className="form-select neon-select"
                    value={settings.appearance.theme}
                    onChange={(e) => handleInputChange('appearance', 'theme', e.target.value)}
                  >
                    <option value="neon-dark">Neon Dark</option>
                    <option value="classic-dark">Classic Dark</option>
                    <option value="blue-theme">Blue Theme</option>
                  </select>
                </div>
                <div className="form-check mb-3">
                  <input
                    className="form-check-input neon-checkbox"
                    type="checkbox"
                    checked={settings.appearance.compactMode}
                    onChange={(e) => handleInputChange('appearance', 'compactMode', e.target.checked)}
                  />
                  <label className="form-check-label">Compact Mode</label>
                </div>
                <div className="form-check">
                  <input
                    className="form-check-input neon-checkbox"
                    type="checkbox"
                    checked={settings.appearance.showAnimations}
                    onChange={(e) => handleInputChange('appearance', 'showAnimations', e.target.checked)}
                  />
                  <label className="form-check-label">Show Animations</label>
                </div>
              </div>
            </div>
          </div>

          {/* Auto Sync */}
          <div className="col-lg-6 mb-4">
            <div className="neon-card settings-card">
              <div className="card-header">
                <h5><i className="fas fa-sync me-2"></i>Auto Sync</h5>
              </div>
              <div className="card-body">
                <div className="form-check mb-3">
                  <input
                    className="form-check-input neon-checkbox"
                    type="checkbox"
                    checked={settings.autoSync.enabled}
                    onChange={(e) => handleInputChange('autoSync', 'enabled', e.target.checked)}
                  />
                  <label className="form-check-label">Enable Auto Sync</label>
                </div>
                <div className="mb-3">
                  <label className="form-label">Sync Interval (minutes)</label>
                  <input
                    type="number"
                    className="form-control neon-input"
                    value={settings.autoSync.interval}
                    onChange={(e) => handleInputChange('autoSync', 'interval', parseInt(e.target.value))}
                    min="1"
                    max="60"
                    disabled={!settings.autoSync.enabled}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="col-lg-6 mb-4">
            <div className="neon-card settings-card">
              <div className="card-header">
                <h5><i className="fas fa-tools me-2"></i>Actions</h5>
              </div>
              <div className="card-body">
                <div className="d-grid gap-2">
                  <button 
                    className="btn btn-neon btn-lg"
                    onClick={saveSettings}
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <i className="fas fa-spinner fa-spin me-2"></i>
                        Saving...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-save me-2"></i>
                        Save Settings
                      </>
                    )}
                  </button>
                  <button 
                    className="btn btn-outline-danger"
                    onClick={resetSettings}
                  >
                    <i className="fas fa-undo me-2"></i>
                    Reset to Default
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;