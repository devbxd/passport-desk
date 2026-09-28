// Client's WhatsApp contact number for subscriptions and support.
const WHATSAPP_NUMBER = "96170792505"; // +961 70 792 505

export function whatsappLink(message: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
