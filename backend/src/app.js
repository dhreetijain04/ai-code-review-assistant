const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { connectToDatabase, initializeDatabase } = require('./config/database');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors({
  origin: [
    'http://localhost:3000',  // Local development
    'https://your-site-name.netlify.app',  // Replace with your actual Netlify URL
    /https:\/\/.*\.netlify\.app$/,  // Allow any Netlify app
    /https:\/\/.*\.netlify\.com$/   // Allow legacy Netlify domains
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Debug middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, {
    body: req.body,
    query: req.query,
    headers: req.headers
  });
  next();
});

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'AI Code Review Assistant API is running!', 
    status: 'healthy',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    database: 'connected',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/repositories', require('./routes/repositories'));
app.use('/api/review', require('./routes/review'));
app.use('/api/reviews', require('./routes/reviewsEnhanced'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/team', require('./routes/team'));

// Health check endpoint
app.get('/api/health', async (req, res) => {
  let dbStatus = 'disconnected';
  try {
    const { pool } = require('./config/database');
    const dbPool = pool();
    if (process.env.ENABLE_POSTGRES === 'true' && dbPool) {
      await dbPool.query('SELECT 1');
      dbStatus = 'connected';
    } else {
      dbStatus = 'disabled';
    }
  } catch (error) {
    dbStatus = 'error';
  }
  
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    database: dbStatus,
    mode: process.env.NODE_ENV || 'development'
  });
});

// Initialize database on startup (if PostgreSQL is available)
async function startServer() {
  try {
    console.log('Starting server...');
    
    // Try to initialize database if PostgreSQL is available
    if (process.env.NODE_ENV === 'production' || process.env.ENABLE_POSTGRES === 'true') {
      console.log('Initializing database...');
      await connectToDatabase();
      await initializeDatabase();
      console.log('Database initialized successfully');
    } else {
      console.log('Running in development mode without PostgreSQL');
      console.log('Set ENABLE_POSTGRES=true in .env to enable database features');
    }
    
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('Failed to initialize database:', error.message);
    console.log('Starting server without database...');
    
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT} (without database)`);
      console.log(`Health check: http://localhost:${PORT}/api/health`);
    });
  }
}

startServer();
