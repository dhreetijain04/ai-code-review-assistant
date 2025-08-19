const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// GET /api/reviews - Get review history for the authenticated user
router.get('/', async (req, res) => {
  try {
    console.log('📋 Fetching review history...');
    
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }

    // Get query parameters for filtering and pagination
    const { 
      status, 
      severity, 
      repository, 
      limit = 50, 
      offset = 0,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = req.query;

    console.log('📊 Query parameters:', { status, severity, repository, limit, offset });

    try {
      const dbPool = pool();
      if (process.env.ENABLE_POSTGRES === 'true' && dbPool) {
        // Build dynamic query based on filters
        let query = `
          SELECT 
            id,
            repository_name,
            pr_number,
            pr_title,
            language,
            review_status,
            severity,
            quality_score,
            ai_feedback,
            created_at,
            completed_at
          FROM code_reviews
          WHERE 1=1
        `;
        
        const queryParams = [];
        let paramCount = 0;

        // Add filters
        if (status && status !== 'all') {
          paramCount++;
          query += ` AND review_status = $${paramCount}`;
          queryParams.push(status);
        }

        if (severity && severity !== 'all') {
          paramCount++;
          query += ` AND severity = $${paramCount}`;
          queryParams.push(severity);
        }

        if (repository) {
          paramCount++;
          query += ` AND repository_name ILIKE $${paramCount}`;
          queryParams.push(`%${repository}%`);
        }

        // Add sorting
        const allowedSortFields = ['created_at', 'completed_at', 'repository_name', 'severity', 'quality_score'];
        const allowedSortOrders = ['ASC', 'DESC'];
        
        const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
        const safeSortOrder = allowedSortOrders.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';
        
        query += ` ORDER BY ${safeSortBy} ${safeSortOrder}`;

        // Add pagination
        paramCount++;
        query += ` LIMIT $${paramCount}`;
        queryParams.push(parseInt(limit));
        
        paramCount++;
        query += ` OFFSET $${paramCount}`;
        queryParams.push(parseInt(offset));

        console.log('📊 Executing query:', query);
        console.log('📊 Query params:', queryParams);

        const result = await dbPool.query(query, queryParams);
        
        // Get total count for pagination
        let countQuery = `
          SELECT COUNT(*) as total
          FROM code_reviews
          WHERE 1=1
        `;
        
        const countParams = [];
        let countParamIndex = 0;

        if (status && status !== 'all') {
          countParamIndex++;
          countQuery += ` AND review_status = $${countParamIndex}`;
          countParams.push(status);
        }

        if (severity && severity !== 'all') {
          countParamIndex++;
          countQuery += ` AND severity = $${countParamIndex}`;
          countParams.push(severity);
        }

        if (repository) {
          countParamIndex++;
          countQuery += ` AND repository_name ILIKE $${countParamIndex}`;
          countParams.push(`%${repository}%`);
        }

        const countResult = await dbPool.query(countQuery, countParams);
        const totalCount = parseInt(countResult.rows[0].total);

        console.log(`✅ Found ${result.rows.length} reviews (total: ${totalCount})`);

        res.json({
          reviews: result.rows,
          pagination: {
            total: totalCount,
            limit: parseInt(limit),
            offset: parseInt(offset),
            hasMore: (parseInt(offset) + parseInt(limit)) < totalCount
          }
        });

      } else {
        // No database available - return empty result
        console.log('⚠️ Database not available, returning empty results');
        console.log('📊 Environment ENABLE_POSTGRES:', process.env.ENABLE_POSTGRES);
        console.log('📊 Pool available:', !!dbPool);
        
        res.json({
          reviews: [],
          pagination: {
            total: 0,
            limit: parseInt(limit),
            offset: parseInt(offset),
            hasMore: false
          }
        });
      }

    } catch (dbError) {
      console.error('❌ Database error:', dbError);
      res.status(500).json({
        error: 'Failed to fetch reviews from database',
        details: dbError.message
      });
    }

  } catch (error) {
    console.error('❌ Error fetching review history:', error);
    res.status(500).json({
      error: 'Failed to fetch review history',
      details: error.message
    });
  }
});

// GET /api/reviews/:id - Get specific review details
router.get('/:id', async (req, res) => {
  try {
    const reviewId = req.params.id;
    console.log(`📋 Fetching review details for ID: ${reviewId}`);

    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }

    if (process.env.ENABLE_POSTGRES === 'true') {
      const dbPool = pool();
      if (dbPool) {
        const query = `
          SELECT 
            id,
            repository_name,
            pr_number,
            pr_title,
            code_content,
            language,
            review_status,
            severity,
            quality_score,
            ai_feedback,
            created_at,
            completed_at
          FROM code_reviews
          WHERE id = $1
        `;

        const result = await dbPool.query(query, [reviewId]);
        
        if (result.rows.length === 0) {
          return res.status(404).json({
            error: 'Review not found'
          });
        }

        console.log(`✅ Found review: ${result.rows[0].repository_name}`);
        res.json({ review: result.rows[0] });
      } else {
        res.status(503).json({
          error: 'Database not available'
        });
      }
    } else {
      res.status(503).json({
        error: 'Database not available'
      });
    }

  } catch (error) {
    console.error('❌ Error fetching review details:', error);
    res.status(500).json({
      error: 'Failed to fetch review details',
      details: error.message
    });
  }
});

// DELETE /api/reviews/:id - Delete a review
router.delete('/:id', async (req, res) => {
  try {
    const reviewId = req.params.id;
    console.log(`🗑️ Deleting review ID: ${reviewId}`);

    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }

    if (process.env.ENABLE_POSTGRES === 'true') {
      const dbPool = pool();
      if (dbPool) {
        const query = 'DELETE FROM code_reviews WHERE id = $1 RETURNING id';
        const result = await dbPool.query(query, [reviewId]);
        
        if (result.rows.length === 0) {
          return res.status(404).json({
            error: 'Review not found'
          });
        }

        console.log(`✅ Deleted review ID: ${reviewId}`);
        res.json({ 
          message: 'Review deleted successfully',
          id: reviewId 
        });
      } else {
        res.status(503).json({
          error: 'Database not available'
        });
      }
    } else {
      res.status(503).json({
        error: 'Database not available'
      });
    }

  } catch (error) {
    console.error('❌ Error deleting review:', error);
    res.status(500).json({
      error: 'Failed to delete review',
      details: error.message
    });
  }
});

module.exports = router;