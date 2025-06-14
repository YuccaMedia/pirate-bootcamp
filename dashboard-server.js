const express = require('express');
const path = require('path');

const app = express();
// Use port 3001 for the dashboard to avoid conflict with the main app
const PORT = process.env.DASHBOARD_PORT || 3001;

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'src/public')));

// Redirect root to dashboard
app.get('/', (req, res) => {
  res.redirect('/dashboard/index.html');
});

// Start the server
app.listen(PORT, () => {
  console.log(`Dashboard server is running on port ${PORT}`);
  console.log(`Access the dashboard at http://localhost:${PORT}/dashboard/index.html`);
}); 