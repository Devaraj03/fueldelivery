const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// ✅ SQLite DB setup
const db = new sqlite3.Database('./fuel.db');

// ✅ Create table if not exists
db.run(`CREATE TABLE IF NOT EXISTS requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId TEXT,
  name TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  phone TEXT
)`);

// ✅ Handle customer form submission
app.post('/submit', (req, res) => {
  const { name, address, city, state, zip, phone } = req.body;

  if (!name || !address || !city || !state || !phone) {
    return res.send("❌ Missing required fields.");
  }

  const userId = uuidv4().slice(0, 8);

  db.run(
    `INSERT INTO requests (userId, name, address, city, state, zip, phone) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [userId, name, address, city, state, zip, phone],
    (err) => {
      if (err) {
        console.error("❌ DB Insert Error:", err.message);
        return res.send("Error saving to database.");
      }
      console.log("✅ New user created with UID:", userId);
      res.redirect(`/success.html?uid=${userId}`);
    }
  );
});

// ✅ API: Get all customer requests (for delivery agent)
app.get('/api/requests', (req, res) => {
  db.all('SELECT * FROM requests ORDER BY id DESC', [], (err, rows) => {
    if (err) {
      console.error("❌ DB Fetch Error:", err.message);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// ✅ Live agent location (simulate or real)
let agentLocation = { lat: 13.0827, lng: 80.2707 }; // Default: Chennai
app.get('/api/agent-location', (req, res) => {
  res.json(agentLocation);
});

app.post('/api/agent-location', (req, res) => {
  const { lat, lng } = req.body;
  if (lat && lng) {
    agentLocation = { lat, lng };
    console.log("✅ Agent location updated:", agentLocation);
    res.json({ status: "updated", agentLocation });
  } else {
    res.status(400).json({ error: "Invalid location data" });
  }
});

// ✅ Get customer info by UID (used in tracking page)
app.get('/api/customer/:uid', (req, res) => {
  const uid = req.params.uid;
  db.get('SELECT * FROM requests WHERE userId = ?', [uid], (err, row) => {
    if (err || !row) {
      console.warn("⚠️ Customer not found for UID:", uid);
      return res.status(404).json({ error: '❌ Unable to locate customer address.' });
    }
    console.log("✅ Found customer for UID:", uid);
    res.json(row);
  });
});

// ✅ Start the server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
