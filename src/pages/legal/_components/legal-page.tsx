import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";

type LegalPageProps = {
  title: string;
  updatedAt: string;
  children: React.ReactNode;
};

export default function LegalPage({ title, updatedAt, children }: LegalPageProps) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <Button variant="ghost" size="sm" asChild className="mb-6 -ml-2">
        <Link to="/">
          <ArrowLeft className="size-4" />
          Back to home
        </Link>
      </Button>
      <div className="mb-8 space-y-1">
        <h1 className="font-serif text-3xl tracking-tight sm:text-4xl">{title}</h1>
        <p className="text-muted-foreground text-sm">Last updated: {updatedAt}</p>
      </div>
      <div className="prose prose-neutral dark:prose-invert max-w-none">
        {children}
      </div>
    </div>
  );
}
