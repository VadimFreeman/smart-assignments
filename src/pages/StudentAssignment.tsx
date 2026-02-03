import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { BookOpen, CheckCircle, ArrowLeft } from "lucide-react";

interface TestQuestion {
  id: string;
  text: string;
  options: { id: string; text: string; isCorrect: boolean }[];
}

interface OpenQuestion {
  id: string;
  text: string;
  type: "open";
}

type Question = TestQuestion | OpenQuestion;

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  type: "test" | "open_question";
  questions: Question[];
}

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
      toast({
        title: "Ошибка",
        description: "Пожалуйста, введите ваше имя на главной странице",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    fetchAssignment();
  }, [id, studentName, navigate]);

  const fetchAssignment = async () => {
    try {
      const { data, error } = await supabase
        .from("assignments")
        .select("*")
        .eq("id", id)
        .eq("is_active", true)
        .single();

      if (error || !data) {
        toast({
          title: "Ошибка",
          description: "Задание не найдено или недоступно",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      setAssignment({
        ...data,
        questions: data.questions as unknown as Question[],
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить задание",
        variant: "destructive",
      });
      navigate("/");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers({ ...answers, [questionId]: answer });
  };

  const calculateScore = () => {
    if (!assignment || assignment.type !== "test") return null;

    let correct = 0;
    const questions = assignment.questions as TestQuestion[];
    
    for (const question of questions) {
      const selectedOptionId = answers[question.id];
      const correctOption = question.options.find(o => o.isCorrect);
      
      if (selectedOptionId && correctOption && selectedOptionId === correctOption.id) {
        correct++;
      }
    }

    return { correct, total: questions.length };
  };

  const handleSubmit = async () => {
    if (!assignment || !studentName) return;

    // Validate all questions are answered
    const unanswered = assignment.questions.filter(q => !answers[q.id]);
    if (unanswered.length > 0) {
      toast({
        title: "Ошибка",
        description: "Пожалуйста, ответьте на все вопросы",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const scoreResult = calculateScore();
      
      const answersData = assignment.questions.map(q => ({
        questionId: q.id,
        answer: answers[q.id],
      }));

      const { error } = await supabase
        .from("student_responses")
        .insert({
          assignment_id: assignment.id,
          student_name: studentName,
          answers: answersData,
          score: scoreResult?.correct ?? null,
          max_score: scoreResult?.total ?? null,
        });

      if (error) throw error;

      setScore(scoreResult);
      setIsSubmitted(true);
      
      toast({
        title: "Ответ отправлен!",
        description: "Ваш ответ успешно сохранён",
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось отправить ответ",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Загрузка задания...</p>
      </div>
    );
  }

  if (!assignment) {
    return null;
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            <CheckCircle className="h-16 w-16 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Ответ отправлен!</h2>
            
            {score && (
              <div className="mb-4">
                <p className="text-muted-foreground mb-2">Ваш результат:</p>
                <p className="text-4xl font-bold text-primary">
                  {score.correct} / {score.total}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {Math.round((score.correct / score.total) * 100)}% правильных ответов
                </p>
              </div>
            )}

            {assignment.type === "open_question" && (
              <p className="text-muted-foreground mb-4">
                Учитель проверит ваш ответ и поставит оценку
              </p>
            )}

            <Button onClick={() => navigate("/")} className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              На главную
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <span className="font-medium">Учебная платформа</span>
          </div>
          <span className="text-sm text-muted-foreground">
            {studentName}
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>{assignment.title}</CardTitle>
            {assignment.description && (
              <CardDescription>{assignment.description}</CardDescription>
            )}
          </CardHeader>
        </Card>

        <div className="space-y-6">
          {assignment.questions.map((question, index) => (
            <Card key={question.id}>
              <CardHeader>
                <CardTitle className="text-lg">
                  Вопрос {index + 1}
                </CardTitle>
                <CardDescription className="text-base text-foreground">
                  {question.text}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {assignment.type === "test" && "options" in question ? (
                  <RadioGroup
                    value={answers[question.id] || ""}
                    onValueChange={(value) => handleAnswerChange(question.id, value)}
                  >
                    {question.options.map((option) => (
                      <div key={option.id} className="flex items-center space-x-2">
                        <RadioGroupItem value={option.id} id={option.id} />
                        <Label htmlFor={option.id} className="cursor-pointer flex-1">
                          {option.text}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                ) : (
                  <Textarea
                    placeholder="Введите ваш ответ..."
                    value={answers[question.id] || ""}
                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                    rows={6}
                    maxLength={5000}
                  />
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 flex justify-end">
          <Button
            size="lg"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Отправка..." : "Отправить ответ"}
          </Button>
        </div>
      </main>
    </div>
  );
};

export default StudentAssignment;
