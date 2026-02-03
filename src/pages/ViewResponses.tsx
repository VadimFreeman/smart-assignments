import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Copy, Users, FileText, CheckCircle, XCircle, MessageSquare } from "lucide-react";
import { User, Session } from "@supabase/supabase-js";

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
  access_code: string;
  questions: Question[];
}

interface StudentAnswer {
  questionId: string;
  answer: string;
}

interface StudentResponse {
  id: string;
  student_name: string;
  answers: StudentAnswer[];
  score: number | null;
  max_score: number | null;
  teacher_grade: string | null;
  teacher_comment: string | null;
  submitted_at: string;
}

const ViewResponses = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [responses, setResponses] = useState<StudentResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedResponse, setSelectedResponse] = useState<StudentResponse | null>(null);
  const [grade, setGrade] = useState("");
  const [comment, setComment] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (!session?.user) {
        navigate("/teacher/login");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (!session?.user) {
        navigate("/teacher/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, id]);

  const fetchData = async () => {
    try {
      // Fetch assignment
      const { data: assignmentData, error: assignmentError } = await supabase
        .from("assignments")
        .select("*")
        .eq("id", id)
        .single();

      if (assignmentError) throw assignmentError;

      setAssignment({
        ...assignmentData,
        questions: assignmentData.questions as unknown as Question[],
      });

      // Fetch responses
      const { data: responsesData, error: responsesError } = await supabase
        .from("student_responses")
        .select("*")
        .eq("assignment_id", id)
        .order("submitted_at", { ascending: false });

      if (responsesError) throw responsesError;

      setResponses(
        (responsesData || []).map(r => ({
          ...r,
          answers: r.answers as unknown as StudentAnswer[],
        }))
      );
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить данные",
        variant: "destructive",
      });
      navigate("/teacher/dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  const copyAccessCode = () => {
    if (assignment) {
      navigator.clipboard.writeText(assignment.access_code);
      toast({
        title: "Скопировано!",
        description: `Код ${assignment.access_code} скопирован в буфер обмена`,
      });
    }
  };

  const openGradeDialog = (response: StudentResponse) => {
    setSelectedResponse(response);
    setGrade(response.teacher_grade || "");
    setComment(response.teacher_comment || "");
  };

  const saveGrade = async () => {
    if (!selectedResponse) return;

    setIsSaving(true);

    try {
      const { error } = await supabase
        .from("student_responses")
        .update({
          teacher_grade: grade.trim() || null,
          teacher_comment: comment.trim() || null,
        })
        .eq("id", selectedResponse.id);

      if (error) throw error;

      setResponses(responses.map(r =>
        r.id === selectedResponse.id
          ? { ...r, teacher_grade: grade.trim() || null, teacher_comment: comment.trim() || null }
          : r
      ));

      toast({
        title: "Сохранено!",
        description: "Оценка и комментарий сохранены",
      });

      setSelectedResponse(null);
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить оценку",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getAnswerForQuestion = (response: StudentResponse, questionId: string): string => {
    const answer = response.answers.find(a => a.questionId === questionId);
    return answer?.answer || "";
  };

  const getOptionText = (question: TestQuestion, optionId: string): string => {
    const option = question.options.find(o => o.id === optionId);
    return option?.text || optionId;
  };

  const isAnswerCorrect = (question: TestQuestion, answerId: string): boolean => {
    const option = question.options.find(o => o.id === answerId);
    return option?.isCorrect || false;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Загрузка...</p>
      </div>
    );
  }

  if (!assignment) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            className="gap-2"
            onClick={() => navigate("/teacher/dashboard")}
          >
            <ArrowLeft className="h-4 w-4" />
            Назад к заданиям
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Assignment Info */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>{assignment.title}</CardTitle>
                {assignment.description && (
                  <CardDescription className="mt-2">
                    {assignment.description}
                  </CardDescription>
                )}
              </div>
              <Badge variant={assignment.type === "test" ? "default" : "secondary"}>
                {assignment.type === "test" ? "Тест" : "Открытый вопрос"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Код:</span>
                <code className="bg-muted px-2 py-1 rounded font-mono">
                  {assignment.access_code}
                </code>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={copyAccessCode}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{responses.length} ответов</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>{assignment.questions.length} вопросов</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Responses */}
        {responses.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Нет ответов</h3>
              <p className="text-muted-foreground">
                Ученики ещё не отправили ответы на это задание
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Ответы учеников</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Имя ученика</TableHead>
                    {assignment.type === "test" && <TableHead>Результат</TableHead>}
                    <TableHead>Оценка</TableHead>
                    <TableHead>Дата</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {responses.map((response) => (
                    <TableRow key={response.id}>
                      <TableCell className="font-medium">
                        {response.student_name}
                      </TableCell>
                      {assignment.type === "test" && (
                        <TableCell>
                          <span className="font-medium">
                            {response.score} / {response.max_score}
                          </span>
                          <span className="text-muted-foreground ml-2">
                            ({Math.round(((response.score || 0) / (response.max_score || 1)) * 100)}%)
                          </span>
                        </TableCell>
                      )}
                      <TableCell>
                        {response.teacher_grade ? (
                          <Badge variant="outline">{response.teacher_grade}</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(response.submitted_at).toLocaleDateString("ru-RU", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openGradeDialog(response)}
                            >
                              <MessageSquare className="h-4 w-4 mr-2" />
                              Подробнее
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Ответ: {response.student_name}</DialogTitle>
                              <DialogDescription>
                                {assignment.type === "test" && (
                                  <span>
                                    Результат: {response.score} / {response.max_score} (
                                    {Math.round(((response.score || 0) / (response.max_score || 1)) * 100)}%)
                                  </span>
                                )}
                              </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-6 py-4">
                              {assignment.questions.map((question, index) => {
                                const answerId = getAnswerForQuestion(response, question.id);
                                const isTest = assignment.type === "test" && "options" in question;
                                
                                return (
                                  <div key={question.id} className="space-y-2">
                                    <p className="font-medium">
                                      Вопрос {index + 1}: {question.text}
                                    </p>
                                    {isTest ? (
                                      <div className="flex items-center gap-2">
                                        {isAnswerCorrect(question as TestQuestion, answerId) ? (
                                          <CheckCircle className="h-5 w-5 text-primary" />
                                        ) : (
                                          <XCircle className="h-5 w-5 text-destructive" />
                                        )}
                                        <span>{getOptionText(question as TestQuestion, answerId)}</span>
                                      </div>
                                    ) : (
                                      <div className="bg-muted p-3 rounded-lg">
                                        <p className="whitespace-pre-wrap">{answerId || "Нет ответа"}</p>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}

                              <div className="border-t pt-4 space-y-4">
                                <div className="space-y-2">
                                  <Label htmlFor="grade">Оценка</Label>
                                  <Input
                                    id="grade"
                                    placeholder="Например: 5 или Отлично"
                                    value={grade}
                                    onChange={(e) => setGrade(e.target.value)}
                                    maxLength={20}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="comment">Комментарий</Label>
                                  <Textarea
                                    id="comment"
                                    placeholder="Комментарий к работе ученика..."
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    rows={3}
                                    maxLength={1000}
                                  />
                                </div>
                                <Button onClick={saveGrade} disabled={isSaving}>
                                  {isSaving ? "Сохранение..." : "Сохранить оценку"}
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default ViewResponses;
