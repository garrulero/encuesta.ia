"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getAIQuestion, getAIReport } from "./actions";
import type {
  Conversation,
  FormData,
  Question,
} from "@/types";
import { Loader2, ArrowRight, Printer, Send, RefreshCcw, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const initialQuestions: Question[] = [
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

export default function EncuestaIaPage() {
  const { toast } = useToast();
  const [phase, setPhase] = useState<"welcome" | "survey" | "report">("welcome");
  const [questions, setQuestions] = useState<Question[]>(initialQuestions);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [formData, setFormData] = useState<Partial<FormData>>({});
  const [conversationHistory, setConversationHistory] = useState<Conversation>([]);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Un momento, por favor...");
  const [report, setReport] = useState("");
  const [consent, setConsent] = useState(false);
  const [phoneConsent, setPhoneConsent] = useState(false);
  const [animationClass, setAnimationClass] = useState("animate-slide-in");

  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedState = localStorage.getItem("encuesta-ia-state");
        if (savedState) {
          const {
            phase,
            questions,
            currentQuestionIndex,
            formData,
            conversationHistory,
            report,
            consent,
            phoneConsent,
          } = JSON.parse(savedState);
          
          setPhase(phase || "welcome");
          if (questions && questions.length > 0) setQuestions(questions);
          setCurrentQuestionIndex(currentQuestionIndex || 0);
          setFormData(formData || {});
          setConversationHistory(conversationHistory || []);
          if (report) setReport(report);
          if (consent) setConsent(consent);
          if (phoneConsent) setPhoneConsent(phoneConsent);
        }
      } catch (error)
      {
        console.error("Failed to load state from localStorage", error);
        handleReset();
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stateToSave = JSON.stringify({
          phase,
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
  }, [phase, questions, currentQuestionIndex, formData, conversationHistory, report, consent, phoneConsent]);
  
  useEffect(() => {
    if (phase === 'survey' && inputRef.current) {
        inputRef.current.focus();
    }
  }, [currentQuestionIndex, phase]);

  const handleReset = useCallback(() => {
    setPhase("welcome");
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
    setAnimationClass("animate-slide-in");

    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem("encuesta-ia-state");
      } catch (error) {
        console.error("Failed to clear state from localStorage", error);
      }
    }
    
    toast({
        title: "Diagnóstico reiniciado",
        description: "Puedes volver a empezar desde el principio.",
    });
  }, [toast]);


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
      toast({
        title: "Respuesta requerida",
        description: "Por favor, selecciona una opción o escribe una respuesta.",
        variant: "destructive",
      });
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

    if (isEndOfInitialQuestions || (questions.length > initialQuestions.length && currentQuestionIndex >= questions.length - 1)) {
        if (finalAnswer === "Preparar el informe") {
          setPhase("report");
          return;
        }
        fetchNextQuestion(updatedHistory, newFormData);
    } else {
        triggerAnimation(currentQuestionIndex + 1);
    }
  };
  
  const triggerAnimation = (nextIndex: number) => {
    setAnimationClass("animate-slide-out");
    setTimeout(() => {
        setCurrentQuestionIndex(nextIndex);
        setAnimationClass("animate-slide-in");
    }, 500);
  }

  const fetchNextQuestion = async (history: Conversation, currentData: Partial<FormData>) => {
    setIsLoading(true);
    setLoadingMessage("La IA está pensando la siguiente pregunta...");
    try {
      const currentPhase = questions[questions.length - 1]?.phase ?? 'basic_info';
      const result = await getAIQuestion({
        conversationHistory: history,
        currentPhase: currentPhase,
        sector: currentData.sector,
      });

      if (!result || !result.responses || result.responses.length === 0) {
        throw new Error("Invalid AI response");
      }
      
      const newQuestionsFromAI: Question[] = result.responses.map((response, index) => ({
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
      
      // SAFETY CHECK: Prevent moving to report phase prematurely.
      if ((firstNewQuestion.phase === 'result' || !firstNewQuestion.question) && history.length < 20) {
        console.error("AI tried to end conversation prematurely. History:", history);
        toast({
          title: "Error de la IA",
          description: "La IA ha intentado terminar la conversación antes de tiempo. Por favor, inténtalo de nuevo.",
          variant: "destructive",
        });
        setIsLoading(false);
        // Optionally, reset or try again
        // handleReset(); // Let's not reset automatically, it's too disruptive.
        return;
      }
      
      if (firstNewQuestion.phase === 'reflection') {
        setLoadingMessage(firstNewQuestion.text);
        
        const actionableQuestion = newQuestionsFromAI[1];
        
        setTimeout(() => {
            setQuestions(prevQuestions => [...prevQuestions, actionableQuestion]);
            setIsLoading(false);
            triggerAnimation(questions.length); 
        }, 3000); 

      } else if (firstNewQuestion.phase === 'result') {
          setPhase('report');
          setIsLoading(false);
      } else {
        setQuestions(prevQuestions => {
          const allNewQuestions = [...prevQuestions, ...newQuestionsFromAI];
          triggerAnimation(allNewQuestions.length - newQuestionsFromAI.length);
          return allNewQuestions;
        });
        setIsLoading(false);
      }

    } catch (error) {
      console.error("Error fetching next question:", error);
      toast({
        title: "Error de conexión",
        description: "No se pudo obtener la siguiente pregunta. Inténtalo de nuevo.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };


  const sendWebhookData = async (currentReport: string) => {
    try {
      const webhookData = {
        contactInfo: {
          userName: formData.userName || 'N/A',
          userRole: formData.userRole || 'N/A',
          userEmail: formData.userEmail || 'N/A',
          userPhone: formData.userPhone || '',
        },
        companyInfo: {
          companyName: formData.companyName || 'N/A',
          sector: formData.sector || 'N/A',
        },
        surveyData: {
          conversationHistory: conversationHistory,
          report: currentReport,
        }
      };
      const response = await fetch('https://n8n.garrulero.xyz/webhook/encuesta-ia', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify(webhookData),
      });

      if (!response.ok) {
          console.error("Error sending data to webhook:", response.statusText);
          toast({ title: "Error de Webhook", description: `No se pudo enviar los datos (HTTP ${response.status}).`, variant: "destructive" });
          return false;
      }
      return true;
    } catch (webhookError) {
        console.error("Failed to send data to webhook:", webhookError);
        toast({ title: "Error de Webhook", description: "Fallo al conectar con el servidor del webhook.", variant: "destructive" });
        return false;
    }
  }

  const handleGenerateReport = async () => {
    // SAFETY CHECK: Ensure there's enough conversation to generate a meaningful report.
    if (conversationHistory.length <= 5) {
      toast({ title: "Datos insuficientes", description: "Es necesario responder a más preguntas para poder generar un informe.", variant: "destructive"});
      return;
    }
    if (!formData.userEmail) {
        toast({ title: "Email requerido", description: "Por favor, introduce tu email para recibir el informe.", variant: "destructive"});
        return;
    }
    if (!consent) {
        toast({ title: "Consentimiento requerido", description: "Debes aceptar los términos para poder generar el informe.", variant: "destructive"});
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
        await sendWebhookData(result.report);

    } catch (error) {
        console.error("Error generating report:", error);
        toast({ title: "Error al generar el informe", description: "No se pudo generar el informe. Inténtalo más tarde.", variant: "destructive"});
    } finally {
        setIsLoading(false);
    }
  };

  const handleResendWebhook = async () => {
    setLoadingMessage("Reenviando datos al webhook...");
    setIsLoading(true);
    const success = await sendWebhookData(report);
    if (success) {
      toast({
        title: "Datos reenviados",
        description: "El diagnóstico se ha enviado al webhook correctamente.",
      });
    }
    setIsLoading(false);
  }
  
  const handleDownloadData = () => {
    const dataToSave = {
        formData,
        conversationHistory,
        report,
    };
    const dataStr = JSON.stringify(dataToSave, null, 2);
    const dataBlob = new Blob([dataStr], {type: "application/json"});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `diagnostico-encuesta-ia-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({
        title: "Datos descargados",
        description: "Tu diagnóstico se ha guardado como un archivo JSON.",
    });
  };

  const renderContent = () => {
    if (phase === "welcome") {
      return (
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Bienvenido a encuesta.ia</h2>
          <p className="mb-6">
            Vamos a descubrir juntos algunas tareas de tu día a día que se podrían mejorar.
            Será una conversación breve y sin tecnicismos.
          </p>
          <Button onClick={() => setPhase("survey")} size="lg">
            Empezar Diagnóstico
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      );
    }

    if (phase === "survey" && currentQuestionIndex < questions.length) {
      const q = questions[currentQuestionIndex];
      const isNextDisabled = isLoading || (
        !q.optional && (
            (q.type === 'multiple-choice' || q.type === 'FREQUENCY_QUESTION')
                ? !currentAnswer
                : !currentAnswer.trim() && selectedOptions.length === 0
        )
      );

      return (
        <div key={q.id} className={`w-full ${animationClass}`}>
          <Label htmlFor={q.id} className="block text-xl mb-6 text-left">
            {q.text} {q.optional && <span className="text-sm text-muted-foreground">(opcional)</span>}
          </Label>
          {q.hint && <p className="text-sm text-muted-foreground mb-4">{q.hint}</p>}
          
          {q.type === 'textarea' ? (
            <Textarea
              id={q.id}
              ref={inputRef as React.Ref<HTMLTextAreaElement>}
              value={currentAnswer}
              onChange={(e) => setCurrentAnswer(e.target.value)}
              placeholder="Escribe tu respuesta aquí..."
              className="min-h-[120px]"
              disabled={isLoading}
            />
          ) : q.type === 'multiple-choice' ? (
            <RadioGroup
                value={currentAnswer}
                onValueChange={setCurrentAnswer}
                disabled={isLoading}
                className="space-y-3"
            >
                {q.options?.map((option) => (
                <div key={option} className="flex items-center space-x-3">
                    <RadioGroupItem value={option} id={`${q.id}-${option}`} />
                    <Label htmlFor={`${q.id}-${option}`} className="font-normal text-base cursor-pointer">
                        {option}
                    </Label>
                </div>
                ))}
            </RadioGroup>
          ) : q.type === 'checkbox-suggestions' ? (
            <div className="space-y-4">
              <div className="space-y-3">
                {q.options?.map((option) => (
                  <div key={option} className="flex items-center space-x-3">
                    <Checkbox
                      id={`${q.id}-${option}`}
                      checked={selectedOptions.includes(option)}
                      onCheckedChange={(checked) => {
                        setSelectedOptions((prev) =>
                          checked
                            ? [...prev, option]
                            : prev.filter((item) => item !== option)
                        );
                      }}
                      disabled={isLoading}
                    />
                    <Label
                      htmlFor={`${q.id}-${option}`}
                      className="font-normal text-base cursor-pointer"
                    >
                      {option}
                    </Label>
                  </div>
                ))}
              </div>
              <Textarea
                id={`${q.id}-custom`}
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                placeholder="Añade aquí otras tareas (una por línea)..."
                className="min-h-[100px]"
                disabled={isLoading}
              />
            </div>
           ) : q.type === 'FREQUENCY_QUESTION' ? (
             <RadioGroup
                value={currentAnswer}
                onValueChange={setCurrentAnswer}
                disabled={isLoading}
                className="space-y-3"
            >
                {["Varias veces al día", "Diariamente", "Semanalmente", "Mensualmente"].map((option) => (
                <div key={option} className="flex items-center space-x-3">
                    <RadioGroupItem value={option} id={`${q.id}-${option}`} />
                    <Label htmlFor={`${q.id}-${option}`} className="font-normal text-base cursor-pointer">
                        {option}
                    </Label>
                </div>
                ))}
            </RadioGroup>
           ) : (
            <Input
              id={q.id}
              ref={inputRef as React.Ref<HTMLInputElement>}
              type={q.type}
              value={currentAnswer}
              onChange={(e) => setCurrentAnswer(e.target.value)}
              placeholder="Tu respuesta..."
              disabled={isLoading}
              onKeyDown={(e) => e.key === 'Enter' && !isNextDisabled && handleNext()}
            />
          )}

          <div className="mt-8 flex justify-end">
            <Button onClick={handleNext} disabled={isNextDisabled} size="lg">
              Siguiente
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      );
    }
    
    if (phase === "report") {
        return (
            <div className={`w-full ${animationClass}`}>
                {report ? (
                    <div>
                        <h2 className="text-2xl font-bold mb-4">Tu informe está listo</h2>
                        <div className="text-left whitespace-pre-wrap p-4 border-2 border-dashed border-black bg-white max-h-96 overflow-y-auto">
                            {report}
                        </div>
                        <div className="mt-8 flex flex-wrap justify-center gap-4">
                            <Button onClick={handleDownloadData} size="lg" variant="outline">
                                <Download className="mr-2 h-4 w-4" />
                                Descargar datos
                            </Button>
                            <Button onClick={() => window.print()} size="lg">
                                <Printer className="mr-2 h-4 w-4" />
                                Imprimir informe
                            </Button>
                             <Button onClick={handleResendWebhook} size="lg" variant="secondary">
                                <Send className="mr-2 h-4 w-4" />
                                Reenviar a Webhook
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div>
                        <h2 className="text-2xl font-bold mb-4">Casi hemos terminado...</h2>
                        <p className="mb-6">Para generar tu informe personalizado, necesitamos tu consentimiento.</p>
                        <div className="space-y-4 text-left">
                            <div>
                                <Label htmlFor="userEmail">Tu dirección de email</Label>
                                <Input
                                    id="userEmail"
                                    type="email"
                                    placeholder="tu@email.com"
                                    value={formData.userEmail || ''}
                                    onChange={(e) => setFormData({...formData, userEmail: e.target.value})}
                                    disabled={isLoading}
                                />
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox id="consent" checked={consent} onCheckedChange={(checked) => setConsent(Boolean(checked))} disabled={isLoading} />
                                <Label htmlFor="consent" className="text-sm font-normal">
                                    Acepto los términos de uso y la política de privacidad para recibir el informe.
                                </Label>
                            </div>

                            <div className="border-t pt-4 space-y-4">
                                <div className="flex items-center space-x-2">
                                    <Checkbox id="phoneConsent" checked={phoneConsent} onCheckedChange={(checked) => setPhoneConsent(Boolean(checked))} disabled={isLoading} />
                                    <Label htmlFor="phoneConsent" className="text-sm font-normal">
                                        (Opcional) Acepto que me contactéis por teléfono.
                                    </Label>
                                </div>
                                {phoneConsent && (
                                     <div>
                                        <Label htmlFor="userPhone" className="sr-only">Número de teléfono</Label>
                                        <Input
                                            id="userPhone"
                                            type="tel"
                                            placeholder="Escribe aquí tu número de teléfono"
                                            value={formData.userPhone || ''}
                                            onChange={(e) => setFormData({...formData, userPhone: e.target.value})}
                                            disabled={isLoading}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="mt-8 flex justify-end">
                            <Button onClick={handleGenerateReport} disabled={isLoading || !consent || !formData.userEmail} size="lg">
                                Generar mi informe
                                <Send className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Fallback for loading state or if something goes wrong
    return null;
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-accent p-4 sm:p-8">
      <AlertDialog open={isLoading}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex flex-col items-center gap-4 text-center">
              <Loader2 className="h-8 w-8 animate-spin" />
              Procesando...
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center pt-2">
              {loadingMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
        </AlertDialogContent>
      </AlertDialog>

      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>encuesta.ia - Diagnóstico interactivo v1.0</CardTitle>
        </CardHeader>
        <CardContent className="p-6 sm:p-10 min-h-[350px] flex items-center justify-center">
          {renderContent()}
        </CardContent>
        {phase !== 'welcome' && (
          <CardFooter className="justify-center border-t p-6">
              <Button variant="link" onClick={handleReset}>
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Reiniciar diagnóstico
              </Button>
          </CardFooter>
        )}
      </Card>
      <footer className="mt-4 text-xs text-foreground/50">
        Una herramienta para detectar ineficiencias.
      </footer>
    </main>
  );
}
