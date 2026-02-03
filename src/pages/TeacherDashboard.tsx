import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
      fetchAssignments();
    }
  }, [user]);

  const fetchAssignments = async () => {
    try {
      const { data: assignmentsData, error } = await supabase
        .from("assignments")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch response counts for each assignment
      const assignmentsWithCounts = await Promise.all(
        (assignmentsData || []).map(async (assignment) => {
          const { count } = await supabase
            .from("student_responses")
            .select("*", { count: "exact", head: true })
            .eq("assignment_id", assignment.id);
          
          return {
            ...assignment,
            questions: assignment.questions as unknown[],
            response_count: count || 0,
          };
        })
      );

      setAssignments(assignmentsWithCounts);
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить задания",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const copyAccessCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Скопировано!",
      description: `Код ${code} скопирован в буфер обмена`,
    });
  };

  const toggleAssignmentStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("assignments")
        .update({ is_active: !currentStatus })
        .eq("id", id);

      if (error) throw error;

      setAssignments(assignments.map(a => 
        a.id === id ? { ...a, is_active: !currentStatus } : a
      ));

      toast({
        title: "Успешно!",
        description: `Задание ${!currentStatus ? "активировано" : "деактивировано"}`,
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось изменить статус задания",
        variant: "destructive",
      });
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
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold">Панель учителя</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:block">
              {user?.email}
            </span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Выйти
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold">Мои задания</h2>
          <Button onClick={() => navigate("/teacher/create")}>
            <Plus className="h-4 w-4 mr-2" />
            Создать задание
          </Button>
        </div>

        {assignments.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Нет заданий</h3>
              <p className="text-muted-foreground mb-4">
                Создайте первое задание для ваших учеников
              </p>
              <Button onClick={() => navigate("/teacher/create")}>
                <Plus className="h-4 w-4 mr-2" />
                Создать задание
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {assignments.map((assignment) => (
              <Card key={assignment.id} className={!assignment.is_active ? "opacity-60" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{assignment.title}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {assignment.description || "Без описания"}
                      </CardDescription>
                    </div>
                    <Badge variant={assignment.type === "test" ? "default" : "secondary"}>
                      {assignment.type === "test" ? "Тест" : "Вопрос"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Код:</span>
                      <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                        {assignment.access_code}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => copyAccessCode(assignment.access_code)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => toggleAssignmentStatus(assignment.id, assignment.is_active)}
                    >
                      {assignment.is_active ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{assignment.response_count} ответов</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      <span>{(assignment.questions as unknown[]).length} вопросов</span>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate(`/teacher/assignment/${assignment.id}`)}
                  >
                    Просмотреть ответы
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default TeacherDashboard;
