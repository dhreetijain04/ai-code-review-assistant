# 🚀 AI Code Review Assistant

A modern full-stack web application that enhances your GitHub code review workflow with intelligent analytics, team collaboration, and comprehensive review management.

**🔄 Build Status:** Successfully deployed and operational.

## ✨ Features

- **🔐 GitHub Integration**: Seamless authentication using GitHub personal access tokens
- **📊 Interactive Dashboard**: Real-time analytics with beautiful charts and metrics
- **👥 Team Management**: Collaborate with team members on code reviews
- **📝 Review Tracking**: Complete code review workflow with database persistence
- **📈 Analytics & Insights**: Visual data representation of review trends and statistics
- **📱 Responsive Design**: Works perfectly on desktop, tablet, and mobile devices
- **🎨 Modern UI**: Professional neon-themed interface with smooth animations

## 🛠️ Tech Stack

### Frontend
- **React 19.1.1** - Modern React with hooks and functional components
- **React Router 6.30.1** - Client-side routing and navigation
- **Bootstrap 5.3.7** - Responsive UI framework and components
- **Chart.js 4.4.0** - Interactive charts and data visualization
- **React-Bootstrap 2.10.10** - Bootstrap components for React
- **Axios 1.11.0** - HTTP client for API communication

### Backend
- **Node.js** - JavaScript runtime environment
- **Express.js 4.18.2** - Fast web application framework
- **PostgreSQL** - Robust relational database
- **GitHub API** - Live repository and pull request integration
- **JWT Authentication** - Secure user session management
- **CORS & Helmet** - Security and cross-origin handling

### Database
- **PostgreSQL 13+** - Primary database with structured schema
- **Automatic Migrations** - Database schema setup on startup
- **Data Models**: Users, Repositories, Code Reviews, Team Members

## 🚀 Quick Start

### Prerequisites
- **Node.js** (v16 or higher)
- **PostgreSQL** (v12 or higher)
- **GitHub Personal Access Token**

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/dhreetijain04/ai-code-review-assistant.git
   cd ai-code-review-assistant
   ```

2. **Setup Backend**
   ```bash
   cd backend
   npm install
   
   # Create environment file
   touch .env
   # Add your configuration (see Environment Variables section)
   
   npm start
   ```

3. **Setup Frontend**
   ```bash
   cd ../frontend
   npm install
   
   # Create environment file
   touch .env
   # Add your configuration (see Environment Variables section)
   
   npm start
   ```

4. **Access the Application**
   - **Frontend**: http://localhost:3000
   - **Backend API**: http://localhost:3002

## ⚙️ Environment Variables

### Frontend (.env)
```env
REACT_APP_API_URL=http://localhost:3002
REACT_APP_GITHUB_CLIENT_ID=your_github_client_id_here
```

### Backend (.env)
```env
NODE_ENV=development
PORT=3002
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ai_code_review
DB_USER=postgres
DB_PASSWORD=your_password_here
JWT_SECRET=your_super_secret_jwt_key_here
GITHUB_TOKEN=your_github_personal_access_token_here
```

## 🔑 GitHub Token Setup

1. Go to **GitHub → Settings → Developer settings → Personal access tokens**
2. Click **"Generate new token (classic)"**
3. Select the following scopes:
   - `repo` - Full control of private repositories
   - `read:user` - Read user profile data
   - `read:org` - Read organization data
4. Copy the generated token and add it to your backend `.env` file

## 📖 How to Use

### 1. **Login**
- Open the application at `http://localhost:3000`
- Enter your GitHub personal access token
- Click "Login" to authenticate

### 2. **Dashboard**
- View real-time statistics from your GitHub repositories
- See active pull requests, total reviews, and critical issues
- Analyze review trends with interactive charts

### 3. **Repository Management**
- Browse and sync your GitHub repositories
- View repository details and recent activity
- Monitor pull request status and review progress

### 4. **Code Reviews**
- Create new code reviews for pull requests
- Track review history and progress
- Collaborate with team members on reviews

### 5. **Team Collaboration**
- Invite team members to join reviews
- Assign reviews to specific team members
- Monitor team performance and productivity

### 6. **Settings**
- Configure your preferences and notifications
- Manage GitHub integration settings
- Customize dashboard display options

## 🏗️ Project Structure

```
ai-code-review-assistant/
├── frontend/                    # React application
│   ├── public/                 # Static assets
│   ├── src/
│   │   ├── components/         # React components
│   │   │   ├── auth/          # Authentication components
│   │   │   ├── dashboard/     # Dashboard and analytics
│   │   │   ├── repositories/  # Repository management
│   │   │   ├── reviewHistory/ # Review tracking
│   │   │   ├── settings/      # User settings
│   │   │   └── teamPerformance/ # Team analytics
│   │   ├── services/          # API services
│   │   └── App.js             # Main application component
│   └── package.json           # Frontend dependencies
├── backend/                    # Node.js API server
│   ├── src/
│   │   ├── config/           # Database configuration
│   │   ├── models/           # Data models
│   │   ├── routes/           # API endpoints
│   │   ├── migrations/       # Database migrations
│   │   └── app.js            # Main server file
│   └── package.json          # Backend dependencies
└── README.md                 # Project documentation
```

## 🚀 Deployment

### Build for Production

1. **Build Frontend**
   ```bash
   cd frontend
   npm run build
   ```

2. **Prepare Backend**
   ```bash
   cd backend
   npm install --production
   ```

### Deployment Options

- **Frontend**: Netlify, GitHub Pages
- **Backend**: Render
- **Database**:  Postgres, Supabase

## 🧪 Testing

```bash
# Frontend tests
cd frontend
npm test

# Backend (when implemented)
cd backend
npm test
```

## 📊 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/repositories` | Fetch user repositories |
| GET | `/api/reviews` | Get code reviews |
| POST | `/api/reviews` | Create new review |
| GET | `/api/dashboard` | Dashboard analytics data |
| GET | `/api/team` | Team member information |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 👨‍💻 Author

**Dhreeti Jain** - [@dhreetijain04](https://github.com/dhreetijain04)

## 🙏 Acknowledgments

- **GitHub API** for seamless repository integration
- **Chart.js** for beautiful data visualizations
- **Bootstrap** for responsive design components
- **PostgreSQL** for reliable data persistence
- **React Community** for excellent documentation and support

---

⭐ **Star this repository if you find it helpful!**

📧 **Have questions?** Feel free to open an issue or reach out!

🚀 **Ready to transform your code review process?** Get started now!
