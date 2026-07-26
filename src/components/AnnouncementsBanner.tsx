import { useEffect, useState, type ReactNode } from "react";
import { Info, AlertTriangle, AlertOctagon, Megaphone, ChevronLeft, ChevronRight } from "lucide-react";
import {
  getActiveAnnouncements,
  subscribeAnnouncements,
  type Announcement,
  type AnnouncementType,
} from "@/lib/announcements";

const TYPE_STYLES: Record<AnnouncementType, { wrap: string; icon: ReactNode; label: string }> = {
  info: {
    wrap: "border-primary/30 bg-primary/5 text-foreground",
    icon: <Info className="h-4 w-4 text-primary" />,
    label: "Informativo",
  },
  important: {
    wrap: "border-accent/40 bg-accent/10 text-foreground",
    icon: <Megaphone className="h-4 w-4 text-accent-foreground" />,
    label: "Importante",
  },
  urgent: {
    wrap: "border-orange-500/40 bg-orange-500/10 text-foreground",
    icon: <AlertTriangle className="h-4 w-4 text-orange-600" />,
    label: "Urgente",
  },
  critical: {
    wrap: "border-red-500/50 bg-red-500/10 text-foreground",
    icon: <AlertOctagon className="h-4 w-4 text-red-600" />,
    label: "Crítico",
  },
};

function AnnouncementCard({ a }: { a: Announcement }) {
  const style = TYPE_STYLES[a.type];
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${style.wrap}`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-background/70">
          {style.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold">{a.title}</p>
            <span className="rounded-full bg-background/70 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {style.label}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{a.message}</p>
        </div>
      </div>
    </div>
  );
}

export function AnnouncementsBanner() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const load = () => setItems(getActiveAnnouncements());
    load();
    return subscribeAnnouncements(load);
  }, []);

  useEffect(() => {
    if (idx >= items.length) setIdx(0);
  }, [items.length, idx]);

  useEffect(() => {
    if (items.length <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % items.length), 6000);
    return () => clearInterval(t);
  }, [items.length]);

  if (items.length === 0) return null;

  if (items.length === 1) {
    return (
      <section className="mb-4">
        <AnnouncementCard a={items[0]} />
      </section>
    );
  }

  const current = items[idx];
  const prev = () => setIdx((i) => (i - 1 + items.length) % items.length);
  const next = () => setIdx((i) => (i + 1) % items.length);

  return (
    <section className="mb-4">
      <div className="relative">
        <AnnouncementCard a={current} />
        <div className="mt-2 flex items-center justify-between">
          <button
            onClick={prev}
            aria-label="Anterior"
            className="grid h-7 w-7 place-items-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-1.5">
            {items.map((a, i) => (
              <button
                key={a.id}
                onClick={() => setIdx(i)}
                aria-label={`Ir al anuncio ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === idx ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>
          <button
            onClick={next}
            aria-label="Siguiente"
            className="grid h-7 w-7 place-items-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}