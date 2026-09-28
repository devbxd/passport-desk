import { BrowserRouter, Route, Routes } from "react-router-dom";
import { DefaultProviders } from "./components/providers/default.tsx";
import AppLayout from "./components/layout/app-layout.tsx";
import Index from "./pages/Index.tsx";
import ScanPage from "./pages/scan/page.tsx";
import RecordsPage from "./pages/records/page.tsx";
import TermsPage from "./pages/legal/Terms.tsx";
import PrivacyPage from "./pages/legal/Privacy.tsx";
import NotFound from "./pages/NotFound.tsx";
import { useServiceWorker } from "@/hooks/use-service-worker.ts";
import { WhatsappButton } from "@/components/whatsapp-button.tsx";

export default function App() {
  useServiceWorker();

  return (
    <DefaultProviders>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Index />} />
            <Route path="/scan" element={<ScanPage />} />
            <Route path="/records" element={<RecordsPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
          </Route>
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <WhatsappButton />
      </BrowserRouter>
    </DefaultProviders>
  );
}
