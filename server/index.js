import express from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Inicializar Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

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

// Función para generar preguntas con Gemini AI
const generateAIQuestion = async (input) => {
  const { conversationHistory, currentPhase, sector } = input;
  
  let systemPrompt = "";
  
  if (currentPhase === 'task_identification') {
    systemPrompt = `Eres un consultor experto en eficiencia empresarial. Tu objetivo es identificar tareas ineficientes en empresas del sector ${sector}.

CONTEXTO: Estás realizando un diagnóstico de eficiencia. Ya tienes información básica del usuario.

OBJETIVO: Generar UNA pregunta para identificar tareas repetitivas o ineficientes.

INSTRUCCIONES:
- Haz UNA pregunta específica sobre tareas que consumen tiempo innecesario
- Usa un tono conversacional y cercano
- Enfócate en tareas del día a día del sector ${sector}
- La pregunta debe ser abierta para que describan sus problemas

FORMATO DE RESPUESTA (JSON):
{
  "responses": [{
    "question": "tu pregunta aquí",
    "phase": "task_identification",
    "type": "textarea"
  }]
}

Responde SOLO con el JSON, sin explicaciones adicionales.`;
  }
  
  else if (currentPhase === 'task_analysis') {
    const lastAnswer = conversationHistory[conversationHistory.length - 1]?.answer || '';
    
    systemPrompt = `Eres un consultor experto en eficiencia empresarial. Estás analizando una tarea específica que el usuario identificó como problemática.

TAREA IDENTIFICADA: "${lastAnswer}"

OBJETIVO: Generar UNA pregunta para profundizar en el análisis de esta tarea específica.

PREGUNTAS YA HECHAS: ${conversationHistory.map(h => h.question).join(', ')}

INSTRUCCIONES:
- Haz UNA pregunta específica sobre: frecuencia, tiempo que toma, método actual, o dificultades
- NO repitas preguntas ya hechas
- Usa un tono conversacional
- La pregunta debe ayudar a cuantificar el impacto de la tarea

TIPOS DE PREGUNTA DISPONIBLES:
- "FREQUENCY_QUESTION": para preguntar frecuencia (opciones: "Varias veces al día", "Diariamente", "Semanalmente", "Mensualmente")
- "text": para respuestas cortas
- "textarea": para respuestas largas

FORMATO DE RESPUESTA (JSON):
{
  "responses": [{
    "question": "tu pregunta aquí",
    "phase": "task_analysis", 
    "type": "text|textarea|FREQUENCY_QUESTION"
  }]
}

Responde SOLO con el JSON, sin explicaciones adicionales.`;
  }
  
  else if (currentPhase === 'next_action') {
    systemPrompt = `Eres un consultor experto. Has analizado una tarea ineficiente y ahora debes ofrecer opciones al usuario.

INSTRUCCIONES:
- Genera una reflexión breve sobre el tiempo/dinero perdido
- Ofrece dos opciones: analizar otra tarea o generar el informe

FORMATO DE RESPUESTA (JSON):
{
  "responses": [
    {
      "question": "Reflexión sobre el impacto calculado de la tarea analizada",
      "phase": "reflection"
    },
    {
      "question": "¿Quieres que analicemos otra tarea que también te esté quitando tiempo, o prefieres que paremos aquí y te prepare un pequeño informe con lo que hemos visto?",
      "phase": "next_action",
      "type": "multiple-choice",
      "options": ["Analizar otra tarea", "Preparar el informe"]
    }
  ]
}

Responde SOLO con el JSON, sin explicaciones adicionales.`;
  }
  
  else {
    // Finalizar si no hay más fases
    return {
      responses: [{
        question: "",
        phase: "result"
      }]
    };
  }

  try {
    const result = await model.generateContent(systemPrompt);
    const response = await result.response;
    const text = response.text();
    
    // Limpiar la respuesta y parsear JSON
    const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
    const parsedResponse = JSON.parse(cleanText);
    
    return parsedResponse;
  } catch (error) {
    console.error('Error with Gemini AI:', error);
    
    // Fallback en caso de error
    if (currentPhase === 'task_identification') {
      return {
        responses: [{
          question: "¿Qué tareas de tu día a día te parecen más repetitivas, pesadas o que consumen más tiempo del que deberían?",
          phase: "task_identification",
          type: "textarea"
        }]
      };
    }
    
    throw error;
  }
};

// Función para generar reportes con Gemini AI
const generateAIReport = async (input) => {
  const { userName, userRole, companyName, conversationHistory } = input;
  
  const systemPrompt = `Eres un consultor experto en eficiencia empresarial de GoiLab. Debes generar un informe personalizado basado en la conversación.

INFORMACIÓN DEL CLIENTE:
- Nombre: ${userName}
- Cargo: ${userRole}
- Empresa: ${companyName}

CONVERSACIÓN COMPLETA:
${conversationHistory.map(h => `P: ${h.question}\nR: ${h.answer}`).join('\n\n')}

INSTRUCCIONES PARA EL INFORME:
1. **Tono profesional pero cercano**
2. **Estructura clara con secciones numeradas**
3. **Cálculos específicos de tiempo y dinero perdido**
4. **Identificar la causa raíz del problema**
5. **Terminar con una invitación a una charla de 15 minutos**

ESTRUCTURA REQUERIDA:
**1. El Diagnóstico:**
- Tarea identificada
- Impacto mensual en horas y euros

**2. La Causa Raíz:**
- Análisis del problema principal

**3. La Oportunidad:**
- Reflexión sobre el valor del tiempo recuperado

**4. Nuestro Siguiente Paso:**
- Invitación a charla de 15 minutos sin compromiso

IMPORTANTE:
- Usa datos específicos de la conversación
- Calcula impacto realista basado en las respuestas
- Mantén el enfoque en GoiLab como solución
- NO uses markdown, solo texto plano con formato simple

Genera el informe completo:`;

  try {
    const result = await model.generateContent(systemPrompt);
    const response = await result.response;
    const report = response.text();
    
    return { report };
  } catch (error) {
    console.error('Error generating AI report:', error);
    
    // Fallback en caso de error
    const fallbackReport = `Hola ${userName},

Aquí tienes el resumen de nuestro diagnóstico. El objetivo no es juzgar, sino iluminar una oportunidad de mejora que el día a día a menudo nos oculta.

**1. El Diagnóstico:**
Hemos identificado tareas que están consumiendo tiempo valioso en ${companyName}.

**2. La Causa Raíz:**
Los procesos manuales y la falta de automatización están generando ineficiencias.

**3. La Oportunidad:**
Recuperar ese tiempo significaría más capacidad para hacer crecer tu negocio.

**4. Nuestro Siguiente Paso:**
En GoiLab diseñamos soluciones a medida con acompañamiento continuo. Me encantaría tener una charla de 15 minutos contigo para mostrarte cómo podríamos ayudarte.

¿Hablamos?`;

    return { report: fallbackReport };
  }
};

// Rutas de la API
app.post('/api/ai/question', async (req, res) => {
  try {
    const result = await generateAIQuestion(req.body);
    res.json(result);
  } catch (error) {
    console.error('Error generating AI question:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.post('/api/ai/report', async (req, res) => {
  try {
    const result = await generateAIReport(req.body);
    
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