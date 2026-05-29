import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { supabase } from "@/integrations/supabase/client";
import { chatComplete } from "@/lib/scholarbot.functions";
import { ReferenceCard } from "@/components/reference-card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Reference } from "@/lib/search.server";

export const Route = createFileRoute("/app/$chatId")({
  component: ChatView,
});

type Msg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  results: Reference[] | null;
  created_at: string;
};

function ChatView() {
  const { chatId } = Route.useParams();
  const qc = useQueryClient();
  const chatFn = useServerFn(chatComplete);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const { data: messages } = useQuery({
    queryKey: ["messages", chatId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("id,role,content,results,created_at")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Msg[];
    },
  });

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setBusy(true);
    try {
      await chatFn({ data: { chatId, message: text } });
      await qc.invalidateQueries({ queryKey: ["messages", chatId] });
      qc.invalidateQueries({ queryKey: ["chats"] });
    } catch (e: any) {
      toast.error(e.message || "Gagal mengirim pesan");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          {(messages ?? []).map((m) => (
            <div key={m.id}>
              {m.role === "user" ? (
                <div className="flex justify-end">
                  <div className="rounded-xl bg-primary/15 border border-primary/30 px-4 py-2 max-w-[85%]">
                    <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {m.content && (
                    <div className="prose prose-sm prose-invert max-w-none text-foreground">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                    </div>
                  )}
                  {m.results && m.results.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">
                        {m.results.length} referensi ditemukan
                      </p>
                      {m.results.map((r, i) => (
                        <ReferenceCard key={`${m.id}-${i}`} reference={r} index={i} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          {busy && (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Mencari referensi & merangkum…
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      <div className="border-t border-border/60 bg-background/80 backdrop-blur">
        <div className="max-w-3xl mx-auto p-4">
          <form onSubmit={(e) => { e.preventDefault(); send(); }} className="relative">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
              }}
              placeholder="Tanyakan topik atau kata kunci…"
              className="min-h-[60px] resize-none pr-14 bg-card border-border/60"
              disabled={busy}
            />
            <Button
              type="submit" size="icon" disabled={busy || !input.trim()}
              className="absolute bottom-2 right-2 bg-accent text-accent-foreground hover:bg-accent/90"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
