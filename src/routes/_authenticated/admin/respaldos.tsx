import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Download, Upload, CloudCog, ShieldAlert, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { useSecurityContext } from "@/hooks/use-security";
import { useStepUp } from "@/components/StepUpDialog";
import { ROLE_LABEL } from "@/lib/security-shared";

export const Route = createFileRoute("/_authenticated/admin/respaldos")({
  head: () => ({
    meta: [
      { title: "Respaldos — MA² Digital" },
      { name: "description", content: "Exportación y restauración de respaldos con verificación en dos pasos." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BackupsPage,
});

/** Claves locales que forman el respaldo exportable del dispositivo. */
const LOCAL_KEYS = [
  "ma2-deliveries-v1",
  "ma2-deliveries-folio-v1",
  "ma2-users-v1",
  "ma2-announcements-v1",
  "ma2-prices-v1",
  "ma2-favs-v1",
  "ma2-orders-v1",
];

function collectBackup() {
  const payload: Record<string, unknown> = {};
  for (const k of LOCAL_KEYS) {
    const raw = localStorage.getItem(k);
    if (raw) payload[k] = raw;
  }
  return { version: 1, exportedAt: new Date().toISOString(), data: payload };
}

function BackupsPage() {
  const { data: ctx } = useSecurityContext();
  const { request, dialog } = useStepUp();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const isSuper = ctx?.role === "superadmin";

  async function onExport() {
    setBusy(true);
    const ok = await request("backup_export");
    setBusy(false);
    if (!ok) {
      toast.error("Solo el Superadministrador con segundo factor reciente puede exportar respaldos.");
      return;
    }
    const blob = new Blob([JSON.stringify(collectBackup(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ma2-respaldo-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Respaldo exportado. Guárdalo en un lugar seguro.");
  }

  async function onRestoreFile(file: File) {
    const ok = await request("backup_restore", { fileName: file.name });
    if (!ok) {
      toast.error("Restauración no autorizada.");
      return;
    }
    try {
      const parsed = JSON.parse(await file.text()) as { data?: Record<string, string> };
      if (!parsed?.data) throw new Error("formato");
      for (const [k, v] of Object.entries(parsed.data)) {
        if (LOCAL_KEYS.includes(k) && typeof v === "string") localStorage.setItem(k, v);
      }
      toast.success("Respaldo restaurado. Recarga la aplicación para ver los datos.");
    } catch {
      toast.error("El archivo no es un respaldo válido de MA² Digital.");
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-4 px-4 py-5">
      {dialog}
      <header>
        <h1 className="text-xl font-bold">Respaldos</h1>
        <p className="text-xs text-muted-foreground">
          Cada exportación o restauración exige verificación en dos pasos reciente.
          {ctx && ` Tu rol: ${ROLE_LABEL[ctx.role]}.`}
        </p>
      </header>

      {!isSuper && (
        <div className="flex gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          Solo el Superadministrador puede exportar o restaurar respaldos completos.
        </div>
      )}

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-bold">Exportación local iniciada por ti</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Descarga un archivo JSON con la información guardada en este dispositivo.
        </p>
        <button
          onClick={() => void onExport()}
          disabled={busy || !isSuper}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          <Download className="h-4 w-4" /> Exportar respaldo
        </button>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-bold">Restaurar desde archivo</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          La restauración sobrescribe los datos actuales de este dispositivo.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onRestoreFile(f);
            e.target.value = "";
          }}
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={!isSuper}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
        >
          <Upload className="h-4 w-4" /> Restaurar respaldo
        </button>
      </section>

      <section className="rounded-2xl border border-dashed border-border bg-secondary/30 p-4">
        <div className="flex items-center gap-2">
          <CloudCog className="h-5 w-5 text-primary" />
          <h2 className="text-sm font-bold">Respaldo automático en servidor y nube</h2>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Interfaz preparada. Al mover los datos a la base de datos se activará el respaldo
          programado en servidor, con historial de versiones y restauración auditada.
        </p>
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-background p-3">
          <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="text-[11px] text-muted-foreground">
            Limitación real del navegador: un sitio web o PWA no puede copiar archivos de forma
            silenciosa a una carpeta de Android o iPhone. La descarga siempre la inicias tú y el
            sistema decide dónde guardarla.
          </p>
        </div>
      </section>
    </div>
  );
}
