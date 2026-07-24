import type { Service } from "./services-data";

// Requisitos genéricos por categoría. Ajustables sin tocar el catálogo.
const BY_CATEGORY: Record<string, string[]> = {
  Actas: ["Nombre completo", "CURP o fecha y lugar de nacimiento", "Correo para enviar el PDF"],
  SAT: ["RFC o CURP", "Correo del contribuyente", "Contraseña SAT si aplica"],
  IMSS: ["CURP", "NSS si lo tienes", "Correo o WhatsApp"],
  INFONAVIT: ["NSS", "CURP", "Correo registrado en INFONAVIT"],
  Educación: ["Nombre completo", "CURP", "Institución o cédula si aplica"],
  Constancias: ["Nombre completo", "CURP", "Datos oficiales relacionados"],
  Citas: ["Nombre completo", "CURP", "Ciudad y fecha deseada"],
  Suscripciones: ["Correo donde se activa", "Contraseña nueva sugerida"],
  Digitales: ["Enlace o descripción del contenido", "Correo de entrega"],
  Redes: ["Enlace del perfil o publicación"],
  Bots: ["Datos que solicite el bot", "Correo o WhatsApp de contacto"],
};

const DEFAULT_REQS = ["Nombre completo", "Datos del trámite", "Correo o WhatsApp"];

export function getRequirements(s: Service): string[] {
  return BY_CATEGORY[s.category] ?? DEFAULT_REQS;
}