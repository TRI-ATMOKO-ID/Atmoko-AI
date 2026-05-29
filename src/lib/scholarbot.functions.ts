import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { searchAllSources } from "./search.server";
import { formatCitation } from "./citation";

export const searchReferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      query: z.string().min(1).max(500),
      yearFrom: z.number().int().optional(),
      yearTo: z.number().int().optional(),
      language: z.string().max(10).optional(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const results = await searchAllSources(data.query, {
      yearFrom: data.yearFrom,
      yearTo: data.yearTo,
      language: data.language,
    });
    return { results };
  });

export const chatComplete = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      chatId: z.string().uuid(),
      message: z.string().min(1).max(2000),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Save user message
    await supabase.from("messages").insert({
      chat_id: data.chatId, user_id: userId, role: "user", content: data.message,
    });

    // Load prior context (last 10 messages)
    const { data: history } = await supabase
      .from("messages")
      .select("role,content")
      .eq("chat_id", data.chatId)
      .order("created_at", { ascending: true })
      .limit(20);

    // Search references first (always)
    const refs = await searchAllSources(data.message, { limit: 6 });

    // Ask AI to summarize & recommend
    const apiKey = process.env.LOVABLE_API_KEY;
    let aiText = "";
    if (apiKey && refs.length) {
      const refSummary = refs.slice(0, 8).map((r, i) =>
        `[${i + 1}] ${r.title} — ${r.authors.slice(0, 3).join(", ")}${r.year ? ` (${r.year})` : ""}. ${r.venue ?? ""}. Sumber: ${r.source}. ${r.abstract ? r.abstract.slice(0, 300) : ""}`
      ).join("\n\n");

      const sysMsg = `Anda adalah asisten pencari referensi akademik berbahasa Indonesia. Anda diberi daftar referensi hasil pencarian. Tugas Anda: (1) merangkum tema umum hasil, (2) merekomendasikan 3-5 referensi paling relevan dengan alasan singkat dan kutipan nomor [n], (3) sarankan kata kunci tambahan. Gunakan markdown, ringkas.`;

      const userMsg = `Pertanyaan user: "${data.message}"\n\nHasil pencarian:\n${refSummary}`;

      try {
        const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: sysMsg },
              ...(history || []).slice(-6).map((m) => ({ role: m.role, content: m.content })),
              { role: "user", content: userMsg },
            ],
          }),
        });
        if (resp.ok) {
          const j = await resp.json();
          aiText = j.choices?.[0]?.message?.content ?? "";
        } else if (resp.status === 429) aiText = "_Batas penggunaan AI tercapai sementara. Hasil pencarian tetap ditampilkan._";
        else if (resp.status === 402) aiText = "_Kredit AI habis. Silakan tambahkan kredit di Settings → Workspace → Usage._";
        else aiText = "_AI tidak tersedia saat ini._";
      } catch (e) {
        console.error("AI error", e);
        aiText = "_AI tidak tersedia saat ini._";
      }
    } else if (!refs.length) {
      aiText = "Maaf, tidak ditemukan referensi untuk kueri tersebut. Coba kata kunci yang lebih spesifik atau dalam bahasa Inggris.";
    }

    // Save assistant message
    const { data: saved } = await supabase.from("messages").insert({
      chat_id: data.chatId,
      user_id: userId,
      role: "assistant",
      content: aiText,
      results: refs as any,
    }).select().single();

    // Update chat title from first message if still default
    await supabase
      .from("chats")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", data.chatId);

    return { reply: aiText, references: refs, messageId: saved?.id };
  });

export const createChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ title: z.string().max(200).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: chat, error } = await supabase
      .from("chats")
      .insert({ user_id: userId, title: data.title || "Percakapan baru" })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return chat;
  });

export const saveReference = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      title: z.string(),
      authors: z.array(z.string()),
      year: z.number().int().optional(),
      venue: z.string().optional(),
      abstract: z.string().optional(),
      doi: z.string().optional(),
      url: z.string().optional(),
      source: z.string(),
      citations_count: z.number().int().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("saved_references").insert({
      ...data, user_id: context.userId, raw: data as any,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const exportCitation = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      ref: z.object({
        title: z.string(), authors: z.array(z.string()),
        year: z.number().int().optional(), venue: z.string().optional(),
        doi: z.string().optional(), url: z.string().optional(),
      }),
      format: z.enum(["apa", "ieee", "vancouver", "bibtex"]),
    }).parse(d),
  )
  .handler(async ({ data }) => ({ citation: formatCitation(data.ref, data.format) }));
