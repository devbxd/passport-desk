import { ClerkProvider } from "@clerk/clerk-react";

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as
  | string
  | undefined;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  if (!publishableKey) {
    throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in .env.local");
  }
  return (
    <ClerkProvider publishableKey={publishableKey} afterSignOutUrl="/">
      {children}
    </ClerkProvider>
  );
}
