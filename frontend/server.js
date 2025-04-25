import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5173;

// Serve static files
app.use(express.static('dist'));

// Always return the main index.html, so react-router can handle routing
app.get('*', (req, res) => {
  const indexPath = resolve(__dirname, 'dist', 'index.html');
  const indexContent = fs.readFileSync(indexPath, 'utf8');
  res.send(indexContent);
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
}); 