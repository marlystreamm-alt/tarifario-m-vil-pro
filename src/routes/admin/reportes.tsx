import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/admin/reportes")() ({
  head: () => ({
    meta: [
      { title: "Reportes — MA² Digital" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminReportes,
});

function AdminReportes() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-xl px-4 py-4 flex items-center gap-3">
          <Link to="/admin/dashboard" className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-secondary">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-lg font-bold">Reportes</h1>
        </div>
      </header>
      <main className="mx-auto max-w-xl px-4 pb-16 pt-4">
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">TODO: Reportes y análisis - Conectar a Supabase</p>
        </div>
      </main>
    </div>
  );
}