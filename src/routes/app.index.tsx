import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { createChat, chatComplete } from "@/lib/scholarbot.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Search } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/")({
  component: NewChat,
});

const SUGGESTIONS = [
  "Penelitian terbaru tentang large language models untuk pendidikan",
  "Dampak perubahan iklim terhadap pertanian di Indonesia",
  "Machine learning untuk diagnosis kanker payudara",
  "Studi literatur metode pembelajaran problem based learning",
];

function NewChat() {
  const createChatFn = useServerFn(createChat);
  const chatFn = useServerFn(chatComplete);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  const start = async (q: string) => {
    if (!q.trim() || busy) return;
    setBusy(true);
    try {
      const chat = await createChatFn({ data: { title: q.slice(0, 80) } });
      await chatFn({ data: { chatId: chat.id, message: q } });
      qc.invalidateQueries({ queryKey: ["chats"] });
      navigate({ to: "/app/$chatId", params: { chatId: chat.id } });
    } catch (e: any) {
      toast.error(e.message || "Gagal memulai chat");
      setBusy(false);
    }
  };

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <Sparkles className="w-10 h-10 text-accent mx-auto mb-4" />
          <h1 className="font-serif text-4xl text-foreground">Cari referensi akademik</h1>
          <p className="text-muted-foreground mt-2">
            Ditenagai OpenAlex, CrossRef, arXiv, dan DOAJ — semuanya gratis.
          </p>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); start(input); }}
          className="relative"
        >
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); start(input); }
            }}
            placeholder="Contoh: pengaruh AI generatif terhadap proses belajar mahasiswa…"
            className="min-h-[120px] resize-none bg-card border-border/60 text-base"
            disabled={busy}
          />
          <Button
            type="submit" disabled={busy || !input.trim()}
            className="absolute bottom-3 right-3 bg-accent text-accent-foreground hover:bg-accent/90"
          >
            <Search className="w-4 h-4 mr-2" />
            {busy ? "Mencari…" : "Cari"}
          </Button>
        </form>

        <div className="mt-8">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Saran</p>
          <div className="grid sm:grid-cols-2 gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s} onClick={() => start(s)} disabled={busy}
                className="text-left p-3 rounded-md border border-border/60 bg-card/50 hover:border-accent/50 hover:bg-card text-sm transition disabled:opacity-50"
              >{s}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
