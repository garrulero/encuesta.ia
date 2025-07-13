import express from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Inicializar base de datos SQLite
const db = new sqlite3.Database(join(__dirname, 'database.sqlite'));

// Crear tablas si no existen
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS surveys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_name TEXT,
      user_role TEXT,
      user_email TEXT,
      user_phone TEXT,
      company_name TEXT,
      sector TEXT,
      conversation_history TEXT,
      report TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

// Simulación de las funciones de IA (reemplazar con llamadas reales a la IA)
const simulateAIQuestion = async (input) => {
  // Aquí deberías integrar con tu servicio de IA real
  // Por ahora, devolvemos respuestas simuladas
  
  const { conversationHistory, currentPhase } = input;
  
  if (currentPhase === 'task_identification') {
    return {
      responses: [{
        question: "¿Qué tareas de tu día a día te parecen más repetitivas, pesadas o que consumen más tiempo del que deberían?",
        phase: "task_identification",
        type: "textarea"
      }]
    };
  }
  
  if (currentPhase === 'task_analysis') {
    const analysisQuestions = [
      {
        question: "¿Con qué frecuencia dirías que haces esta tarea?",
        phase: "task_analysis",
        type: "FREQUENCY_QUESTION"
      },
      {
        question: "¿Y cuánto tiempo te lleva cada vez que la haces? (Ej: '15 minutos', 'media hora'...)",
        phase: "task_analysis",
        type: "text"
      },
      {
        question: "¿Cómo sueles hacerla? (Ej: con papel y boli, un Excel, por WhatsApp...)",
        phase: "task_analysis",
        type: "textarea"
      },
      {
        question: "Para terminar con esta tarea, ¿qué dificultades o problemas te sueles encontrar?",
        phase: "task_analysis",
        type: "textarea"
      }
    ];
    
    // Determinar qué pregunta de análisis corresponde
    const taskAnalysisCount = conversationHistory.filter(entry => 
      entry.question.includes('frecuencia') || 
      entry.question.includes('tiempo te lleva') ||
      entry.question.includes('Cómo sueles') ||
      entry.question.includes('dificultades')
    ).length;
    
    if (taskAnalysisCount < analysisQuestions.length) {
      return {
        responses: [analysisQuestions[taskAnalysisCount]]
      };
    } else {
      // Pasar a reflexión
      return {
        responses: [
          {
            question: "Gracias. He calculado que solo esa tarea te está llevando unas 8 horas al mes (aproximadamente 200€). Para que te hagas una idea, es casi una semana de trabajo completa que podrías dedicar a hacer crecer tu negocio. ¿Te habías parado a pensarlo?",
            phase: "reflection"
          },
          {
            question: "¿Quieres que analicemos otra tarea que también te esté quitando tiempo, o prefieres que paremos aquí y te prepare un pequeño informe con lo que hemos visto?",
            phase: "next_action",
            type: "multiple-choice",
            options: ["Analizar otra tarea", "Preparar el informe"]
          }
        ]
      };
    }
  }
  
  // Respuesta por defecto para finalizar
  return {
    responses: [{
      question: "",
      phase: "result"
    }]
  };
};

const simulateAIReport = async (input) => {
  const { userName, companyName, conversationHistory } = input;
  
  // Simulación de un reporte generado por IA
  const report = `Hola ${userName},

Aquí tienes el resumen de nuestro diagnóstico. El objetivo no es juzgar, sino iluminar una oportunidad de mejora que el día a día a menudo nos oculta.

**1. El Diagnóstico:**
- **Tarea Identificada:** Gestión manual de contactos de clientes
- **Impacto Mensual:** Aproximadamente 8 horas, que suponen un coste oculto estimado de 200€.

**2. La Causa Raíz:**
Nos comentabas que la principal dificultad es la gestión manual con un Excel y la pérdida de tiempo en buscar datos. Esto provoca pérdida de tiempo, posibles errores y una alta carga manual.

**3. La Oportunidad (Reflexión Final):**
Esas 8 horas al mes son un activo muy valioso. Recuperarlas significaría más tiempo para la estrategia de tu negocio.

**4. Nuestro Siguiente Paso (La Invitación):**
Para solucionar precisamente esto, en GoiLab no nos limitamos a vender un software, sino que diseñamos soluciones a medida con un acompañamiento continuo.

Me encantaría tener una charla de 15 minutos contigo, no para venderte nada, sino para mostrarte un boceto visual de cómo podría ser una herramienta sencilla para tu caso y cómo trabajaríamos juntos para implementarla. Sin ningún compromiso.

¿Hablamos?`;

  return { report };
};

// Rutas de la API
app.post('/api/ai/question', async (req, res) => {
  try {
    const result = await simulateAIQuestion(req.body);
    res.json(result);
  } catch (error) {
    console.error('Error generating AI question:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.post('/api/ai/report', async (req, res) => {
  try {
    const result = await simulateAIReport(req.body);
    
    // Guardar en base de datos
    const { userName, userRole, userEmail, userPhone, companyName, conversationHistory } = req.body;
    
    db.run(
      `INSERT INTO surveys (user_name, user_role, user_email, user_phone, company_name, conversation_history, report) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userName, userRole, userEmail, userPhone || '', companyName, JSON.stringify(conversationHistory), result.report],
      function(err) {
        if (err) {
          console.error('Error saving to database:', err);
        }
      }
    );
    
    res.json(result);
  } catch (error) {
    console.error('Error generating AI report:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Ruta para obtener todas las encuestas (para administración)
app.get('/api/surveys', (req, res) => {
  db.all('SELECT * FROM surveys ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      console.error('Error fetching surveys:', err);
      res.status(500).json({ error: 'Error interno del servidor' });
    } else {
      res.json(rows);
    }
  });
});

// Ruta de salud del servidor
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});