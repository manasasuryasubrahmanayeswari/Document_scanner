//backend/server.js
require("dotenv").config();
const express = require("express");
const session = require("express-session");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcryptjs");
const cors = require("cors");
const path = require("path");
const multer = require("multer");
const fs = require("fs");
const fsPromises = require("fs").promises;
const { spawn } = require('child_process');
const { promisify } = require('util');


// Directory check and creation
const dbPath = path.join(__dirname, "database", "database.db");
if (!fs.existsSync(path.dirname(dbPath))) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
}

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cors({ origin: "http://localhost:5500", credentials: true }));
app.use(express.static(path.join(__dirname, "../frontend")));

// Session Middleware
app.use(
  session({
    secret: process.env.SESSION_SECRET || "supersecretkey",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, httpOnly: true, maxAge: 1000 * 60 * 60 * 24 }, // 1 day
  })
);

// Initialize SQLite Database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error("Database connection error:", err.message);
  else console.log("✅ Connected to SQLite database.");
});
const dbGet = promisify(db.get.bind(db));
const dbAll = promisify(db.all.bind(db));
// Create Users Table with Role
db.run(
  `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'user', -- 'user' or 'admin'
      credits INTEGER DEFAULT 20
  )`
);

// Create documents table
db.run(`
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      filename TEXT NOT NULL,
      content TEXT NOT NULL,
      file_path TEXT NOT NULL,
      upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `);

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "text/plain") {
      cb(null, true);
    } else {
      cb(new Error("Only .txt files are allowed!"), false);
    }
  },
  limits: {
    fileSize: 1024 * 1024, // 1MB limit
  },
});

// Credit deduction middleware
const checkAndDeductCredits = async (req, res, next) => {
  const userId = req.session.user.id;

  db.get("SELECT credits FROM users WHERE id = ?", [userId], (err, row) => {
    if (err) {
      return res.status(500).json({ error: "Database error" });
    }

    if (!row || row.credits < 1) {
      return res.status(403).json({ error: "Insufficient credits" });
    }

    // Deduct 1 credit
    db.run(
      "UPDATE users SET credits = credits - 1 WHERE id = ?",
      [userId],
      (err) => {
        if (err) {
          return res.status(500).json({ error: "Failed to deduct credits" });
        }
        next();
      }
    );
  });
};

// Ensure First User is Always an Admin
db.get(`SELECT * FROM users WHERE id = 1`, (err, user) => {
  if (!user) {
    const adminPassword = bcrypt.hashSync("admin123", 10);
    db.run(
      `INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)`,
      ["Admin", "admin@example.com", adminPassword, "admin"]
    );
  }
});

// Authentication Middleware
const isAuthenticated = (req, res, next) => {
  if (req.session.user) next();
  else res.status(401).json({ error: "Unauthorized. Please log in." });
};

// Admin Middleware
const isAdmin = (req, res, next) => {
  if (req.session.user && req.session.user.role === "admin") next();
  else res.status(403).json({ error: "Access denied. Admins only!" });
};

// Register Route
app.post("/register", async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password)
    return res.status(400).json({ error: "All fields are required!" });

  const hashedPassword = await bcrypt.hash(password, 10);
  db.run(
    `INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)`,
    [username, email, hashedPassword, "user"],
    function (err) {
      if (err)
        return res
          .status(400)
          .json({ error: "Username or email already exists!" });
      res.status(201).json({ message: "User registered successfully!" });
    }
  );
});

// Login Route
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res
      .status(400)
      .json({ error: "Username and password are required!" });

  db.get(
    `SELECT * FROM users WHERE username = ?`,
    [username],
    async (err, user) => {
      if (err || !user)
        return res.status(401).json({ error: "Invalid username or password!" });

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch)
        return res.status(401).json({ error: "Invalid username or password!" });

      req.session.user = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      };
      res.json({ message: "Login successful!", user: req.session.user });
    }
  );
});

// Logout Route
app.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err)
      return res.status(500).json({ error: "Could not log out, try again!" });
    res.json({ message: "Logout successful!" });
  });
});

// Promote User to Admin Route
app.post("/promote-to-admin", isAuthenticated, isAdmin, (req, res) => {
  const { email, adminPassword } = req.body;
  if (adminPassword !== "Srivalli")
    return res.status(403).json({ error: "Incorrect admin password!" });

  db.run(
    `UPDATE users SET role = 'admin' WHERE email = ?`,
    [email],
    function (err) {
      if (err)
        return res
          .status(500)
          .json({ error: "Failed to promote user to admin!" });
      if (this.changes === 0)
        return res.status(404).json({ error: "User not found!" });

      res.json({ message: "User promoted to admin successfully!" });
    }
  );
});

// Get All Users (Admin Only)
app.get("/users", isAuthenticated, isAdmin, (req, res) => {
  db.all(`SELECT id, username, email, role FROM users`, [], (err, users) => {
    if (err) return res.status(500).json({ error: "Failed to fetch users!" });
    res.json({ users });
  });
});

// Dashboard Route
app.get("/dashboard", isAuthenticated, (req, res) => {
  res.json({ message: "Welcome to the dashboard!", user: req.session.user });
});

// Add this function to check document similarity
async function checkDocumentSimilarity(newContent, existingContent) {
  return new Promise((resolve, reject) => {
    // Create a temporary file for the new content
    const tempFile = path.join(__dirname, 'uploads', `temp-${Date.now()}.txt`);
    fs.writeFileSync(tempFile, newContent);

    // Spawn Python process with both the new content file and existing content
    const pythonProcess = spawn('python', [
      'similarity_checker.py',
      tempFile,
      existingContent
    ]);
    
    let result = '';
    let error = '';

    pythonProcess.stdout.on('data', (data) => {
      result += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      error += data.toString();
    });

    pythonProcess.on('close', (code) => {
      // Clean up temp file
      fs.unlinkSync(tempFile);
      
      if (code !== 0) {
        reject(new Error(`Python process failed: ${error}`));
        return;
      }

      try {
        const similarity = JSON.parse(result);
        resolve(similarity);
      } catch (e) {
        reject(new Error('Failed to parse similarity results'));
      }
    });
  });
}

// Document upload route
// Modify the upload route to include similarity checking
app.post('/upload', isAuthenticated, checkAndDeductCredits, upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Read file content
    const content = await fsPromises.readFile(req.file.path, 'utf8');

    // Get all existing documents from database
    const documents = await dbAll(
      'SELECT id, filename, content FROM documents'
    );

    // Check similarity with existing documents
    const similarDocuments = [];
    for (const doc of documents) {
      const similarity = await checkDocumentSimilarity(content, doc.content);
      if (similarity > 40) {  // Only include documents with >40% similarity
        similarDocuments.push({
          id: doc.id,
          filename: doc.filename,
          similarity: similarity
        });
      }
    }

    // Sort similar documents by similarity (highest first)
    similarDocuments.sort((a, b) => b.similarity - a.similarity);

    // Create user-specific directory
    const userDir = path.join(__dirname, 'documents', req.session.user.id.toString());
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }

    // Generate permanent file path
    const permanentPath = path.join(userDir, `${Date.now()}-${req.file.originalname}`);

    // Move file from uploads to permanent location
    await fsPromises.rename(req.file.path, permanentPath);

    // Store in database
    const docId = await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO documents (user_id, filename, content, file_path) VALUES (?, ?, ?, ?)',
        [req.session.user.id, req.file.originalname, content, permanentPath],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });

    res.json({
      message: 'Document uploaded successfully',
      documentId: docId,
      similarDocuments: similarDocuments
    });

  } catch (error) {
    // If anything fails, try to clean up the uploaded file
    if (req.file && req.file.path) {
      try {
        await fsPromises.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Failed to delete temporary file:', unlinkError);
      }
    }
    res.status(500).json({ error: error.message });
  }
});

// Add a route to download documents
app.get("/documents/:id/download", isAuthenticated, (req, res) => {
  db.get(
    "SELECT * FROM documents WHERE id = ? AND user_id = ?",
    [req.params.id, req.session.user.id],
    (err, document) => {
      if (err || !document) {
        return res.status(404).json({ error: "Document not found" });
      }

      res.download(document.file_path, document.filename, (err) => {
        if (err) {
          res.status(500).json({ error: "Failed to download file" });
        }
      });
    }
  );
});

// Add a route to view documents
app.get("/documents/:id/view", isAuthenticated, (req, res) => {
  db.get(
    "SELECT * FROM documents WHERE id = ? AND (user_id = ? OR ? = 'admin')",
    [req.params.id, req.session.user.id, req.session.user.role],
    (err, document) => {
      if (err || !document) {
        return res.status(404).json({ error: "Document not found" });
      }

      // Send the file content for the frontend to display
      res.json({
        filename: document.filename,
        content: document.content,
        uploadDate: document.upload_date
      });
    }
  );
});

// Get user's documents
app.get("/documents", isAuthenticated, (req, res) => {
  db.all(
    "SELECT id, filename, upload_date FROM documents WHERE user_id = ? ORDER BY upload_date DESC",
    [req.session.user.id],
    (err, documents) => {
      if (err) {
        return res.status(500).json({ error: "Failed to fetch documents" });
      }
      res.json({ documents });
    }
  );
});

// Get user's remaining credits
app.get("/credits", isAuthenticated, (req, res) => {
  db.get(
    "SELECT credits FROM users WHERE id = ?",
    [req.session.user.id],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: "Failed to fetch credits" });
      }
      res.json({ credits: row.credits });
    }
  );
});

// Credit reset at midnight
const resetCreditsAtMidnight = () => {
  const now = new Date();
  const night = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1, // tomorrow
    0, 0, 0 // midnight
  );
  const msToMidnight = night.getTime() - now.getTime();

  setTimeout(() => {
    // Reset credits for all users
    db.run(`UPDATE users SET credits = 20`, [], (err) => {
      if (err) console.error('Failed to reset credits:', err);
      else console.log('Credits reset successfully');
    });
    // Schedule next reset
    resetCreditsAtMidnight();
  }, msToMidnight);
};

// Start the credit reset schedule
resetCreditsAtMidnight();

// Create credit requests table
db.run(`
  CREATE TABLE IF NOT EXISTS credit_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    requested_amount INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    request_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    response_date DATETIME,
    FOREIGN KEY (user_id) REFERENCES users (id)
  )
`);

// Create activity logs table
db.run(`
  CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    action_type TEXT NOT NULL,
    details TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  )
`);

// Activity logging middleware
const logActivity = (userId, actionType, details) => {
  db.run(
    `INSERT INTO activity_logs (user_id, action_type, details) VALUES (?, ?, ?)`,
    [userId, actionType, details],
    (err) => {
      if (err) console.error('Failed to log activity:', err);
    }
  );
};

// Request additional credits
app.post('/credits/request', isAuthenticated, (req, res) => {
  const { amount } = req.body;
  if (!amount || amount < 1) {
    return res.status(400).json({ error: 'Invalid credit amount requested' });
  }

  db.run(
    `INSERT INTO credit_requests (user_id, requested_amount) VALUES (?, ?)`,
    [req.session.user.id, amount],
    function(err) {
      if (err) return res.status(500).json({ error: 'Failed to submit request' });
      
      logActivity(req.session.user.id, 'CREDIT_REQUEST', `Requested ${amount} credits`);
      res.json({ message: 'Credit request submitted successfully', requestId: this.lastID });
    }
  );
});

// Get pending credit requests (admin only)
app.get('/admin/credit-requests', isAuthenticated, isAdmin, (req, res) => {
  db.all(`
    SELECT cr.*, u.username, u.email 
    FROM credit_requests cr 
    JOIN users u ON cr.user_id = u.id 
    WHERE cr.status = 'pending'
    ORDER BY cr.request_date DESC
  `, [], (err, requests) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch requests' });
    res.json({ requests });
  });
});

// Approve/deny credit request (admin only)
app.post('/admin/credit-requests/:id', isAuthenticated, isAdmin, (req, res) => {
  const { status, amount } = req.body;
  const requestId = req.params.id;

  if (status !== 'approved' && status !== 'denied') {
    return res.status(400).json({ error: 'Invalid status' });
  }

  db.run(`
    UPDATE credit_requests 
    SET status = ?, response_date = CURRENT_TIMESTAMP 
    WHERE id = ?
  `, [status, requestId], function(err) {
    if (err) return res.status(500).json({ error: 'Failed to update request' });

    if (status === 'approved') {
      db.run(
        `UPDATE users SET credits = credits + ? WHERE id = (SELECT user_id FROM credit_requests WHERE id = ?)`,
        [amount, requestId],
        (err) => {
          if (err) return res.status(500).json({ error: 'Failed to add credits' });
          
          db.get(
            `SELECT user_id FROM credit_requests WHERE id = ?`,
            [requestId],
            (err, row) => {
              if (!err && row) {
                logActivity(row.user_id, 'CREDITS_ADDED', `${amount} credits approved by admin`);
              }
            }
          );
        }
      );
    }

    res.json({ message: `Credit request ${status}` });
  });
});

// Get user activity logs
app.get('/user/activity', isAuthenticated, (req, res) => {
  db.all(
    `SELECT * FROM activity_logs WHERE user_id = ? ORDER BY timestamp DESC`,
    [req.session.user.id],
    (err, logs) => {
      if (err) return res.status(500).json({ error: 'Failed to fetch activity logs' });
      res.json({ logs });
    }
  );
});

// Export user activity report
app.get('/user/activity/export', isAuthenticated, (req, res) => {
  db.all(
    `SELECT * FROM activity_logs WHERE user_id = ? ORDER BY timestamp DESC`,
    [req.session.user.id],
    (err, logs) => {
      if (err) return res.status(500).json({ error: 'Failed to fetch activity logs' });
      
      const report = logs.map(log => 
        `${new Date(log.timestamp).toISOString()} - ${log.action_type}: ${log.details}`
      ).join('\n');
      
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', 'attachment; filename=activity-report.txt');
      res.send(report);
    }
  );
});

// Get admin analytics
app.get('/admin/analytics', isAuthenticated, isAdmin, (req, res) => {
  const analytics = {};
  
  // Get total users
  db.get('SELECT COUNT(*) as total FROM users', [], (err, row) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch analytics' });
    analytics.totalUsers = row.total;
    
    // Get total documents
    db.get('SELECT COUNT(*) as total FROM documents', [], (err, row) => {
      if (err) return res.status(500).json({ error: 'Failed to fetch analytics' });
      analytics.totalDocuments = row.total;
      
      // Get today's activity
      db.get(
        `SELECT COUNT(*) as total FROM activity_logs 
         WHERE date(timestamp) = date('now')`,
        [],
        (err, row) => {
          if (err) return res.status(500).json({ error: 'Failed to fetch analytics' });
          analytics.todayActivities = row.total;
          
          // Get pending credit requests
          db.get(
            `SELECT COUNT(*) as total FROM credit_requests 
             WHERE status = 'pending'`,
            [],
            (err, row) => {
              if (err) return res.status(500).json({ error: 'Failed to fetch analytics' });
              analytics.pendingRequests = row.total;
              
              res.json({ analytics });
            }
          );
        }
      );
    });
  });
});

// Start Server
app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);
