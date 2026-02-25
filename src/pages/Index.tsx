import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { BookOpen, GraduationCap } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const [accessCode, setAccessCode] = useState("");
  const [studentName, setStudentName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleStudentAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!accessCode.trim() || !studentName.trim()) {
      toast({
        title: "Ошибка",
        description: "Пожалуйста, введите код задания и ваше имя",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("get-assignment", {
        body: { access_code: accessCode.toUpperCase().trim() },
      });

      if (error || !data || data.error) {
        toast({
          title: "Ошибка",
          description: "Задание с таким кодом не найдено",
          variant: "destructive",
        });
        return;
      }

      // Store student info in sessionStorage for the assignment page
      sessionStorage.setItem("studentName", studentName.trim());
      navigate(`/assignment/${data.id}`);
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Произошла ошибка при поиске задания",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen geo-bg flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <BookOpen className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Учебная платформа
          </h1>
          <p className="text-muted-foreground">
            Выполняйте задания и тесты онлайн
          </p>
        </div>

        {/* Student Access Form - Liquid Glass Card */}
        <div className="liquid-glass-card p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Вход для учеников
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Введите код задания от учителя
            </p>
          </div>
          <form onSubmit={handleStudentAccess} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="accessCode">Код задания</Label>
              <Input
                id="accessCode"
                placeholder="Например: ABC123"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="text-center text-lg tracking-widest uppercase bg-white/60 backdrop-blur-sm border-white/40"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="studentName">Ваше имя</Label>
              <Input
                id="studentName"
                placeholder="Введите ваше имя"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                maxLength={100}
                className="bg-white/60 backdrop-blur-sm border-white/40"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="liquid-glass-btn w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Загрузка..." : "Начать задание"}
            </button>
          </form>
        </div>

        {/* Teacher Link */}
        <div className="text-center">
          <Button
            variant="link"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => navigate("/teacher/login")}
          >
            Вход для учителей
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
