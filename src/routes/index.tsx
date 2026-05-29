import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { BookOpen, Search, Sparkles, Library } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ScholarBot — AI Pencari Referensi Akademik" },
      { name: "description", content: "Cari, rangkum, dan kelola referensi buku & jurnal dari OpenAlex, CrossRef, arXiv, DOAJ, Scholar, dan Sinta dalam satu chatbot AI." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen">
      <header className="container mx-auto flex items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" />
          <span className="font-serif text-xl">ScholarBot</span>
        </div>
        <Link to="/login"><Button variant="outline">Masuk</Button></Link>
      </header>

      <main className="container mx-auto px-6 py-20 text-center">
        <h1 className="mx-auto max-w-3xl text-5xl font-serif leading-tight md:text-6xl">
          Cari referensi <span className="text-primary">jurnal & buku</span> dengan AI
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Satu chatbot, banyak sumber: OpenAlex, CrossRef, arXiv, DOAJ, Google Scholar, dan Sinta.
          Dapatkan rangkuman, rekomendasi, dan sitasi siap pakai.
        </p>
        <div className="mt-10 flex justify-center gap-3">
          <Link to="/login"><Button size="lg" className="text-base">Mulai gratis</Button></Link>
        </div>

        <div className="mx-auto mt-24 grid max-w-5xl gap-6 md:grid-cols-3">
          {[
            { icon: Search, title: "Pencarian multi-sumber", desc: "Satu kueri, hasil dari OpenAlex, CrossRef, arXiv, DOAJ, dan lainnya." },
            { icon: Sparkles, title: "Rangkuman AI", desc: "AI merangkum hasil & menyarankan referensi paling relevan." },
            { icon: Library, title: "Koleksi & sitasi", desc: "Simpan referensi ke koleksi, ekspor APA, IEEE, atau BibTeX." },
          ].map((f) => (
            <div key={f.title} className="rounded-xl border border-border bg-card/50 p-6 text-left backdrop-blur">
              <f.icon className="h-8 w-8 text-primary" />
              <h3 className="mt-4 font-serif text-xl">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="container mx-auto px-6 py-10 text-center text-sm text-muted-foreground">
        © 2026 ScholarBot
      </footer>
    </div>
  );
}
