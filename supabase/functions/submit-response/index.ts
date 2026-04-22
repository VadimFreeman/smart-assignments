import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { assignment_id, student_name, answers } = await req.json();

    if (!assignment_id || !student_name || !answers) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate assignment_id is a UUID
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (typeof assignment_id !== "string" || !UUID_RE.test(assignment_id)) {
      return new Response(
        JSON.stringify({ error: "Invalid assignment_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate answers is a bounded array of well-formed entries
    if (!Array.isArray(answers) || answers.length === 0 || answers.length > 100) {
      return new Response(
        JSON.stringify({ error: "Invalid answers format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    for (const a of answers as any[]) {
      if (
        !a ||
        typeof a.questionId !== "string" ||
        a.questionId.length === 0 ||
        a.questionId.length > 200 ||
        typeof a.answer !== "string" ||
        a.answer.length > 5000
      ) {
        return new Response(
          JSON.stringify({ error: "Invalid answer entry" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const trimmedName = String(student_name).trim().slice(0, 100);
    if (trimmedName.length === 0) {
      return new Response(
        JSON.stringify({ error: "Student name cannot be empty" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch full assignment with correct answers (server-side only)
    const { data: assignment, error: fetchError } = await supabase
      .from("assignments")
      .select("id, type, questions, is_active")
      .eq("id", assignment_id)
      .eq("is_active", true)
      .single();

    if (fetchError || !assignment) {
      return new Response(
        JSON.stringify({ error: "Assignment not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate score server-side for tests
    let score: number | null = null;
    let maxScore: number | null = null;

    if (assignment.type === "test") {
      const questions = assignment.questions as any[];
      maxScore = questions.length;
      score = 0;

      for (const question of questions) {
        if (!question.options) continue;
        const studentAnswer = (answers as any[]).find(
          (a: any) => a.questionId === question.id
        );
        if (!studentAnswer) continue;

        const correctOption = question.options.find((o: any) => o.isCorrect);
        if (correctOption && studentAnswer.answer === correctOption.id) {
          score++;
        }
      }
    }

    // Insert response
    const { error: insertError } = await supabase
      .from("student_responses")
      .insert({
        assignment_id,
        student_name: trimmedName,
        answers,
        score,
        max_score: maxScore,
      });

    if (insertError) {
      if (insertError.code === "23505") {
        return new Response(
          JSON.stringify({ error: "You have already submitted a response for this assignment" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw insertError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        score,
        max_score: maxScore,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
