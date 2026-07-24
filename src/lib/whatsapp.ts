// Número de WhatsApp del negocio. Reemplazar por el número real desde
// Administrar (o mover a variable de entorno pública cuando se conecte backend).
// Formato E.164 sin "+", ej. 5215512345678 para México.
export const WHATSAPP_NUMBER = "5215555555555";

export function buildWhatsAppUrl(message: string, number: string = WHATSAPP_NUMBER) {
  const clean = number.replace(/[^0-9]/g, "");
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
}