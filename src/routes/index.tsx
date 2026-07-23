import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { SERVICES, EDIT_PASSWORD, type Service } from "@/lib/services-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tarifario MA² — Trámites" },
      { name: "description", content: "Tarifario de trámites MA²: precios, categorías y modo edición para vendedoras." },
      { property: "og:title", content: "Tarifario MA² — Trámites" },
      { property: "og:description", content: "Precios de 88 trámites organizados por categorías, con modo edición protegido." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "theme-color", content: "#8b5cf6" },
    ],
  }),
  component: Index,
});

type PriceMap = Record<number, { rev: string; pub: string }>;
type ViewMode = "all" | "cost" | "rev" | "pub";

const STORAGE_KEY = "tarifario-ma2-precios-v1";

function loadPrices(): PriceMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function isBlocked(s: Service) {
  return s.status === "No ofrecer";
}
function hasWarning(s: Service) {
  return s.status !== "Disponible" && s.status !== "No ofrecer";
}

function Index() {
  const [prices, setPrices] = useState<PriceMap>({});
  const [hydrated, setHydrated] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [askingPw, setAskingPw] = useState(false);
  const [pwInput, setPwInput] = useState("");
  const [pwError, setPwError] = useState("");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<ViewMode>("all");
  const [openCats, setOpenCats] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setPrices(loadPrices());
    setHydrated(true);
  }, []);

  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    const map = new Map<string, Service[]>();
    for (const s of SERVICES) {
      if (q && !s.name.toLowerCase().includes(q)) continue;
      if (!map.has(s.category)) map.set(s.category, []);
      map.get(s.category)!.push(s);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0], "es"));
  }, [search]);

  useEffect(() => {
    if (search.trim()) {
      const all: Record<string, boolean> = {};
      grouped.forEach(([c]) => (all[c] = true));
      setOpenCats(all);
    }
  }, [search, grouped]);

  function toggleCat(c: string) {
    setOpenCats((o) => ({ ...o, [c]: !o[c] }));
  }

  function updatePrice(id: number, field: "rev" | "pub", value: string) {
    setPrices((p) => ({
      ...p,
      [id]: { rev: p[id]?.rev ?? "", pub: p[id]?.pub ?? "", [field]: value },
    }));
  }

  function savePrices() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prices));
    setEditMode(false);
  }

  function restorePrices() {
    if (!confirm("¿Restaurar todos los precios? Se borrarán los valores capturados.")) return;
    localStorage.removeItem(STORAGE_KEY);
    setPrices({});
  }

  function tryEnterEdit() {
    setAskingPw(true);
    setPwInput("");
    setPwError("");
  }

  function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    if (pwInput === EDIT_PASSWORD) {
      setEditMode(true);
      setAskingPw(false);
    } else {
      setPwError("Contraseña incorrecta");
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto max-w-xl px-4 pt-4 pb-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold tracking-tight">
                Tarifario <span className="text-primary">MA²</span>
              </h1>
              <p className="text-[11px] text-muted-foreground">Trámites · {SERVICES.length} servicios</p>
            </div>
            {editMode ? (
              <div className="flex shrink-0 gap-1.5">
                <button
                  onClick={restorePrices}
                  className="rounded-full border border-destructive/30 bg-background px-3 py-1.5 text-xs font-semibold text-destructive active:scale-95"
                >
                  Restaurar
                </button>
                <button
                  onClick={savePrices}
                  className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm active:scale-95"
                >
                  Guardar
                </button>
              </div>
            ) : (
              <button
                onClick={tryEnterEdit}
                className="shrink-0 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm active:scale-95"
              >
                Editar precios
              </button>
            )}
          </div>

          <div className="mt-3">
            <input
              type="search"
              inputMode="search"
              placeholder="Buscar trámite…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-full border border-border bg-secondary px-4 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="mt-2 flex gap-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {(
              [
                ["all", "Ver los 3"],
                ["cost", "Mi costo"],
                ["rev", "Revendedor"],
                ["pub", "Cliente final"],
              ] as [ViewMode, string][]
            ).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setView(k)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  view === k
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {editMode && (
            <div className="mt-2 rounded-md bg-accent px-3 py-1.5 text-[11px] font-medium text-accent-foreground">
              Modo edición activo
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-xl px-3 pb-24 pt-3">
        {grouped.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">Sin resultados</p>
        )}
        <div className="space-y-2">
          {grouped.map(([cat, items]) => {
            const open = !!openCats[cat];
            return (
              <section key={cat} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                <button
                  onClick={() => toggleCat(cat)}
                  className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left active:bg-secondary"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                      {items.length}
                    </span>
                    <span className="truncate text-sm font-semibold">{cat}</span>
                  </span>
                  <span
                    className={`shrink-0 text-primary transition-transform ${open ? "rotate-180" : ""}`}
                    aria-hidden
                  >
                    ▾
                  </span>
                </button>
                {open && (
                  <ul className="divide-y divide-border border-t border-border">
                    {items.map((s) => (
                      <ServiceRow
                        key={s.id}
                        s={s}
                        view={view}
                        editMode={editMode && !isBlocked(s)}
                        hydrated={hydrated}
                        rev={prices[s.id]?.rev ?? ""}
                        pub={prices[s.id]?.pub ?? ""}
                        onChange={updatePrice}
                      />
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      </main>

      {askingPw && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          onClick={() => setAskingPw(false)}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={submitPassword}
            className="w-full max-w-sm rounded-2xl bg-card p-5 shadow-xl"
          >
            <h2 className="text-base font-semibold">Contraseña de vendedora</h2>
            <p className="mt-1 text-xs text-muted-foreground">Introduce la contraseña para editar precios.</p>
            <input
              autoFocus
              type="password"
              inputMode="numeric"
              value={pwInput}
              onChange={(e) => {
                setPwInput(e.target.value);
                setPwError("");
              }}
              className="mt-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="••••"
            />
            {pwError && <p className="mt-2 text-xs text-destructive">{pwError}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAskingPw(false)}
                className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              >
                Entrar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function ServiceRow({
  s,
  view,
  editMode,
  hydrated,
  rev,
  pub,
  onChange,
}: {
  s: Service;
  view: ViewMode;
  editMode: boolean;
  hydrated: boolean;
  rev: string;
  pub: string;
  onChange: (id: number, field: "rev" | "pub", value: string) => void;
}) {
  const blocked = isBlocked(s);
  const warn = hasWarning(s);
  const showCost = view === "all" || view === "cost";
  const showRev = view === "all" || view === "rev";
  const showPub = view === "all" || view === "pub";

  return (
    <li className={`px-3 py-2.5 text-sm ${blocked ? "bg-destructive/5" : ""}`}>
      <div className="flex items-start gap-2">
        <span
          className={`mt-0.5 grid h-6 w-8 shrink-0 place-items-center rounded-md text-[11px] font-bold ${
            blocked ? "bg-destructive/15 text-destructive" : "bg-primary/10 text-primary"
          }`}
        >
          {s.id}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`font-medium leading-tight ${
                blocked ? "text-destructive line-through" : "text-foreground"
              }`}
            >
              {s.name}
            </span>
            {blocked && (
              <span className="rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-destructive-foreground">
                Bloqueado
              </span>
            )}
            {!blocked && warn && (
              <span
                title={s.status}
                className="rounded-full border border-border bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
              >
                ⚠ aviso
              </span>
            )}
          </div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">{s.time}</div>
          {warn && !blocked && (
            <div className="mt-0.5 text-[10.5px] italic text-muted-foreground">{s.status}</div>
          )}

          <div className="mt-1.5 grid grid-cols-3 gap-1.5">
            {showCost && <PriceCell label="Costo" value={`$${s.cost}`} readOnlyText tone="cost" />}
            {showRev && (
              <PriceCell
                label="Revendedor"
                value={rev}
                editable={editMode && hydrated}
                blocked={blocked}
                tone="rev"
                onChange={(v) => onChange(s.id, "rev", v)}
              />
            )}
            {showPub && (
              <PriceCell
                label="Cliente"
                value={pub}
                editable={editMode && hydrated}
                blocked={blocked}
                tone="pub"
                onChange={(v) => onChange(s.id, "pub", v)}
              />
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

function PriceCell({
  label,
  value,
  editable,
  readOnlyText,
  blocked,
  tone,
  onChange,
}: {
  label: string;
  value: string;
  editable?: boolean;
  readOnlyText?: boolean;
  blocked?: boolean;
  tone: "cost" | "rev" | "pub";
  onChange?: (v: string) => void;
}) {
  const toneClass =
    tone === "cost"
      ? "bg-secondary text-secondary-foreground"
      : tone === "rev"
      ? "bg-primary/10 text-foreground"
      : "bg-accent text-accent-foreground";
  return (
    <div className={`rounded-lg px-2 py-1 ${toneClass} ${blocked ? "opacity-60" : ""}`}>
      <div className="text-[9.5px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      {editable ? (
        <input
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange?.(e.target.value.replace(/[^0-9.]/g, ""))}
          placeholder="—"
          className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-muted-foreground/60"
        />
      ) : (
        <div className="text-sm font-semibold">
          {readOnlyText ? value : value ? `$${value}` : <span className="text-muted-foreground/60">—</span>}
        </div>
      )}
    </div>
  );
}