import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Encuesta IA Server is running!' });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Next question endpoint
app.post('/api/next-question', async (req, res) => {
  try {
    const { responses } = req.body;
    
    // Simulate AI response for now
    const nextQuestion = {
      id: Date.now(),
      text: "¿Cuál es tu experiencia con la tecnología?",
      type: "multiple_choice",
      options: [
        "Principiante",
        "Intermedio", 
        "Avanzado",
        "Experto"
      ]
    };
    
    res.json({ question: nextQuestion });
  } catch (error) {
    console.error('Error generating next question:', error);
    res.status(500).json({ error: 'Error generating next question' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});