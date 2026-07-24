import { useEffect, useMemo, useState } from "react";
import { SERVICES, EDIT_PASSWORD, type Service } from "@/lib/services-data";
import { RequestModal } from "./RequestModal";
import { AppHeader } from "./NavBar";

type PriceMap = Record<number, { rev: string; pub: string }>;
type ViewMode = "all" | "cost" | "rev" | "pub";

const STORAGE_KEY = "tarifario-ma2-precios-v1";
const FAVS_KEY = "tarifario-ma2-favoritos-v1";
const DEFAULT_FAVS = [3,4,5,6,12,13,15,17,19,20,24,35,42,44,47,50,56,59,64,65,69,70,75,87,88];
const FAVS_CAT = "⭐ Más vendidos";

function loadPrices(): PriceMap {
  if (typeof window === "undefined") return {};
  try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : {}; } catch { return {}; }
}
function loadFavs(): number[] {
  if (typeof window === "undefined") return DEFAULT_FAVS;
  try { const raw = localStorage.getItem(FAVS_KEY); return raw ? JSON.parse(raw) : DEFAULT_FAVS; } catch { return DEFAULT_FAVS; }
}
const isBlocked = (s: Service) => s.status === "No ofrecer";
const hasWarning = (s: Service) => s.status !== "Disponible" && s.status !== "No ofrecer";

export function Catalog({ autoOpenEdit = false, publicOnly = false }: { autoOpenEdit?: boolean; publicOnly?: boolean }) {
  const [prices, setPrices] = useState<PriceMap>({});
  const [favs, setFavs] = useState<number[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [askingPw, setAskingPw] = useState(false);
  const [pwInput, setPwInput] = useState("");
  const [pwError, setPwError] = useState("");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<ViewMode>(publicOnly ? "pub" : "all");
  const [openCats, setOpenCats] = useState<Record<string, boolean>>({});
  const [requestService, setRequestService] = useState<Service | null>(null);

  useEffect(() => {
    setPrices(loadPrices());
    setFavs(loadFavs());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (autoOpenEdit && hydrated && !editMode) {
      setAskingPw(true);
    }
  }, [autoOpenEdit, hydrated, editMode]);

  useEffect(() => {
    if (hydrated) localStorage.setItem(FAVS_KEY, JSON.stringify(favs));
  }, [favs, hydrated]);

  const toggleFav = (id: number) => setFavs((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));

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

  const favServices = useMemo(() => {
    const q = search.trim().toLowerCase();
    const byId = new Map(SERVICES.map((s) => [s.id, s] as const));
    return favs.map((id) => byId.get(id)).filter((s): s is Service => !!s).filter((s) => !q || s.name.toLowerCase().includes(q));
  }, [favs, search]);

  useEffect(() => {
    if (search.trim()) {
      const all: Record<string, boolean> = {};
      grouped.forEach(([c]) => (all[c] = true));
      all[FAVS_CAT] = true;
      setOpenCats(all);
    }
  }, [search, grouped]);

  const toggleCat = (c: string) => setOpenCats((o) => ({ ...o, [c]: !o[c] }));

  function updatePrice(id: number, field: "rev" | "pub", value: string) {
    setPrices((p) => ({ ...p, [id]: { rev: p[id]?.rev ?? "", pub: p[id]?.pub ?? "", [field]: value } }));
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
  function tryEnterEdit() { setAskingPw(true); setPwInput(""); setPwError(""); }
  function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    if (pwInput === EDIT_PASSWORD) { setEditMode(true); setAskingPw(false); }
    else setPwError("Contraseña incorrecta");
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader title="Trámites" subtitle={`${SERVICES.length} servicios`} />
      <div className="sticky top-[104px] z-20 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto max-w-xl px-4 py-2">
          <div className="flex items-center justify-between gap-2">
            <input
              type="search"
              placeholder="Buscar trámite…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="min-w-0 flex-1 rounded-full border border-border bg-secondary px-4 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            {!publicOnly && (editMode ? (
              <div className="flex shrink-0 gap-1.5">
                <button onClick={restorePrices} className="rounded-full border border-destructive/30 bg-background px-3 py-1.5 text-xs font-semibold text-destructive active:scale-95">Restaurar</button>
                <button onClick={savePrices} className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm active:scale-95">Guardar</button>
              </div>
            ) : (
              <button onClick={tryEnterEdit} className="shrink-0 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm active:scale-95">Editar</button>
            ))}
          </div>
          {!publicOnly && (
            <div className="mt-2 flex gap-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {([["all","Ver los 3"],["cost","Mi costo"],["rev","Revendedor"],["pub","Cliente final"]] as [ViewMode,string][]).map(([k,label]) => (
                <button key={k} onClick={() => setView(k)} className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${view===k?"bg-primary text-primary-foreground":"bg-secondary text-secondary-foreground"}`}>{label}</button>
              ))}
            </div>
          )}
          {editMode && <div className="mt-1 rounded-md bg-accent px-3 py-1 text-[11px] font-medium text-accent-foreground">Modo edición activo</div>}
        </div>
      </div>

      <main className="mx-auto max-w-xl px-3 pb-24 pt-3">
        {grouped.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">Sin resultados</p>}
        <div className="space-y-2">
          {(() => {
            const open = !!openCats[FAVS_CAT];
            return (
              <section className="overflow-hidden rounded-2xl border border-primary/40 bg-card shadow-sm">
                <button onClick={() => toggleCat(FAVS_CAT)} className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left active:bg-secondary">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="grid h-6 min-w-6 shrink-0 place-items-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">{favs.length}</span>
                    <span className="truncate text-sm font-semibold">{FAVS_CAT}</span>
                  </span>
                  <span className={`shrink-0 text-primary transition-transform ${open?"rotate-180":""}`} aria-hidden>▾</span>
                </button>
                {open && (favServices.length === 0 ? (
                  <div className="border-t border-border px-4 py-6 text-center text-xs text-muted-foreground">Aún no hay servicios marcados</div>
                ) : (
                  <ul className="divide-y divide-border border-t border-border">
                    {favServices.map((s) => (
                      <ServiceRow key={`fav-${s.id}`} s={s} view={view} publicOnly={publicOnly} editMode={editMode && !isBlocked(s)} hydrated={hydrated} rev={prices[s.id]?.rev??""} pub={prices[s.id]?.pub??""} onChange={updatePrice} isFav={favs.includes(s.id)} onToggleFav={toggleFav} showFavToggle={editMode} onRequest={() => setRequestService(s)} />
                    ))}
                  </ul>
                ))}
              </section>
            );
          })()}
          {grouped.map(([cat, items]) => {
            const open = !!openCats[cat];
            return (
              <section key={cat} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                <button onClick={() => toggleCat(cat)} className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left active:bg-secondary">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">{items.length}</span>
                    <span className="truncate text-sm font-semibold">{cat}</span>
                  </span>
                  <span className={`shrink-0 text-primary transition-transform ${open?"rotate-180":""}`} aria-hidden>▾</span>
                </button>
                {open && (
                  <ul className="divide-y divide-border border-t border-border">
                    {items.map((s) => (
                      <ServiceRow key={s.id} s={s} view={view} publicOnly={publicOnly} editMode={editMode && !isBlocked(s)} hydrated={hydrated} rev={prices[s.id]?.rev??""} pub={prices[s.id]?.pub??""} onChange={updatePrice} isFav={favs.includes(s.id)} onToggleFav={toggleFav} showFavToggle={editMode} onRequest={() => setRequestService(s)} />
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      </main>

      {askingPw && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={() => setAskingPw(false)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={submitPassword} className="w-full max-w-sm rounded-2xl bg-card p-5 shadow-xl">
            <h2 className="text-base font-semibold">Contraseña de vendedora</h2>
            <p className="mt-1 text-xs text-muted-foreground">Introduce la contraseña para editar precios.</p>
            <input autoFocus type="password" inputMode="numeric" value={pwInput} onChange={(e) => { setPwInput(e.target.value); setPwError(""); }} className="mt-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="••••" />
            {pwError && <p className="mt-2 text-xs text-destructive">{pwError}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setAskingPw(false)} className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground">Cancelar</button>
              <button type="submit" className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Entrar</button>
            </div>
          </form>
        </div>
      )}

      {requestService && (
        <RequestModal
          service={requestService}
          publicPrice={prices[requestService.id]?.pub ?? ""}
          onClose={() => setRequestService(null)}
        />
      )}
    </div>
  );
}

function ServiceRow({ s, view, publicOnly, editMode, hydrated, rev, pub, onChange, isFav, onToggleFav, showFavToggle, onRequest }: {
  s: Service; view: ViewMode; publicOnly: boolean; editMode: boolean; hydrated: boolean; rev: string; pub: string;
  onChange: (id: number, field: "rev"|"pub", value: string) => void;
  isFav: boolean; onToggleFav: (id: number) => void; showFavToggle: boolean; onRequest: () => void;
}) {
  const blocked = isBlocked(s);
  const warn = hasWarning(s);
  const showCost = !publicOnly && (view === "all" || view === "cost");
  const showRev = !publicOnly && (view === "all" || view === "rev");
  const showPub = publicOnly || view === "all" || view === "pub";

  return (
    <li className={`px-3 py-2.5 text-sm ${blocked ? "bg-destructive/5" : ""}`}>
      <div className="flex items-start gap-2">
        <span className={`mt-0.5 grid h-6 w-8 shrink-0 place-items-center rounded-md text-[11px] font-bold ${blocked?"bg-destructive/15 text-destructive":"bg-primary/10 text-primary"}`}>{s.id}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {showFavToggle && (
              <button type="button" onClick={() => onToggleFav(s.id)} aria-label={isFav?"Quitar de más vendidos":"Marcar como más vendido"} className={`shrink-0 text-sm leading-none ${isFav?"text-primary":"text-muted-foreground/50"}`}>{isFav?"★":"☆"}</button>
            )}
            <span className={`font-medium leading-tight ${blocked?"text-destructive line-through":"text-foreground"}`}>{s.name}</span>
            {blocked && <span className="rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-destructive-foreground">Bloqueado</span>}
            {!blocked && warn && <span title={s.status} className="rounded-full border border-border bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">⚠ aviso</span>}
          </div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">⏱ {s.time}</div>
          {warn && !blocked && <div className="mt-0.5 text-[10.5px] italic text-muted-foreground">{s.status}</div>}

          <div className={`mt-1.5 grid gap-1.5 ${publicOnly ? "grid-cols-1" : "grid-cols-3"}`}>
            {showCost && <PriceCell label="Costo" value={`$${s.cost}`} readOnlyText tone="cost" />}
            {showRev && <PriceCell label="Revendedor" value={rev} editable={editMode && hydrated} blocked={blocked} tone="rev" onChange={(v) => onChange(s.id,"rev",v)} />}
            {showPub && <PriceCell label="Precio público" value={pub} editable={editMode && hydrated} blocked={blocked} tone="pub" onChange={(v) => onChange(s.id,"pub",v)} />}
          </div>

          {!editMode && !blocked && (
            <button
              type="button"
              onClick={onRequest}
              className="mt-2 w-full rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm active:scale-95"
            >
              Solicitar
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

function PriceCell({ label, value, editable, readOnlyText, blocked, tone, onChange }: {
  label: string; value: string; editable?: boolean; readOnlyText?: boolean; blocked?: boolean;
  tone: "cost"|"rev"|"pub"; onChange?: (v: string) => void;
}) {
  const toneClass = tone==="cost"?"bg-secondary text-secondary-foreground":tone==="rev"?"bg-primary/10 text-foreground":"bg-accent text-accent-foreground";
  return (
    <div className={`rounded-lg px-2 py-1 ${toneClass} ${blocked?"opacity-60":""}`}>
      <div className="text-[9.5px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      {editable ? (
        <input inputMode="decimal" value={value} onChange={(e) => onChange?.(e.target.value.replace(/[^0-9.]/g,""))} placeholder="—" className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-muted-foreground/60" />
      ) : (
        <div className="text-sm font-semibold">{readOnlyText?value:value?`$${value}`:<span className="text-muted-foreground/60">—</span>}</div>
      )}
    </div>
  );
}