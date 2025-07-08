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
  Phase,
  Question,
} from "@/types";
import { Loader2, ArrowRight, Printer, Send, RefreshCcw, Download } from "lucide-react";
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
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Un momento, por favor...");
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
    setSelectedOptions([]);
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
    const currentQuestion = questions[currentQuestionIndex];
    let finalAnswer = "";

    if (currentQuestion.type === 'checkbox-suggestions') {
        const customTasks = currentAnswer.trim().split('\n').filter(task => task.trim() !== '');
        const allTasks = [...new Set([...selectedOptions, ...customTasks])];
        finalAnswer = allTasks.join(', ');
    } else {
        finalAnswer = currentAnswer.trim();
    }
    
    if (!finalAnswer) {
      toast({
        title: "Respuesta requerida",
        description: "Por favor, selecciona una opción o escribe una respuesta.",
        variant: "destructive",
      });
      return;
    }

    const newFormData = { ...formData, [currentQuestion.key]: finalAnswer };
    setFormData(newFormData);

    const newHistory: Conversation = [
      ...conversationHistory,
      { question: currentQuestion.text, answer: finalAnswer },
    ];
    setConversationHistory(newHistory);
    
    setCurrentAnswer("");
    setSelectedOptions([]);

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
    setLoadingMessage("La IA está buscando la mejor pregunta para ti...");
    setIsLoading(true);
    try {
      const currentPhase = questions[currentQuestionIndex]?.phase ?? 'basic_info';
      const result = await getAIQuestion({
        conversationHistory: history,
        currentPhase: currentPhase,
        sector: currentData.sector,
      });

      if (result.phase === 'result' || !result.question || history.length >= 9) {
        setPhase('report');
      } else {
        const newQuestion: Question = {
            id: `q-ai-${questions.length + 1}`,
            text: result.question,
            phase: result.phase,
            type: result.type,
            options: result.options,
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

    setLoadingMessage("Estamos generando tu informe personalizado. Esto puede tardar unos segundos...");
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

    if (phase === "survey") {
      const q = questions[currentQuestionIndex];
      const isNextDisabled = isLoading || (
        q.type === 'checkbox-suggestions' 
            ? selectedOptions.length === 0 && !currentAnswer.trim()
            : !currentAnswer.trim()
      );

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
                placeholder="Añade aquí otras tareas..."
                className="min-h-[100px]"
                disabled={isLoading}
              />
            </div>
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
                        <div className="mt-8 flex justify-center gap-4">
                            <Button onClick={handleDownloadData} size="lg" variant="outline">
                                <Download className="mr-2 h-4 w-4" />
                                Descargar datos
                            </Button>
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
