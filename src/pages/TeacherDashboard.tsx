import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { BookOpen, Plus, LogOut, Users, FileText, Copy, Eye, EyeOff } from "lucide-react";
import { User, Session } from "@supabase/supabase-js";

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  type: "test" | "open_question";
  access_code: string;
  is_active: boolean;
  created_at: string;
  questions: unknown[];
  response_count?: number;
}

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session?.user) navigate("/teacher/login");
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session?.user) navigate("/teacher/login");
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) fetchAssignments();
  }, [user]);

  const fetchAssignments = async () => {
    try {
      const { data: assignmentsData, error } = await supabase
        .from("assignments").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      const assignmentsWithCounts = await Promise.all(
        (assignmentsData || []).map(async (assignment) => {
          const { count } = await supabase.from("student_responses")
            .select("*", { count: "exact", head: true }).eq("assignment_id", assignment.id);
          return { ...assignment, questions: assignment.questions as unknown[], response_count: count || 0 };
        })
      );
      setAssignments(assignmentsWithCounts);
    } catch {
      toast({ title: "Ошибка", description: "Не удалось загрузить задания", variant: "destructive" });
    } finally { setIsLoading(false); }
  };

  const handleLogout = async () => { await supabase.auth.signOut(); navigate("/"); };

  const copyAccessCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Скопировано!", description: `Код ${code} скопирован в буфер обмена` });
  };

  const toggleAssignmentStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase.from("assignments").update({ is_active: !currentStatus }).eq("id", id);
      if (error) throw error;
      setAssignments(assignments.map(a => a.id === id ? { ...a, is_active: !currentStatus } : a));
      toast({ title: "Успешно!", description: `Задание ${!currentStatus ? "активировано" : "деактивировано"}` });
    } catch {
      toast({ title: "Ошибка", description: "Не удалось изменить статус задания", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Загрузка...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/60 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/12 flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-xl font-medium">Панель учителя</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:block">{user?.email}</span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Выйти
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-medium">Мои задания</h2>
          <button className="m3-filled-btn" onClick={() => navigate("/teacher/create")}>
            <Plus className="h-4 w-4" />
            Создать задание
          </button>
        </div>

        {assignments.length === 0 ? (
          <div className="m3-card flex flex-col items-center justify-center py-16 px-6">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-5">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">Нет заданий</h3>
            <p className="text-muted-foreground mb-6">Создайте первое задание для ваших учеников</p>
            <button className="m3-filled-btn" onClick={() => navigate("/teacher/create")}>
              <Plus className="h-4 w-4" />
              Создать задание
            </button>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {assignments.map((assignment) => (
              <div key={assignment.id} className={`m3-card p-6 flex flex-col gap-4 ${!assignment.is_active ? "opacity-55" : ""}`}>
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1 min-w-0">
                    <h3 className="text-lg font-medium truncate">{assignment.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {assignment.description || "Без описания"}
                    </p>
                  </div>
                  <Badge variant={assignment.type === "test" ? "default" : "secondary"} className="rounded-full ml-2 shrink-0">
                    {assignment.type === "test" ? "Тест" : "Вопрос"}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Код:</span>
                    <code className="bg-secondary text-secondary-foreground px-2.5 py-1 rounded-full text-sm font-mono">
                      {assignment.access_code}
                    </code>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyAccessCode(assignment.access_code)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleAssignmentStatus(assignment.id, assignment.is_active)}>
                    {assignment.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </Button>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Users className="h-4 w-4" />
                    <span>{assignment.response_count} ответов</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <FileText className="h-4 w-4" />
                    <span>{(assignment.questions as unknown[]).length} вопросов</span>
                  </div>
                </div>

                <button
                  className="m3-tonal-btn w-full text-sm"
                  onClick={() => navigate(`/teacher/assignment/${assignment.id}`)}
                >
                  Просмотреть ответы
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default TeacherDashboard;
