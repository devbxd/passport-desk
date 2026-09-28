import { MessageCircle } from "lucide-react";
import { whatsappLink } from "@/lib/whatsapp.ts";

/** Floating WhatsApp contact button, visible on every page. */
export function WhatsappButton() {
  return (
    <a
      href={whatsappLink("Hi! I have a question about Passport Desk.")}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed right-5 bottom-5 z-50 flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-3 text-sm font-medium text-white shadow-[0_10px_30px_-8px_rgba(37,211,102,0.7)] transition-transform hover:scale-105"
    >
      <MessageCircle className="size-5 fill-white text-[#25D366]" />
      <span className="hidden sm:inline">Chat on WhatsApp</span>
    </a>
  );
}
