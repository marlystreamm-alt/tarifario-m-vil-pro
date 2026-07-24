import { createFileRoute } from "@tanstack/react-router";
import { Catalog } from "@/components/Catalog";

export const Route = createFileRoute("/tramites")({
  head: () => ({
    meta: [
      { title: "Trámites — MA²" },
      { name: "description", content: "Catálogo completo de trámites MA² por categoría, con precios y solicitud por WhatsApp." },
      { property: "og:title", content: "Trámites — MA²" },
      { property: "og:description", content: "Explora 88 trámites: actas, SAT, IMSS, INFONAVIT y más." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <Catalog publicOnly />,
});