import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { feedbackRouter } from './routes/feedback';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve feedback files statically (for dev access)
app.use('/feedback-files', express.static(path.join(__dirname, '../../public/feedback')));

// Routes
app.use('/api/feedback', feedbackRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`[Server] Running on http://localhost:${PORT}`);
  console.log(`[Server] Storage mode: ${process.env.STORAGE_TYPE || 'local'}`);
});

export default app;
