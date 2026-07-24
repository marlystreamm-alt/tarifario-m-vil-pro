import { createFileRoute } from "@tanstack/react-router";
import { Catalog } from "@/components/Catalog";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Administrar — MA²" },
      { name: "description", content: "Panel privado para editar precios del tarifario MA²." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => <Catalog autoOpenEdit />,
});