const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// Simple AI code review implementation
const analyzeCode = async (code, language, repository, prNumber) => {
  // Basic code analysis patterns
  const issues = [];
  const recommendations = [];
  let qualityScore = 85; // Default score

  console.log(`🔍 Analyzing ${code.length} characters of ${language} code...`);

  // Check for common issues across all languages
  if (code.includes('console.log') && (language === 'javascript' || language === 'typescript')) {
    issues.push({
      title: 'Debug statements found',
      description: 'console.log statements should be removed in production code',
      severity: 'medium',
      line: findLineNumber(code, 'console.log')
    });
    qualityScore -= 10;
  }

  if (code.includes('var ') && (language === 'javascript' || language === 'typescript')) {
    issues.push({
      title: 'Use of var keyword',
      description: 'Use let or const instead of var for better scoping',
      severity: 'low',
      line: findLineNumber(code, 'var ')
    });
    qualityScore -= 5;
  }

  if (code.includes('==') && !code.includes('===') && (language === 'javascript' || language === 'typescript')) {
    issues.push({
      title: 'Loose equality comparison',
      description: 'Use strict equality (===) instead of loose equality (==)',
      severity: 'medium',
      line: findLineNumber(code, '==')
    });
    qualityScore -= 8;
  }

  if (code.includes('innerHTML') && (language === 'javascript' || language === 'typescript')) {
    issues.push({
      title: 'Potential XSS vulnerability',
      description: 'Using innerHTML can lead to XSS attacks. Consider using textContent or proper sanitization',
      severity: 'high',
      line: findLineNumber(code, 'innerHTML')
    });
    qualityScore -= 15;
  }

  if (code.includes('eval(') && (language === 'javascript' || language === 'typescript')) {
    issues.push({
      title: 'Use of eval() function',
      description: 'eval() is dangerous and should be avoided as it can execute arbitrary code',
      severity: 'critical',
      line: findLineNumber(code, 'eval(')
    });
    qualityScore -= 25;
  }

  // Check for TODO and FIXME comments
  if (code.includes('TODO') || code.includes('FIXME')) {
    issues.push({
      title: 'Unfinished work detected',
      description: 'TODO or FIXME comments indicate incomplete code',
      severity: 'low',
      line: findLineNumber(code, 'TODO') || findLineNumber(code, 'FIXME')
    });
    qualityScore -= 5;
  }

  // Check for hardcoded URLs or API keys
  const urlPattern = /https?:\/\/[^\s]+/g;
  const matches = code.match(urlPattern);
  if (matches && matches.length > 0) {
    issues.push({
      title: 'Hardcoded URLs detected',
      description: 'Consider using environment variables or configuration files for URLs',
      severity: 'medium',
      line: findLineNumber(code, matches[0])
    });
    qualityScore -= 8;
  }

  // Python specific checks
  if (language === 'python') {
    if (code.includes('import *')) {
      issues.push({
        title: 'Wildcard import detected',
        description: 'Avoid using wildcard imports as they pollute the namespace',
        severity: 'medium',
        line: findLineNumber(code, 'import *')
      });
      qualityScore -= 10;
    }

    if (code.includes('except:') && !code.includes('except Exception:')) {
      issues.push({
        title: 'Bare except clause',
        description: 'Catch specific exceptions instead of using bare except',
        severity: 'medium',
        line: findLineNumber(code, 'except:')
      });
      qualityScore -= 8;
    }

    if (code.includes('print(') && !code.includes('# debug')) {
      issues.push({
        title: 'Print statements found',
        description: 'Consider using proper logging instead of print statements',
        severity: 'low',
        line: findLineNumber(code, 'print(')
      });
      qualityScore -= 5;
    }
  }

  // Java specific checks
  if (language === 'java') {
    if (code.includes('System.out.print') && !code.includes('// debug')) {
      issues.push({
        title: 'Debug print statements found',
        description: 'System.out.print statements should be removed in production code or replaced with proper logging',
        severity: 'medium',
        line: findLineNumber(code, 'System.out.print')
      });
      qualityScore -= 10;
    }

    if (code.includes('catch (Exception e)') && code.includes('e.printStackTrace()')) {
      issues.push({
        title: 'Generic exception handling with stack trace',
        description: 'Avoid catching generic Exception and printing stack traces in production',
        severity: 'medium',
        line: findLineNumber(code, 'catch (Exception e)')
      });
      qualityScore -= 8;
    }

    if (code.includes('== null') || code.includes('!= null')) {
      issues.push({
        title: 'Null comparison detected',
        description: 'Consider using Objects.equals() or Optional to handle null values safely',
        severity: 'low',
        line: findLineNumber(code, '== null') || findLineNumber(code, '!= null')
      });
      qualityScore -= 5;
    }

    if (code.includes('new ArrayList()') && !code.includes('ArrayList<')) {
      issues.push({
        title: 'Raw type usage',
        description: 'Use generic types instead of raw types for type safety',
        severity: 'medium',
        line: findLineNumber(code, 'new ArrayList()')
      });
      qualityScore -= 8;
    }

    // Check for missing error handling in loops
    if (code.includes('for (') && code.includes('[') && !code.includes('try')) {
      issues.push({
        title: 'Potential array access without bounds checking',
        description: 'Consider adding bounds checking or using enhanced for-loops to prevent ArrayIndexOutOfBoundsException',
        severity: 'medium',
        line: findLineNumber(code, 'for (')
      });
      qualityScore -= 8;
    }

    // Check for hardcoded magic numbers
    const magicNumberPattern = /\b(?!0|1|2|10|100|1000)\d{2,}\b/g;
    const magicNumbers = code.match(magicNumberPattern);
    if (magicNumbers && magicNumbers.length > 2) {
      issues.push({
        title: 'Magic numbers detected',
        description: 'Consider extracting magic numbers into named constants for better readability',
        severity: 'low',
        line: findLineNumber(code, magicNumbers[0])
      });
      qualityScore -= 5;
    }

    // Check for empty catch blocks
    if (code.includes('catch') && code.includes('{}')) {
      issues.push({
        title: 'Empty catch block',
        description: 'Empty catch blocks suppress exceptions silently. Add proper error handling',
        severity: 'high',
        line: findLineNumber(code, 'catch')
      });
      qualityScore -= 15;
    }

    // Check for missing access modifiers
    if (code.includes('class ') && !code.includes('public class') && !code.includes('private class')) {
      issues.push({
        title: 'Missing access modifier',
        description: 'Explicitly specify access modifiers (public, private, protected) for better code clarity',
        severity: 'low',
        line: findLineNumber(code, 'class ')
      });
      qualityScore -= 3;
    }
  }

  // General checks
  const lines = code.split('\n');
  let longFunctionDetected = false;
  let functionLineCount = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Check for long functions
    if (line.includes('function') || line.includes('def ') || line.includes('public ') || line.includes('private ') || line.includes('static ')) {
      functionLineCount = 1;
    } else if (functionLineCount > 0) {
      functionLineCount++;
      if (functionLineCount > 50 && !longFunctionDetected) {
        issues.push({
          title: 'Function too long',
          description: 'Consider breaking down large functions into smaller, more manageable ones',
          severity: 'medium',
          line: i + 1
        });
        qualityScore -= 12;
        longFunctionDetected = true;
      }
    }
    
    // Reset counter on function end (simplified)
    if (line === '}' || line === '' || line.includes('return')) {
      functionLineCount = 0;
    }

    // Check for long lines
    if (line.length > 120) {
      issues.push({
        title: 'Line too long',
        description: `Line ${i + 1} exceeds 120 characters. Consider breaking it down for better readability`,
        severity: 'low',
        line: i + 1
      });
      qualityScore -= 2;
    }

    // Check for missing error handling
    if ((line.includes('fetch(') || line.includes('axios.') || line.includes('http.') || line.includes('URL(') || line.includes('HttpURLConnection')) && 
        !code.includes('catch') && !code.includes('try')) {
      issues.push({
        title: 'Missing error handling',
        description: 'Network requests should include proper error handling',
        severity: 'medium',
        line: i + 1
      });
      qualityScore -= 10;
    }

    // Check for potential SQL injection (basic check)
    if (line.includes('SELECT') && line.includes('+') && (line.includes('input') || line.includes('user') || line.includes('param'))) {
      issues.push({
        title: 'Potential SQL injection vulnerability',
        description: 'Avoid string concatenation in SQL queries. Use parameterized queries instead',
        severity: 'critical',
        line: i + 1
      });
      qualityScore -= 25;
    }

    // Check for weak password validation
    if (line.toLowerCase().includes('password') && (line.includes('.length') && line.includes('< 6'))) {
      issues.push({
        title: 'Weak password validation',
        description: 'Password minimum length should be at least 8 characters',
        severity: 'medium',
        line: i + 1
      });
      qualityScore -= 8;
    }

    // Check for hardcoded credentials
    if (line.toLowerCase().includes('password') && (line.includes('=') && !line.includes('getPassword') && !line.includes('input'))) {
      issues.push({
        title: 'Hardcoded credentials detected',
        description: 'Avoid hardcoding passwords or sensitive information in source code',
        severity: 'critical',
        line: i + 1
      });
      qualityScore -= 25;
    }

    // Check for infinite loops (basic detection)
    if ((line.includes('while(true)') || line.includes('while (true)') || line.includes('for(;;)')) && !line.includes('break')) {
      issues.push({
        title: 'Potential infinite loop',
        description: 'Infinite loops should have clear exit conditions to prevent hanging',
        severity: 'high',
        line: i + 1
      });
      qualityScore -= 15;
    }

    // Check for dead code (unreachable code after return)
    if (line.includes('return') && i < lines.length - 1) {
      const nextLine = lines[i + 1]?.trim();
      if (nextLine && !nextLine.startsWith('}') && !nextLine.startsWith('//') && !nextLine.startsWith('*') && nextLine !== '') {
        issues.push({
          title: 'Unreachable code detected',
          description: 'Code after return statement is unreachable and should be removed',
          severity: 'medium',
          line: i + 2
        });
        qualityScore -= 8;
      }
    }

    // Check for missing null checks (basic detection)
    if (line.includes('.') && !line.includes('null') && !line.includes('?') && 
        (line.includes('get') || line.includes('find') || line.includes('parse'))) {
      issues.push({
        title: 'Potential null pointer exception',
        description: 'Consider adding null checks for methods that might return null',
        severity: 'medium',
        line: i + 1
      });
      qualityScore -= 5;
    }
  }

  // Add recommendations based on findings
  if (issues.length > 0) {
    recommendations.push('Review and fix the identified issues to improve code quality');
  }
  
  if (language === 'javascript' || language === 'typescript') {
    recommendations.push('Consider using ESLint for automated code quality checking');
    if (language === 'javascript') {
      recommendations.push('Consider migrating to TypeScript for better type safety');
    }
  }
  
  if (language === 'python') {
    recommendations.push('Use pylint or flake8 for code quality analysis');
    recommendations.push('Consider adding type hints for better code documentation');
  }

  recommendations.push('Add unit tests to ensure code reliability');
  recommendations.push('Use proper error handling and logging');

  // Determine overall severity
  const severities = issues.map(issue => issue.severity);
  let overallSeverity = 'low';
  
  if (severities.includes('critical')) {
    overallSeverity = 'critical';
  } else if (severities.includes('high')) {
    overallSeverity = 'high';
  } else if (severities.includes('medium')) {
    overallSeverity = 'medium';
  }

  // If no issues found, still give positive feedback
  if (issues.length === 0) {
    qualityScore = 95;
    overallSeverity = 'low';
    recommendations.unshift('Code looks good! No major issues detected.');
  }

  const result = {
    quality_score: Math.max(0, qualityScore),
    severity: overallSeverity,
    ai_feedback: {
      summary: `Code analysis completed. Found ${issues.length} issue${issues.length !== 1 ? 's' : ''} with overall ${overallSeverity} severity.`,
      issues: issues,
      recommendations: recommendations,
      issues_count: issues.length
    }
  };

  console.log(`✅ Analysis complete: ${issues.length} issues found, quality score: ${result.quality_score}`);
  return result;
};

// Helper function to find line number of a pattern
const findLineNumber = (code, pattern) => {
  const lines = code.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(pattern)) {
      return i + 1;
    }
  }
  return 1;
};

// POST /api/review - Submit code for AI review
router.post('/', async (req, res) => {
  try {
    const { repository, pr_number } = req.body;
    
    console.log('🔍 Starting PR code review...', {
      repository,
      pr_number,
      hasRepo: !!repository,
      hasPR: !!pr_number,
      bodyKeys: Object.keys(req.body)
    });

    if (!repository) {
      return res.status(400).json({
        error: 'Repository selection is required'
      });
    }

    if (!pr_number) {
      return res.status(400).json({
        error: 'Pull Request number is required'
      });
    }

    let codeToAnalyze = '';
    let analysisContext = `PR #${pr_number} changes`;
    let detectedLanguage = 'javascript'; // Default

    // Fetch the actual PR changes from GitHub
    console.log('🔄 Fetching PR changes from GitHub...');
    
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        error: 'GitHub token required to fetch PR changes'
      });
    }

    try {
      const [owner, repo] = repository.split('/');
      
      // Fetch PR details
      const prResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${pr_number}`, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (!prResponse.ok) {
        throw new Error(`Failed to fetch PR details: ${prResponse.status}`);
      }

      const prData = await prResponse.json();
      
      // Fetch PR diff/changes
      const diffResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${pr_number}/files`, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (!diffResponse.ok) {
        throw new Error(`Failed to fetch PR files: ${diffResponse.status}`);
      }

      const filesChanged = await diffResponse.json();
      console.log(`📁 Found ${filesChanged.length} changed files in PR #${pr_number}`);

      // Combine all changed code for analysis
      let combinedCode = '';
      let fileCount = 0;
      
      for (const file of filesChanged) {
        if (file.status === 'removed') continue; // Skip deleted files
        
        // Focus on code files
        const isCodeFile = /\.(js|jsx|ts|tsx|py|java|cpp|c|h|cs|php|go|rs|rb|swift)$/i.test(file.filename);
        if (!isCodeFile) continue;

        fileCount++;
        combinedCode += `\n// === File: ${file.filename} ===\n`;
        
        if (file.patch) {
          // Extract both added and modified lines from the patch
          const lines = file.patch.split('\n');
          
          // Get the full context - we want to analyze the final state of the code
          // This includes both additions (+) and the context around changes
          const relevantLines = lines.filter(line => {
            // Include added lines, context lines, and some removed lines for context
            return !line.startsWith('@@') && !line.startsWith('+++') && !line.startsWith('---');
          }).map(line => {
            // Remove the diff prefixes but keep the content
            if (line.startsWith('+') || line.startsWith('-') || line.startsWith(' ')) {
              return line.substring(1);
            }
            return line;
          });
          
          // If we have relevant changes, add them
          if (relevantLines.length > 0) {
            combinedCode += relevantLines.join('\n') + '\n\n';
          }
        } else {
          // If no patch available, try to get the file content
          try {
            const fileContentResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${file.filename}?ref=${prData.head.sha}`, {
              headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json'
              }
            });
            
            if (fileContentResponse.ok) {
              const fileData = await fileContentResponse.json();
              const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
              combinedCode += content + '\n\n';
            }
          } catch (contentError) {
            console.warn(`Could not fetch content for ${file.filename}`);
          }
        }
      }

      // Auto-detect language from files
      const extensions = filesChanged.map(f => f.filename.split('.').pop()?.toLowerCase());
      if (extensions.includes('js') || extensions.includes('jsx')) {
        detectedLanguage = 'javascript';
      } else if (extensions.includes('ts') || extensions.includes('tsx')) {
        detectedLanguage = 'typescript';
      } else if (extensions.includes('py')) {
        detectedLanguage = 'python';
      } else if (extensions.includes('java')) {
        detectedLanguage = 'java';
      }

      if (combinedCode.trim()) {
        codeToAnalyze = combinedCode;
        analysisContext = `PR #${pr_number} changes (${fileCount} files modified)`;
        
        console.log(`✅ Successfully fetched PR changes:`);
        console.log(`   - ${fileCount} files analyzed`);
        console.log(`   - ${codeToAnalyze.length} characters of code`);
        console.log(`   - Detected language: ${detectedLanguage}`);
        
        // Show a preview of the code being analyzed
        const preview = codeToAnalyze.substring(0, 200);
        console.log(`   - Code preview: ${preview}${codeToAnalyze.length > 200 ? '...' : ''}`);
      } else {
        console.log(`❌ No analyzable code found in PR #${pr_number}`);
        console.log(`   - Files changed: ${filesChanged.length}`);
        console.log(`   - Code files found: ${fileCount}`);
        
        // Let's try a different approach - get all modified files regardless of type
        let allChanges = '';
        for (const file of filesChanged) {
          if (file.status === 'removed') continue;
          
          allChanges += `\n// === File: ${file.filename} ===\n`;
          if (file.patch) {
            allChanges += file.patch + '\n';
          }
        }
        
        if (allChanges.trim()) {
          console.log(`⚠️ Falling back to analyzing all changes including non-code files`);
          codeToAnalyze = allChanges;
          analysisContext = `PR #${pr_number} all changes (${filesChanged.length} files)`;
        } else {
          return res.status(400).json({
            error: 'No analyzable code changes found in the selected PR',
            details: `Found ${filesChanged.length} changed files but no code content to analyze`
          });
        }
      }
      
    } catch (githubError) {
      console.error('❌ Failed to fetch PR from GitHub:', githubError);
      return res.status(500).json({
        error: 'Failed to fetch PR changes from GitHub',
        details: githubError.message
      });
    }

    // Perform AI analysis
    const analysisResult = await analyzeCode(codeToAnalyze, detectedLanguage, repository, pr_number);
    
    // Enhance the result with context information
    analysisResult.analysis_context = analysisContext;
    analysisResult.repository = repository;
    analysisResult.pr_number = pr_number;
    
    // Save review to database if available
    try {
      const dbPool = pool();
      if (process.env.ENABLE_POSTGRES === 'true' && dbPool) {
        const authHeader = req.headers.authorization;
        const token = authHeader?.split(' ')[1];
        
        // Get user ID from token (simplified - in production, verify JWT)
        const userId = 1; // Placeholder

        const insertQuery = `
          INSERT INTO code_reviews (
            user_id, repository_name, pr_number, pr_title,
            code_content, language, review_status, severity,
            quality_score, ai_feedback, created_at, completed_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
          RETURNING id
        `;

        const values = [
          userId,
          repository,
          pr_number,
          analysisResult.analysis_context || `PR #${pr_number} Review`,
          codeToAnalyze.substring(0, 10000), // Limit code content to prevent DB issues
          detectedLanguage,
          'completed',
          analysisResult.severity,
          analysisResult.quality_score,
          JSON.stringify(analysisResult.ai_feedback)
        ];

        const result = await dbPool.query(insertQuery, values);
        console.log('✅ Review saved to database:', result.rows[0].id);
      } else {
        console.log('⚠️ Database not available, skipping save');
      }
    } catch (dbError) {
      console.warn('⚠️ Failed to save to database:', dbError.message);
      // Continue without database - return analysis anyway
    }

    console.log('✅ AI review completed:', {
      score: analysisResult.quality_score,
      severity: analysisResult.severity,
      issuesFound: analysisResult.ai_feedback.issues_count
    });

    res.json(analysisResult);

  } catch (error) {
    console.error('❌ AI review failed:', error);
    res.status(500).json({
      error: 'Failed to perform AI review',
      details: error.message
    });
  }
});

// GET /api/review/repositories - Get available repositories for review
router.get('/repositories', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Fetch repositories from database
    if (process.env.ENABLE_POSTGRES === 'true') {
      const query = 'SELECT * FROM repositories ORDER BY name';
      const result = await pool.query(query);
      
      res.json({
        repositories: result.rows.map(repo => ({
          id: repo.github_repo_id,
          name: repo.name,
          full_name: repo.full_name,
          description: repo.description
        }))
      });
    } else {
      // Return mock data for development
      res.json({
        repositories: [
          {
            id: 1,
            name: 'ai-code-review-assistant',
            full_name: 'dhreetijain04/ai-code-review-assistant',
            description: 'AI-powered code review assistant'
          }
        ]
      });
    }
  } catch (error) {
    console.error('Error fetching repositories:', error);
    res.status(500).json({
      error: 'Failed to fetch repositories',
      details: error.message
    });
  }
});

module.exports = router;
