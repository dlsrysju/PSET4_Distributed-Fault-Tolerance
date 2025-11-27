const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`VIEW node listening on port ${PORT}`);
});

app.listen(PORT, () => {
  console.log('========================================');
  console.log('VIEW Node (MVC Architecture)');
  console.log('========================================');
  console.log(`Server running on port ${PORT}`);
  console.log(`Access: http://localhost:${PORT}`);
  console.log('========================================');
});
