const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Allow CORS (so the view can call controllers on 4001/4002/4003)
app.use(cors());

// Serve static files from ./public
app.use(express.static(path.join(__dirname, 'public')));

// Catch-all route: ALWAYS use '*' (not '/*')
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log('========================================');
  console.log('VIEW Node (MVC Architecture)');
  console.log('========================================');
  console.log(`Server running on port ${PORT}`);
  console.log(`Access: http://localhost:${PORT}`);
  console.log('========================================');
});
