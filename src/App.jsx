import { useState, useEffect, useCallback, useRef } from "react";
import { SERVER_CONFIG } from './config.js';
import './App.css';

const initialQuestions = [
  {
    id: "q1",
    phase: "basic_info",
    text: "¿Para empezar, cuál es tu nombre?",
    type: "text",
    key: "userName",
  },
  {
    id: "q2",
    phase: "basic_info",
    text: "¿Y tu cargo en la empresa?",
    type: "text",
    key: "userRole",
  },
  {
    id: "q3",
    phase: "basic_info",
    text: "¿Cómo se llama tu empresa?",
    type: "text",
    key: "companyName",
  },
  {
    id: "q4",
    phase: "basic_info",
    text: "¿Y el sector de tu empresa? (Ej: hostelería, software, consultoría...)",
    type: "text",
    key: "sector",
  },
];

function App() {
  const [currentAppPhase, setCurrentAppPhase] = useState("welcome");
  const [questions, setQuestions] = useState(initialQuestions);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [formData, setFormData] = useState({});
  const [conversationHistory, setConversationHistory] = useState([]);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Un momento, por favor...");
  const [report, setReport] = useState("");
  const [consent, setConsent] = useState(false);
  const [phoneConsent, setPhoneConsent] = useState(false);
  const [progress, setProgress] = useState(0);

  const inputRef = useRef(null);

  // API calls
  const getAIQuestion = async (input) => {
    try {
      const response = await fetch(`${SERVER_CONFIG.BASE_URL}/api/ai/question`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching AI question:', error);
      throw error;
    }
  };

  const getAIReport = async (input) => {
    try {
      const response = await fetch(`${SERVER_CONFIG.BASE_URL}/api/ai/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error generating AI report:', error);
      throw error;
    }
  };

  const showToast = (message, type = 'info') => {
    // Simple toast implementation
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 3000);
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedState = localStorage.getItem("encuesta-ia-state");
        if (savedState) {
          const {
            currentAppPhase: savedPhase,
            questions,
            currentQuestionIndex,
            formData,
            conversationHistory,
            report,
            consent,
            phoneConsent,
          } = JSON.parse(savedState);
          
          setCurrentAppPhase(savedPhase || "welcome");
          if (questions && questions.length > 0) setQuestions(questions);
          setCurrentQuestionIndex(currentQuestionIndex || 0);
          setFormData(formData || {});
          setConversationHistory(conversationHistory || []);
          if (report) setReport(report);
          if (consent) setConsent(consent);
          if (phoneConsent) setPhoneConsent(phoneConsent);
        }
      } catch (error) {
        console.error("Failed to load state from localStorage", error);
        handleReset();
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stateToSave = JSON.stringify({
          currentAppPhase,
          questions,
          currentQuestionIndex,
          formData,
          conversationHistory,
          report,
          consent,
          phoneConsent
        });
        localStorage.setItem("encuesta-ia-state", stateToSave);
      } catch (error) {
        console.error("Failed to save state to localStorage", error);
      }
    }
  }, [currentAppPhase, questions, currentQuestionIndex, formData, conversationHistory, report, consent, phoneConsent]);

  useEffect(() => {
    if (currentAppPhase === 'survey' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [currentQuestionIndex, currentAppPhase]);

  useEffect(() => {
    if (currentAppPhase !== "survey") {
      setProgress(0);
      return;
    }
    const totalQuestions = questions.length;
    const answeredQuestions = currentQuestionIndex;
    const newProgress = totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0;
    setProgress(newProgress);
  }, [currentQuestionIndex, questions, currentAppPhase]);

  const handleReset = useCallback(() => {
    setCurrentAppPhase("welcome");
    setQuestions(initialQuestions);
    setCurrentQuestionIndex(0);
    setFormData({});
    setConversationHistory([]);
    setCurrentAnswer("");
    setSelectedOptions([]);
    setIsLoading(false);
    setReport("");
    setConsent(false);
    setPhoneConsent(false);

    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem("encuesta-ia-state");
      } catch (error) {
        console.error("Failed to clear state from localStorage", error);
      }
    }
    
    showToast("Diagnóstico reiniciado");
  }, []);

  const handleNext = async () => {
    const currentQuestion = questions[currentQuestionIndex];
    let finalAnswer = "";

    if (currentQuestion.type === 'checkbox-suggestions') {
      const customTasks = currentAnswer.trim().split('\n').filter(task => task.trim() !== '');
      const allTasks = [...new Set([...selectedOptions, ...customTasks])];
      finalAnswer = allTasks.join(', ');
    } else if (currentQuestion.type === 'multiple-choice' || currentQuestion.type === 'FREQUENCY_QUESTION') {
      finalAnswer = currentAnswer;
    } else {
      finalAnswer = currentAnswer.trim();
    }
    
    if (!finalAnswer && !currentQuestion.optional) {
      showToast("Por favor, selecciona una opción o escribe una respuesta.", 'error');
      return;
    }

    const newFormData = { ...formData, [currentQuestion.key]: finalAnswer };
    setFormData(newFormData);

    const newHistoryEntry = { question: currentQuestion.text, answer: finalAnswer };
    const updatedHistory = [...conversationHistory, newHistoryEntry];
    setConversationHistory(updatedHistory);
    
    setCurrentAnswer("");
    setSelectedOptions([]);
    
    const isEndOfInitialQuestions = currentQuestion.phase === 'basic_info' && currentQuestionIndex === initialQuestions.length - 1;

    if (isEndOfInitialQuestions) {
      let nextPhase = 'task_identification';
      fetchNextQuestion(updatedHistory, newFormData, nextPhase);
    } else if (currentQuestionIndex >= questions.length - 1) {
      if (finalAnswer === 'Analizar otra tarea') {
        fetchNextQuestion(updatedHistory, newFormData, 'task_identification');
      } else if (finalAnswer === 'Preparar el informe') {
        setCurrentAppPhase('report');
      } else {
        fetchNextQuestion(updatedHistory, newFormData, currentQuestion.phase);
      }
    } else {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const fetchNextQuestion = async (history, currentData, phase) => {
    setIsLoading(true);
    setLoadingMessage("La IA está pensando la siguiente pregunta...");
    try {
      const result = await getAIQuestion({
        conversationHistory: history,
        currentPhase: phase,
        sector: currentData.sector,
      });

      if (!result || !result.responses || result.responses.length === 0) {
        throw new Error("Invalid AI response");
      }
      
      const newQuestionsFromAI = result.responses.map((response, index) => ({
        id: `q-ai-${history.length + 1 + index}`,
        text: response.question,
        phase: response.phase,
        type: response.type || 'text',
        options: response.options,
        optional: response.optional,
        hint: response.hint,
        key: `custom-${response.phase}-${history.length + 1 + index}`
      }));

      const firstNewQuestion = newQuestionsFromAI[0];
      
      if ((firstNewQuestion.phase === 'result' || !firstNewQuestion.question) && history.length < 20) {
        showToast("La IA ha intentado terminar la conversación antes de tiempo. Por favor, inténtalo de nuevo.", 'error');
        setIsLoading(false);
        return;
      }
      
      if (firstNewQuestion.phase === 'reflection') {
        setLoadingMessage(firstNewQuestion.text);
        
        const actionableQuestion = newQuestionsFromAI[1];
        
        setTimeout(() => {
          setQuestions(prevQuestions => [...prevQuestions, actionableQuestion]);
          setIsLoading(false);
          setCurrentQuestionIndex(questions.length);
        }, 5000); 

      } else if (firstNewQuestion.phase === 'result') {
        setCurrentAppPhase('report');
        setIsLoading(false);
      } else {
        setQuestions(prevQuestions => {
          const allNewQuestions = [...prevQuestions, ...newQuestionsFromAI];
          setCurrentQuestionIndex(allNewQuestions.length - newQuestionsFromAI.length);
          return allNewQuestions;
        });
        setIsLoading(false);
      }

    } catch (error) {
      console.error("Error fetching next question:", error);
      showToast("No se pudo obtener la siguiente pregunta. Inténtalo de nuevo.", 'error');
      setIsLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    if (conversationHistory.length < 5) {
      showToast("Es necesario responder a más preguntas para poder generar un informe.", 'error');
      return;
    }
    if (!formData.userEmail) {
      showToast("Por favor, introduce tu email para recibir el informe.", 'error');
      return;
    }
    if (!consent) {
      showToast("Debes aceptar los términos para poder generar el informe.", 'error');
      return;
    }

    setLoadingMessage("Estamos generando tu informe personalizado. Esto puede tardar unos segundos...");
    setIsLoading(true);
    try {
      const reportInput = {
        companyName: formData.companyName || 'N/A',
        userName: formData.userName || 'N/A',
        userRole: formData.userRole || 'N/A',
        conversationHistory: conversationHistory,
      };
      const result = await getAIReport(reportInput);
      
      if (!result || !result.report) {
        throw new Error("AI failed to generate a report.");
      }

      setReport(result.report);
      showToast("Informe generado correctamente");

    } catch (error) {
      console.error("Error generating report:", error);
      showToast("No se pudo generar el informe. Inténtalo más tarde.", 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const renderContent = () => {
    if (currentAppPhase === "welcome") {
      return (
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4 text-primary">GoiLab</h1>
          <h2 className="text-2xl font-bold mb-4">Diagnóstico de Eficiencia v2.0</h2>
          <p className="mb-6 max-w-md mx-auto">
            Hola, soy una IA desarrollada por GoiLab. Mi objetivo es ayudarte a realizar un diagnóstico rápido de eficiencia en tu empresa.
            <br/><br/>
            En 5 minutos, identificaremos juntos una tarea que te roba tiempo y calcularemos las horas y euros que podrías recuperar al mes. No busco venderte nada, solo ofrecerte claridad.
          </p>
          <button onClick={() => setCurrentAppPhase("survey")} className="btn btn-primary">
            ¿Empezamos? →
          </button>
        </div>
      );
    }

    if (currentAppPhase === "survey" && currentQuestionIndex < questions.length) {
      const q = questions[currentQuestionIndex];
      const isNextDisabled = isLoading || (
        !q.optional && (
          (q.type === 'multiple-choice' || q.type === 'FREQUENCY_QUESTION')
            ? !currentAnswer
            : !currentAnswer.trim() && selectedOptions.length === 0
        )
      );

      return (
        <div className="w-full">
          <div className="progress-bar">
            <div className="progress-fill" style={{width: `${progress}%`}}></div>
          </div>
          
          <label className="block text-xl mb-6 text-left font-bold">
            {q.text} {q.optional && <span className="text-sm text-gray-500">(opcional)</span>}
          </label>
          {q.hint && <p className="text-sm text-gray-500 mb-4">{q.hint}</p>}
          
          {q.type === 'textarea' ? (
            <textarea
              ref={inputRef}
              value={currentAnswer}
              onChange={(e) => setCurrentAnswer(e.target.value)}
              placeholder="Escribe tu respuesta aquí..."
              className="input textarea"
              disabled={isLoading}
            />
          ) : q.type === 'multiple-choice' ? (
            <div className="radio-group">
              {q.options?.map((option) => (
                <label key={option} className="radio-option">
                  <input
                    type="radio"
                    name={q.id}
                    value={option}
                    checked={currentAnswer === option}
                    onChange={(e) => setCurrentAnswer(e.target.value)}
                    disabled={isLoading}
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
          ) : q.type === 'checkbox-suggestions' ? (
            <div className="space-y-4">
              <div className="checkbox-group">
                {q.options?.map((option) => (
                  <label key={option} className="checkbox-option">
                    <input
                      type="checkbox"
                      checked={selectedOptions.includes(option)}
                      onChange={(e) => {
                        setSelectedOptions((prev) =>
                          e.target.checked
                            ? [...prev, option]
                            : prev.filter((item) => item !== option)
                        );
                      }}
                      disabled={isLoading}
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
              <textarea
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                placeholder="Añade aquí otras tareas (una por línea)..."
                className="input textarea"
                disabled={isLoading}
              />
            </div>
          ) : q.type === 'FREQUENCY_QUESTION' ? (
            <div className="radio-group">
              {["Varias veces al día", "Diariamente", "Semanalmente", "Mensualmente"].map((option) => (
                <label key={option} className="radio-option">
                  <input
                    type="radio"
                    name={q.id}
                    value={option}
                    checked={currentAnswer === option}
                    onChange={(e) => setCurrentAnswer(e.target.value)}
                    disabled={isLoading}
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
          ) : (
            <input
              ref={inputRef}
              type={q.type}
              value={currentAnswer}
              onChange={(e) => setCurrentAnswer(e.target.value)}
              placeholder="Tu respuesta..."
              disabled={isLoading}
              onKeyDown={(e) => e.key === 'Enter' && !isNextDisabled && handleNext()}
              className="input"
            />
          )}

          <div className="mt-8 flex justify-end">
            <button onClick={handleNext} disabled={isNextDisabled} className="btn btn-primary">
              Siguiente →
            </button>
          </div>
        </div>
      );
    }
    
    if (currentAppPhase === "report") {
      return (
        <div className="w-full">
          {report ? (
            <div>
              <h2 className="text-2xl font-bold mb-4">Tu informe está listo</h2>
              <div className="report-content">
                {report}
              </div>
              <div className="mt-8 flex flex-wrap justify-center gap-4">
                <button onClick={() => window.print()} className="btn btn-primary">
                  🖨️ Imprimir informe
                </button>
              </div>
            </div>
          ) : (
            <div>
              <h2 className="text-2xl font-bold mb-4">Casi hemos terminado...</h2>
              <p className="mb-6">Para generar tu informe personalizado, necesitamos tu consentimiento.</p>
              <div className="form-group">
                <label htmlFor="userEmail">Tu dirección de email</label>
                <input
                  id="userEmail"
                  type="email"
                  placeholder="tu@email.com"
                  value={formData.userEmail || ''}
                  onChange={(e) => setFormData({...formData, userEmail: e.target.value})}
                  disabled={isLoading}
                  className="input"
                />
              </div>
              <div className="checkbox-group">
                <label className="checkbox-option">
                  <input 
                    type="checkbox" 
                    checked={consent} 
                    onChange={(e) => setConsent(e.target.checked)} 
                    disabled={isLoading} 
                  />
                  <span>Acepto los términos de uso y la política de privacidad para recibir el informe.</span>
                </label>

                <label className="checkbox-option">
                  <input 
                    type="checkbox" 
                    checked={phoneConsent} 
                    onChange={(e) => setPhoneConsent(e.target.checked)} 
                    disabled={isLoading} 
                  />
                  <span>(Opcional) Acepto que me contactéis por teléfono.</span>
                </label>
                
                {phoneConsent && (
                  <div className="form-group">
                    <input
                      type="tel"
                      placeholder="Escribe aquí tu número de teléfono"
                      value={formData.userPhone || ''}
                      onChange={(e) => setFormData({...formData, userPhone: e.target.value})}
                      disabled={isLoading}
                      className="input"
                    />
                  </div>
                )}
              </div>
              <div className="mt-8 flex justify-end">
                <button 
                  onClick={handleGenerateReport} 
                  disabled={isLoading || !consent || !formData.userEmail} 
                  className="btn btn-primary"
                >
                  Generar mi informe 📧
                </button>
              </div>
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <main className="app">
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-content">
            <div className="spinner"></div>
            <h3>Procesando...</h3>
            <p>{loadingMessage}</p>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-content">
          {renderContent()}
        </div>
        {currentAppPhase !== 'welcome' && (
          <div className="card-footer">
            <button onClick={handleReset} className="btn btn-link">
              🔄 Reiniciar diagnóstico
            </button>
          </div>
        )}
      </div>
      
      <footer className="footer">
        Una herramienta de <a href="https://goilab.com" target="_blank" rel="noopener noreferrer">GoiLab</a> para detectar ineficiencias.
      </footer>
    </main>
  );
}

export default App;