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
    const { access_code, assignment_id } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let query = supabase
      .from("assignments")
      .select("id, title, description, type, questions, is_active");

    if (assignment_id) {
      query = query.eq("id", assignment_id).eq("is_active", true);
    } else if (access_code) {
      const code = String(access_code).toUpperCase().trim().slice(0, 6);
      if (!/^[A-Z0-9]{1,6}$/.test(code)) {
        return new Response(
          JSON.stringify({ error: "Invalid access code format" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      query = query.eq("access_code", code).eq("is_active", true);
    } else {
      return new Response(
        JSON.stringify({ error: "access_code or assignment_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data, error } = await query.single();

    if (error || !data) {
      return new Response(
        JSON.stringify({ error: "Assignment not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Strip isCorrect from test questions so students can't cheat
    const sanitizedQuestions = (data.questions as any[]).map((q: any) => {
      if (q.options) {
        return {
          ...q,
          options: q.options.map((opt: any) => ({
            id: opt.id,
            text: opt.text,
            // isCorrect is intentionally removed
          })),
        };
      }
      return q;
    });

    return new Response(
      JSON.stringify({
        id: data.id,
        title: data.title,
        description: data.description,
        type: data.type,
        questions: sanitizedQuestions,
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
