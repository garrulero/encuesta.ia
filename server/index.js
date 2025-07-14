import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config({ path: './server/.env' });

const app = express();
const PORT = process.env.PORT || 3001;

// Configurar DeepSeek client
const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY || 'sk-d2d63a5b51df4f8c80caeffd2c79c733',
  baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1'
});

// Middleware
app.use(cors());
app.use(express.json());

// Función helper para llamar a DeepSeek
async function callDeepSeek(messages, maxTokens = 1000) {
  try {
    const response = await deepseek.chat.completions.create({
      model: 'deepseek-chat',
      messages: messages,
      max_tokens: maxTokens,
      temperature: 0.7,
      stream: false
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error calling DeepSeek:', error);
    throw new Error('Failed to get response from DeepSeek');
  }
}

// Endpoint para generar preguntas dinámicas
app.post('/api/ai/question', async (req, res) => {
  try {
    const { conversationHistory, currentPhase, sector } = req.body;

    // Construir el contexto de la conversación
    let conversationContext = '';
    if (conversationHistory && conversationHistory.length > 0) {
      conversationContext = conversationHistory
        .map(entry => `P: ${entry.question}\nR: ${entry.answer}`)
        .join('\n\n');
    }

    const systemPrompt = `Eres un consultor experto en eficiencia empresarial. Tu objetivo es ayudar a identificar tareas ineficientes en empresas del sector ${sector || 'general'}.

FASE ACTUAL: ${currentPhase}

INSTRUCCIONES POR FASE:
- basic_info: Recopilar información básica (nombre, cargo, empresa, sector)
- task_identification: Identificar tareas específicas que consumen tiempo
- task_analysis: Analizar en detalle la tarea seleccionada
- frequency_analysis: Determinar frecuencia y tiempo invertido
- impact_analysis: Calcular impacto económico y temporal
- reflection: Momento de reflexión antes de continuar
- result: Preparar para generar el informe final

CONTEXTO DE LA CONVERSACIÓN:
${conversationContext}

Genera la siguiente pregunta apropiada para la fase ${currentPhase}. 

FORMATO DE RESPUESTA (JSON):
{
  "responses": [
    {
      "question": "Tu pregunta aquí",
      "type": "text|textarea|multiple-choice|checkbox-suggestions|FREQUENCY_QUESTION",
      "phase": "${currentPhase}",
      "options": ["opción1", "opción2"] // solo si es multiple-choice o checkbox-suggestions
      "optional": false,
      "hint": "Pista opcional para ayudar al usuario"
    }
  ]
}

TIPOS DE PREGUNTA:
- text: Respuesta corta
- textarea: Respuesta larga
- multiple-choice: Selección única
- checkbox-suggestions: Múltiple selección con opción de añadir texto
- FREQUENCY_QUESTION: Frecuencia específica (Varias veces al día, Diariamente, Semanalmente, Mensualmente)

Responde SOLO con el JSON, sin texto adicional.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Genera la siguiente pregunta para la fase: ${currentPhase}` }
    ];

    const response = await callDeepSeek(messages, 800);
    
    // Intentar parsear la respuesta JSON
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(response);
    } catch (parseError) {
      console.error('Error parsing DeepSeek response:', parseError);
      // Fallback response
      parsedResponse = {
        responses: [{
          question: "¿Podrías contarme más detalles sobre esta situación?",
          type: "textarea",
          phase: currentPhase,
          optional: false
        }]
      };
    }

    res.json(parsedResponse);

  } catch (error) {
    console.error('Error in /api/ai/question:', error);
    res.status(500).json({ 
      error: 'Error generating question',
      message: error.message 
    });
  }
});

// Endpoint para generar el informe final
app.post('/api/ai/report', async (req, res) => {
  try {
    const { companyName, userName, userRole, conversationHistory } = req.body;

    // Construir el contexto completo de la conversación
    const conversationContext = conversationHistory
      .map(entry => `P: ${entry.question}\nR: ${entry.answer}`)
      .join('\n\n');

    const systemPrompt = `Eres un consultor experto en eficiencia empresarial. Vas a generar un informe detallado basado en la conversación mantenida con ${userName} (${userRole}) de la empresa ${companyName}.

CONVERSACIÓN COMPLETA:
${conversationContext}

INSTRUCCIONES PARA EL INFORME:
1. Analiza toda la conversación para identificar las tareas ineficientes mencionadas
2. Calcula el impacto económico y temporal de estas ineficiencias
3. Proporciona recomendaciones específicas y accionables
4. Usa un tono profesional pero cercano
5. Estructura el informe de manera clara y fácil de leer

ESTRUCTURA DEL INFORME:
- Resumen ejecutivo
- Análisis de la situación actual
- Identificación de ineficiencias clave
- Cálculo de impacto (tiempo y coste)
- Recomendaciones específicas
- Próximos pasos sugeridos

El informe debe ser práctico, específico para su sector y empresa, y enfocado en resultados medibles.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: 'Genera el informe completo basado en la conversación proporcionada.' }
    ];

    const report = await callDeepSeek(messages, 2000);

    res.json({ report });

  } catch (error) {
    console.error('Error in /api/ai/report:', error);
    res.status(500).json({ 
      error: 'Error generating report',
      message: error.message 
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'DeepSeek AI Survey Backend',
    timestamp: new Date().toISOString()
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🤖 Using DeepSeek AI for intelligent responses`);
  
  // Verificar configuración
  if (!process.env.DEEPSEEK_API_KEY) {
    console.warn('⚠️  WARNING: DEEPSEEK_API_KEY not found in environment variables');
    console.log('📝 Please create a .env file with your DeepSeek API key');
  }
});