import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { BookOpen, ArrowLeft } from "lucide-react";
import { z } from "zod";

const emailSchema = z.string().email("Введите корректный email");
const passwordSchema = z.string().min(6, "Пароль должен содержать минимум 6 символов");

const TeacherLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; fullName?: string }>({});

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        navigate("/teacher/dashboard");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        navigate("/teacher/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const validateForm = (isSignup: boolean) => {
    const newErrors: { email?: string; password?: string; fullName?: string } = {};
    
    try { emailSchema.parse(email); } catch (e) {
      if (e instanceof z.ZodError) newErrors.email = e.errors[0].message;
    }
    try { passwordSchema.parse(password); } catch (e) {
      if (e instanceof z.ZodError) newErrors.password = e.errors[0].message;
    }
    if (isSignup && !fullName.trim()) newErrors.fullName = "Введите ваше имя";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm(false)) return;
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        toast({ title: "Ошибка входа", description: error.message === "Invalid login credentials" ? "Неверный email или пароль" : error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Успешно!", description: "Вы вошли в систему" });
      navigate("/teacher/dashboard");
    } catch {
      toast({ title: "Ошибка", description: "Произошла ошибка при входе", variant: "destructive" });
    } finally { setIsLoading(false); }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm(true)) return;
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(), password,
        options: { emailRedirectTo: `${window.location.origin}/teacher/dashboard`, data: { full_name: fullName.trim() } },
      });
      if (error) {
        toast({ title: "Ошибка регистрации", description: error.message.includes("already registered") ? "Этот email уже зарегистрирован. Попробуйте войти." : error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Регистрация успешна!", description: "Проверьте вашу почту для подтверждения аккаунта" });
    } catch {
      toast({ title: "Ошибка", description: "Произошла ошибка при регистрации", variant: "destructive" });
    } finally { setIsLoading(false); }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <Button variant="ghost" className="gap-2" onClick={() => navigate("/")}>
          <ArrowLeft className="h-4 w-4" />
          На главную
        </Button>

        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="w-14 h-14 rounded-full bg-primary/12 flex items-center justify-center">
              <BookOpen className="h-7 w-7 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-medium tracking-tight text-foreground">
            Вход для учителей
          </h1>
        </div>

        <div className="m3-card p-6">
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2 rounded-full">
              <TabsTrigger value="login" className="rounded-full">Вход</TabsTrigger>
              <TabsTrigger value="signup" className="rounded-full">Регистрация</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4 pt-5">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input id="login-email" type="email" placeholder="teacher@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                  {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Пароль</Label>
                  <Input id="login-password" type="password" placeholder="Введите пароль" value={password} onChange={(e) => setPassword(e.target.value)} />
                  {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                </div>
                <button type="submit" className="m3-filled-btn w-full" disabled={isLoading}>
                  {isLoading ? (
                    <><span className="m3-loader m3-loader-sm" style={{ borderTopColor: "hsl(var(--primary-foreground))" }} />Загрузка...</>
                  ) : "Войти"}
                </button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4 pt-5">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Ваше имя</Label>
                  <Input id="signup-name" placeholder="Иван Иванов" value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={100} />
                  {errors.fullName && <p className="text-sm text-destructive">{errors.fullName}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input id="signup-email" type="email" placeholder="teacher@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                  {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Пароль</Label>
                  <Input id="signup-password" type="password" placeholder="Минимум 6 символов" value={password} onChange={(e) => setPassword(e.target.value)} />
                  {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                </div>
                <button type="submit" className="m3-filled-btn w-full" disabled={isLoading}>
                  {isLoading ? (
                    <><span className="m3-loader m3-loader-sm" style={{ borderTopColor: "hsl(var(--primary-foreground))" }} />Загрузка...</>
                  ) : "Зарегистрироваться"}
                </button>
              </form>
            </TabsContent>
          </Tabs>
        </div>

        {import.meta.env.DEV && (
          <div className="m3-card p-4 border-dashed">
            <p className="text-sm text-muted-foreground text-center">
              Тестовый аккаунт: <span className="font-mono">admin@admin.com</span> / <span className="font-mono">admin</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherLogin;
