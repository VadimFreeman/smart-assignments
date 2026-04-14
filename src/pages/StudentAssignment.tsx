import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { BookOpen, CheckCircle, ArrowLeft } from "lucide-react";

interface TestQuestion { id: string; text: string; options: { id: string; text: string; isCorrect: boolean }[]; }
interface OpenQuestion { id: string; text: string; type: "open"; }
type Question = TestQuestion | OpenQuestion;
interface Assignment { id: string; title: string; description: string | null; type: "test" | "open_question"; questions: Question[]; }

const StudentAssignment = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState<{ correct: number; total: number } | null>(null);
  const studentName = sessionStorage.getItem("studentName");

  useEffect(() => {
    if (!studentName) {
      toast({ title: "Ошибка", description: "Пожалуйста, введите ваше имя на главной странице", variant: "destructive" });
      navigate("/"); return;
    }
    fetchAssignment();
  }, [id, studentName, navigate]);

  const fetchAssignment = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("get-assignment", { body: { assignment_id: id } });
      if (error || !data || data.error) { toast({ title: "Ошибка", description: "Задание не найдено или недоступно", variant: "destructive" }); navigate("/"); return; }
      setAssignment(data as Assignment);
    } catch { toast({ title: "Ошибка", description: "Не удалось загрузить задание", variant: "destructive" }); navigate("/");
    } finally { setIsLoading(false); }
  };

  const handleAnswerChange = (questionId: string, answer: string) => setAnswers({ ...answers, [questionId]: answer });

  const handleSubmit = async () => {
    if (!assignment || !studentName) return;
    const unanswered = assignment.questions.filter(q => !answers[q.id]);
    if (unanswered.length > 0) { toast({ title: "Ошибка", description: "Пожалуйста, ответьте на все вопросы", variant: "destructive" }); return; }
    setIsSubmitting(true);
    try {
      const answersData = assignment.questions.map(q => ({ questionId: q.id, answer: answers[q.id] }));
      const { data, error } = await supabase.functions.invoke("submit-response", {
        body: { assignment_id: assignment.id, student_name: studentName, answers: answersData },
      });
      if (error || !data || data.error) {
        const message = data?.error === "You have already submitted a response for this assignment" ? "Вы уже отправили ответ на это задание" : "Не удалось отправить ответ";
        toast({ title: "Ошибка", description: message, variant: "destructive" }); return;
      }
      if (data.score !== null && data.max_score !== null) setScore({ correct: data.score, total: data.max_score });
      setIsSubmitted(true);
      toast({ title: "Ответ отправлен!", description: "Ваш ответ успешно сохранён" });
    } catch { toast({ title: "Ошибка", description: "Не удалось отправить ответ", variant: "destructive" });
    } finally { setIsSubmitting(false); }
  };

  if (isLoading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-muted-foreground">Загрузка задания...</p>
    </div>
  );

  if (!assignment) return null;

  if (isSubmitted) return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="m3-card w-full max-w-md text-center p-10">
        <div className="w-20 h-20 rounded-full bg-primary/12 flex items-center justify-center mx-auto mb-5">
          <CheckCircle className="h-10 w-10 text-primary" />
        </div>
        <h2 className="text-2xl font-medium mb-3">Ответ отправлен!</h2>
        {score && (
          <div className="mb-5">
            <p className="text-muted-foreground mb-2">Ваш результат:</p>
            <p className="text-5xl font-medium text-primary">{score.correct} / {score.total}</p>
            <p className="text-sm text-muted-foreground mt-2">
              {Math.round((score.correct / score.total) * 100)}% правильных ответов
            </p>
          </div>
        )}
        {assignment.type === "open_question" && (
          <p className="text-muted-foreground mb-5">Учитель проверит ваш ответ и поставит оценку</p>
        )}
        <button className="m3-filled-btn" onClick={() => navigate("/")}>
          <ArrowLeft className="h-4 w-4" />
          На главную
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/60 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/12 flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <span className="font-medium">Учебная платформа</span>
          </div>
          <span className="text-sm text-muted-foreground">{studentName}</span>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="m3-card p-6 mb-8">
          <h2 className="text-xl font-medium">{assignment.title}</h2>
          {assignment.description && <p className="text-muted-foreground mt-2">{assignment.description}</p>}
        </div>

        <div className="space-y-5">
          {assignment.questions.map((question, index) => (
            <div key={question.id} className="m3-card p-6">
              <h3 className="text-base font-medium mb-1">Вопрос {index + 1}</h3>
              <p className="text-foreground mb-4">{question.text}</p>
              {assignment.type === "test" && "options" in question ? (
                <RadioGroup value={answers[question.id] || ""} onValueChange={(value) => handleAnswerChange(question.id, value)}>
                  {question.options.map((option) => (
                    <div key={option.id} className="flex items-center space-x-2">
                      <RadioGroupItem value={option.id} id={option.id} />
                      <Label htmlFor={option.id} className="cursor-pointer flex-1">{option.text}</Label>
                    </div>
                  ))}
                </RadioGroup>
              ) : (
                <Textarea placeholder="Введите ваш ответ..." value={answers[question.id] || ""} onChange={(e) => handleAnswerChange(question.id, e.target.value)} rows={6} maxLength={5000} />
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 flex justify-end">
          <button className="m3-filled-btn text-base px-8 py-3" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Отправка..." : "Отправить ответ"}
          </button>
        </div>
      </main>
    </div>
  );
};

export default StudentAssignment;
