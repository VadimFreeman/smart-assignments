import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Trash2, GripVertical } from "lucide-react";
import { User, Session } from "@supabase/supabase-js";

interface Question {
  id: string;
  text: string;
  options: { id: string; text: string; isCorrect: boolean }[];
}

const CreateAssignment = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"test" | "open_question">("test");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [openQuestionText, setOpenQuestionText] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const addQuestion = () => {
    const newQuestion: Question = {
      id: generateId(),
      text: "",
      options: [
        { id: generateId(), text: "", isCorrect: false },
        { id: generateId(), text: "", isCorrect: false },
      ],
    };
    setQuestions([...questions, newQuestion]);
  };

  const removeQuestion = (questionId: string) => {
    setQuestions(questions.filter(q => q.id !== questionId));
  };

  const updateQuestionText = (questionId: string, text: string) => {
    setQuestions(questions.map(q => 
      q.id === questionId ? { ...q, text } : q
    ));
  };

  const addOption = (questionId: string) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId && q.options.length < 6) {
        return {
          ...q,
          options: [...q.options, { id: generateId(), text: "", isCorrect: false }],
        };
      }
      return q;
    }));
  };

  const removeOption = (questionId: string, optionId: string) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId && q.options.length > 2) {
        return {
          ...q,
          options: q.options.filter(o => o.id !== optionId),
        };
      }
      return q;
    }));
  };

  const updateOptionText = (questionId: string, optionId: string, text: string) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        return {
          ...q,
          options: q.options.map(o => 
            o.id === optionId ? { ...o, text } : o
          ),
        };
      }
      return q;
    }));
  };

  const toggleCorrectAnswer = (questionId: string, optionId: string) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        return {
          ...q,
          options: q.options.map(o => 
            o.id === optionId ? { ...o, isCorrect: !o.isCorrect } : o
          ),
        };
      }
      return q;
    }));
  };

  const generateAccessCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast({
        title: "Ошибка",
        description: "Введите название задания",
        variant: "destructive",
      });
      return;
    }

    if (type === "test") {
      if (questions.length === 0) {
        toast({
          title: "Ошибка",
          description: "Добавьте хотя бы один вопрос",
          variant: "destructive",
        });
        return;
      }

      for (const q of questions) {
        if (!q.text.trim()) {
          toast({
            title: "Ошибка",
            description: "Заполните текст всех вопросов",
            variant: "destructive",
          });
          return;
        }

        const filledOptions = q.options.filter(o => o.text.trim());
        if (filledOptions.length < 2) {
          toast({
            title: "Ошибка",
            description: "Каждый вопрос должен иметь минимум 2 варианта ответа",
            variant: "destructive",
          });
          return;
        }

        const hasCorrect = q.options.some(o => o.isCorrect && o.text.trim());
        if (!hasCorrect) {
          toast({
            title: "Ошибка",
            description: "Отметьте правильный ответ для каждого вопроса",
            variant: "destructive",
          });
          return;
        }
      }
    } else {
      if (!openQuestionText.trim()) {
        toast({
          title: "Ошибка",
          description: "Введите текст вопроса",
          variant: "destructive",
        });
        return;
      }
    }

    setIsLoading(true);

    try {
      const accessCode = generateAccessCode();
      
      const questionsData = type === "test" 
        ? questions.map(q => ({
            id: q.id,
            text: q.text,
            options: q.options.filter(o => o.text.trim()),
          }))
        : [{ id: generateId(), text: openQuestionText, type: "open" }];

      const { error } = await supabase
        .from("assignments")
        .insert({
          teacher_id: user?.id,
          title: title.trim(),
          description: description.trim() || null,
          type,
          access_code: accessCode,
          questions: questionsData,
        });

      if (error) throw error;

      toast({
        title: "Задание создано!",
        description: `Код для учеников: ${accessCode}`,
      });

      navigate("/teacher/dashboard");
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось создать задание",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

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
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="text-2xl font-bold mb-8">Создание задания</h1>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Основная информация</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Название задания *</Label>
                <Input
                  id="title"
                  placeholder="Например: Контрольная работа по математике"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={200}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Описание (необязательно)</Label>
                <Textarea
                  id="description"
                  placeholder="Дополнительные инструкции для учеников..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={1000}
                />
              </div>
            </CardContent>
          </Card>

          {/* Assignment Type */}
          <Card>
            <CardHeader>
              <CardTitle>Тип задания</CardTitle>
              <CardDescription>
                Выберите формат задания
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={type}
                onValueChange={(value) => setType(value as "test" | "open_question")}
                className="grid grid-cols-2 gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="test" id="test" />
                  <Label htmlFor="test" className="cursor-pointer">
                    Тест с вариантами ответов
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="open_question" id="open_question" />
                  <Label htmlFor="open_question" className="cursor-pointer">
                    Открытый вопрос
                  </Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Questions */}
          {type === "test" ? (
            <Card>
              <CardHeader>
                <CardTitle>Вопросы теста</CardTitle>
                <CardDescription>
                  Добавьте вопросы и варианты ответов
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {questions.map((question, qIndex) => (
                  <div
                    key={question.id}
                    className="border rounded-lg p-4 space-y-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <GripVertical className="h-5 w-5" />
                        <span className="font-medium">Вопрос {qIndex + 1}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeQuestion(question.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>

                    <Input
                      placeholder="Текст вопроса"
                      value={question.text}
                      onChange={(e) => updateQuestionText(question.id, e.target.value)}
                      maxLength={500}
                    />

                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">
                        Варианты ответов (отметьте правильные)
                      </Label>
                      {question.options.map((option, oIndex) => (
                        <div key={option.id} className="flex items-center gap-2">
                          <Checkbox
                            checked={option.isCorrect}
                            onCheckedChange={() => toggleCorrectAnswer(question.id, option.id)}
                          />
                          <Input
                            placeholder={`Вариант ${oIndex + 1}`}
                            value={option.text}
                            onChange={(e) => updateOptionText(question.id, option.id, e.target.value)}
                            className="flex-1"
                            maxLength={200}
                          />
                          {question.options.length > 2 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeOption(question.id, option.id)}
                            >
                              <Trash2 className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          )}
                        </div>
                      ))}
                      {question.options.length < 6 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => addOption(question.id)}
                          className="mt-2"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Добавить вариант
                        </Button>
                      )}
                    </div>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  onClick={addQuestion}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить вопрос
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Вопрос</CardTitle>
                <CardDescription>
                  Введите вопрос, на который ученики дадут развёрнутый ответ
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Например: Опишите главную мысль произведения..."
                  value={openQuestionText}
                  onChange={(e) => setOpenQuestionText(e.target.value)}
                  rows={4}
                  maxLength={1000}
                />
              </CardContent>
            </Card>
          )}

          {/* Submit */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/teacher/dashboard")}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Создание..." : "Создать задание"}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default CreateAssignment;
