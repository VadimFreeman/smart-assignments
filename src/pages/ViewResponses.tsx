import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Copy, Users, FileText, CheckCircle, XCircle, MessageSquare } from "lucide-react";
import { User, Session } from "@supabase/supabase-js";

interface TestQuestion { id: string; text: string; options: { id: string; text: string; isCorrect: boolean }[]; }
interface OpenQuestion { id: string; text: string; type: "open"; }
type Question = TestQuestion | OpenQuestion;
interface Assignment { id: string; title: string; description: string | null; type: "test" | "open_question"; access_code: string; questions: Question[]; }
interface StudentAnswer { questionId: string; answer: string; }
interface StudentResponse { id: string; student_name: string; answers: StudentAnswer[]; score: number | null; max_score: number | null; teacher_grade: string | null; teacher_comment: string | null; submitted_at: string; }

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
      setSession(session); setUser(session?.user ?? null);
      if (!session?.user) navigate("/teacher/login");
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session); setUser(session?.user ?? null);
      if (!session?.user) navigate("/teacher/login");
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => { if (user) fetchData(); }, [user, id]);

  const fetchData = async () => {
    try {
      const { data: assignmentData, error: assignmentError } = await supabase.from("assignments").select("*").eq("id", id).single();
      if (assignmentError) throw assignmentError;
      setAssignment({ ...assignmentData, questions: assignmentData.questions as unknown as Question[] });
      const { data: responsesData, error: responsesError } = await supabase.from("student_responses").select("*").eq("assignment_id", id).order("submitted_at", { ascending: false });
      if (responsesError) throw responsesError;
      setResponses((responsesData || []).map(r => ({ ...r, answers: r.answers as unknown as StudentAnswer[] })));
    } catch {
      toast({ title: "Ошибка", description: "Не удалось загрузить данные", variant: "destructive" });
      navigate("/teacher/dashboard");
    } finally { setIsLoading(false); }
  };

  const copyAccessCode = () => {
    if (assignment) { navigator.clipboard.writeText(assignment.access_code); toast({ title: "Скопировано!", description: `Код ${assignment.access_code} скопирован` }); }
  };

  const openGradeDialog = (response: StudentResponse) => {
    setSelectedResponse(response); setGrade(response.teacher_grade || ""); setComment(response.teacher_comment || "");
  };

  const saveGrade = async () => {
    if (!selectedResponse) return;
    setIsSaving(true);
    try {
      const { error } = await supabase.from("student_responses").update({ teacher_grade: grade.trim() || null, teacher_comment: comment.trim() || null }).eq("id", selectedResponse.id);
      if (error) throw error;
      setResponses(responses.map(r => r.id === selectedResponse.id ? { ...r, teacher_grade: grade.trim() || null, teacher_comment: comment.trim() || null } : r));
      toast({ title: "Сохранено!", description: "Оценка и комментарий сохранены" });
      setSelectedResponse(null);
    } catch { toast({ title: "Ошибка", description: "Не удалось сохранить оценку", variant: "destructive" });
    } finally { setIsSaving(false); }
  };

  const getAnswerForQuestion = (response: StudentResponse, questionId: string) => response.answers.find(a => a.questionId === questionId)?.answer || "";
  const getOptionText = (question: TestQuestion, optionId: string) => question.options.find(o => o.id === optionId)?.text || optionId;
  const isAnswerCorrect = (question: TestQuestion, answerId: string) => question.options.find(o => o.id === answerId)?.isCorrect || false;

  if (isLoading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-muted-foreground">Загрузка...</p>
    </div>
  );

  if (!assignment) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/60 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" className="gap-2" onClick={() => navigate("/teacher/dashboard")}>
            <ArrowLeft className="h-4 w-4" />
            Назад к заданиям
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Assignment Info */}
        <div className="m3-card p-6 mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-xl font-medium">{assignment.title}</h1>
              {assignment.description && <p className="text-muted-foreground mt-1">{assignment.description}</p>}
            </div>
            <Badge variant={assignment.type === "test" ? "default" : "secondary"} className="rounded-full shrink-0">
              {assignment.type === "test" ? "Тест" : "Открытый вопрос"}
            </Badge>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Код:</span>
              <code className="bg-secondary text-secondary-foreground px-2.5 py-1 rounded-full font-mono">{assignment.access_code}</code>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={copyAccessCode}><Copy className="h-4 w-4" /></Button>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground"><Users className="h-4 w-4" /><span>{responses.length} ответов</span></div>
            <div className="flex items-center gap-1.5 text-muted-foreground"><FileText className="h-4 w-4" /><span>{assignment.questions.length} вопросов</span></div>
          </div>
        </div>

        {responses.length === 0 ? (
          <div className="m3-card flex flex-col items-center justify-center py-16 px-6">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-5">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">Нет ответов</h3>
            <p className="text-muted-foreground">Ученики ещё не отправили ответы на это задание</p>
          </div>
        ) : (
          <div className="m3-card overflow-hidden">
            <div className="p-6 pb-4">
              <h2 className="text-lg font-medium">Ответы учеников</h2>
            </div>
            <div className="px-6 pb-6">
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
                      <TableCell className="font-medium">{response.student_name}</TableCell>
                      {assignment.type === "test" && (
                        <TableCell>
                          <span className="font-medium">{response.score} / {response.max_score}</span>
                          <span className="text-muted-foreground ml-2">({Math.round(((response.score || 0) / (response.max_score || 1)) * 100)}%)</span>
                        </TableCell>
                      )}
                      <TableCell>
                        {response.teacher_grade ? <Badge variant="outline" className="rounded-full">{response.teacher_grade}</Badge> : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(response.submitted_at).toLocaleDateString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => openGradeDialog(response)}>
                              <MessageSquare className="h-4 w-4 mr-2" />
                              Подробнее
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto rounded-3xl">
                            <DialogHeader>
                              <DialogTitle>Ответ: {response.student_name}</DialogTitle>
                              <DialogDescription>
                                {assignment.type === "test" && `Результат: ${response.score} / ${response.max_score} (${Math.round(((response.score || 0) / (response.max_score || 1)) * 100)}%)`}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-5 py-4">
                              {assignment.questions.map((question, index) => {
                                const answerId = getAnswerForQuestion(response, question.id);
                                const isTest = assignment.type === "test" && "options" in question;
                                return (
                                  <div key={question.id} className="space-y-2">
                                    <p className="font-medium">Вопрос {index + 1}: {question.text}</p>
                                    {isTest ? (
                                      <div className="flex items-center gap-2">
                                        {isAnswerCorrect(question as TestQuestion, answerId)
                                          ? <CheckCircle className="h-5 w-5 text-primary" />
                                          : <XCircle className="h-5 w-5 text-destructive" />}
                                        <span>{getOptionText(question as TestQuestion, answerId)}</span>
                                      </div>
                                    ) : (
                                      <div className="bg-secondary rounded-2xl p-4">
                                        <p className="whitespace-pre-wrap">{answerId || "Нет ответа"}</p>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                              <div className="border-t border-border pt-5 space-y-4">
                                <div className="space-y-2">
                                  <Label htmlFor="grade">Оценка</Label>
                                  <Input id="grade" placeholder="Например: 5 или Отлично" value={grade} onChange={(e) => setGrade(e.target.value)} maxLength={20} />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="comment">Комментарий</Label>
                                  <Textarea id="comment" placeholder="Комментарий к работе ученика..." value={comment} onChange={(e) => setComment(e.target.value)} rows={3} maxLength={1000} />
                                </div>
                                <button className="m3-filled-btn" onClick={saveGrade} disabled={isSaving}>
                                  {isSaving ? "Сохранение..." : "Сохранить оценку"}
                                </button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ViewResponses;
