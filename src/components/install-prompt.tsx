import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const isIos = () =>
  typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);

const isStandalone = () =>
  typeof window !== "undefined" &&
  (window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari specific property
    (navigator as Navigator & { standalone?: boolean }).standalone === true);

const DISMISSED_KEY = "pwa-install-dismissed";

const isEligible = () =>
  typeof window !== "undefined" && window.self === window.top && !isStandalone();

export function InstallPrompt() {
  const [deferredEvent, setDeferredEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosBanner] = useState(() => isEligible() && isIos());
  const [dismissed, setDismissed] = useState(
    () => typeof window !== "undefined" && localStorage.getItem(DISMISSED_KEY) === "1",
  );

  useEffect(() => {
    // The App Builder preview embeds the app in an iframe; never prompt there
    if (!isEligible()) return;

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredEvent(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () =>
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  const dismiss = () => {
    setDismissed(true);
    localStorage.setItem(DISMISSED_KEY, "1");
  };

  if (dismissed || (!deferredEvent && !showIosBanner)) return null;

  return (
    <div className="fixed inset-x-0 bottom-20 z-40 mx-auto w-[calc(100%-2rem)] max-w-sm sm:bottom-6">
      <div className="bg-card text-card-foreground flex items-center gap-3 rounded-xl border p-3 shadow-lg">
        <span className="bg-primary text-primary-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
          <Download className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Install Passport Desk</p>
          <p className="text-muted-foreground text-xs">
            {showIosBanner && !deferredEvent
              ? "Tap Share, then Add to Home Screen"
              : "Add it to your home screen for quick access"}
          </p>
        </div>
        {deferredEvent ? (
          <Button
            size="sm"
            onClick={() => {
              deferredEvent.prompt();
              deferredEvent.userChoice.then(() => {
                setDeferredEvent(null);
                dismiss();
              });
            }}
          >
            Install
          </Button>
        ) : (
          <Share className="text-muted-foreground size-4 shrink-0" />
        )}
        <button
          type="button"
          aria-label="Dismiss install prompt"
          className="text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
          onClick={dismiss}
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
