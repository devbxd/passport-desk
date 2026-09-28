import {
  useAuth as useClerkAuth,
  useClerk,
  useUser as useClerkUser,
} from "@clerk/clerk-react";

// Thin adapter so the rest of the app doesn't depend on Clerk directly.
export function useAuth() {
  const { isLoaded, isSignedIn } = useClerkAuth();
  const { user } = useClerkUser();
  const clerk = useClerk();

  return {
    isAuthenticated: Boolean(isSignedIn),
    isLoading: !isLoaded,
    error: null as Error | null,
    user: user
      ? {
          profile: {
            name: user.fullName ?? undefined,
            email: user.primaryEmailAddress?.emailAddress,
          },
        }
      : null,
    signin: () => clerk.openSignIn({}),
    signout: () => clerk.signOut(),
  };
}
