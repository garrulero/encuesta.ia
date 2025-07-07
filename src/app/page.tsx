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
import { getAIQuestion, getAIReport } from "./actions";
import type {
  Conversation,
  FormData,
  Phase,
  Question,
} from "@/types";
import { Loader2, ArrowRight, Printer, Send, RefreshCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const initialQuestions: Question[] = [
  {
    id: "q1",
    phase: "basic_info",
    text: "Para empezar, ¿cuál es tu nombre?",
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
];

export default function EncuestaIaPage() {
  const { toast } = useToast();
  const [phase, setPhase] = useState<"welcome" | "survey" | "report">("welcome");
  const [questions, setQuestions] = useState<Question[]>(initialQuestions);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [formData, setFormData] = useState<Partial<FormData>>({});
  const [conversationHistory, setConversationHistory] = useState<Conversation>([]);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState("");
  const [consent, setConsent] = useState(false);
  const [animationClass, setAnimationClass] = useState("animate-slide-in");

  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
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
        } = JSON.parse(savedState);
        
        setPhase(phase || "welcome");
        if (questions && questions.length > 0) setQuestions(questions);
        setCurrentQuestionIndex(currentQuestionIndex || 0);
        setFormData(formData || {});
        setConversationHistory(conversationHistory || []);
        if (report) setReport(report);
      }
    } catch (error) {
      console.error("Failed to load state from localStorage", error);
    }
  }, []);

  useEffect(() => {
    try {
      const stateToSave = JSON.stringify({
        phase,
        questions,
        currentQuestionIndex,
        formData,
        conversationHistory,
        report
      });
      localStorage.setItem("encuesta-ia-state", stateToSave);
    } catch (error) {
      console.error("Failed to save state to localStorage", error);
    }
  }, [phase, questions, currentQuestionIndex, formData, conversationHistory, report]);
  
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
    setIsLoading(false);
    setReport("");
    setConsent(false);
    setAnimationClass("animate-slide-in");

    try {
      localStorage.removeItem("encuesta-ia-state");
    } catch (error) {
      console.error("Failed to clear state from localStorage", error);
    }
    
    toast({
        title: "Diagnóstico reiniciado",
        description: "Puedes volver a empezar desde el principio.",
    });
  }, [toast]);


  const handleNext = async () => {
    if (!currentAnswer.trim()) {
      toast({
        title: "Respuesta requerida",
        description: "Por favor, introduce una respuesta.",
        variant: "destructive",
      });
      return;
    }

    const currentQuestion = questions[currentQuestionIndex];
    
    const newFormData = { ...formData, [currentQuestion.key]: currentAnswer };
    setFormData(newFormData);

    const newHistory: Conversation = [
      ...conversationHistory,
      { question: currentQuestion.text, answer: currentAnswer },
    ];
    setConversationHistory(newHistory);
    
    setCurrentAnswer("");

    if (currentQuestionIndex < questions.length - 1) {
      triggerAnimation(currentQuestionIndex + 1);
    } else {
      await fetchNextQuestion(newHistory, newFormData);
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
    try {
      const currentPhase = questions[currentQuestionIndex]?.phase ?? 'basic_info';
      const result = await getAIQuestion({
        conversationHistory: history,
        currentPhase: currentPhase,
        sector: currentData.sector,
      });

      if (result.phase === 'result' || history.length >= 9) {
        setPhase('report');
      } else {
        const newQuestion: Question = {
            id: `q-ai-${questions.length + 1}`,
            text: result.question,
            phase: result.phase,
            type: result.phase === 'context_data' && result.question.toLowerCase().includes('describ') ? 'textarea' : 'text',
            key: `custom-${result.phase}-${questions.length + 1}`
        }
        setQuestions([...questions, newQuestion]);
        triggerAnimation(questions.length);
      }
    } catch (error) {
      console.error("Error fetching next question:", error);
      toast({
        title: "Error de conexión",
        description: "No se pudo obtener la siguiente pregunta. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!formData.userEmail) {
        toast({ title: "Email requerido", description: "Por favor, introduce tu email para recibir el informe.", variant: "destructive"});
        return;
    }
    if (!consent) {
        toast({ title: "Consentimiento requerido", description: "Debes aceptar que te contactemos para recibir el informe.", variant: "destructive"});
        return;
    }

    setIsLoading(true);
    try {
        const reportInput = {
            companyName: formData.companyName || 'N/A',
            userName: formData.userName || 'N/A',
            userRole: formData.userRole || 'N/A',
            inefficientTasks: formData.inefficientTasks || [],
            weeklyTimeLost: formData.weeklyTimeLost || 0,
            companyDescription: formData.companyDescription || 'No proporcionada',
            comments: formData.comments,
        };
        const result = await getAIReport(reportInput);
        setReport(result.report);
    } catch (error) {
        console.error("Error generating report:", error);
        toast({ title: "Error al generar el informe", description: "No se pudo generar el informe. Inténtalo más tarde.", variant: "destructive"});
    } finally {
        setIsLoading(false);
    }
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

    if (phase === "survey") {
      const q = questions[currentQuestionIndex];
      return (
        <div key={q.id} className={`w-full ${animationClass}`}>
          <Label htmlFor={q.id} className="block text-xl mb-6 text-left">
            {q.text}
          </Label>
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
          ) : (
            <Input
              id={q.id}
              ref={inputRef as React.Ref<HTMLInputElement>}
              type={q.type}
              value={currentAnswer}
              onChange={(e) => setCurrentAnswer(e.target.value)}
              placeholder="Tu respuesta..."
              disabled={isLoading}
              onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleNext()}
            />
          )}
          <div className="mt-8 flex justify-end">
            <Button onClick={handleNext} disabled={isLoading} size="lg">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Pensando...
                </>
              ) : (
                <>
                  Siguiente
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
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
                        <div className="mt-8 flex justify-center">
                            <Button onClick={() => window.print()} size="lg">
                                <Printer className="mr-2 h-4 w-4" />
                                Imprimir informe
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div>
                        <h2 className="text-2xl font-bold mb-4">Casi hemos terminado...</h2>
                        <p className="mb-6">Introduce tu email para generar y recibir tu informe personalizado.</p>
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
                                    Acepto que me contactéis respecto a este diagnóstico.
                                </Label>
                            </div>
                        </div>
                        <div className="mt-8 flex justify-end">
                            <Button onClick={handleGenerateReport} disabled={isLoading || !consent} size="lg">
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Generando...
                                    </>
                                ) : (
                                    <>
                                        Generar mi informe
                                        <Send className="ml-2 h-4 w-4" />
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        );
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-accent p-4 sm:p-8">
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
