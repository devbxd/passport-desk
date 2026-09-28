import { useEffect } from "react";
import { useConvexAuth, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";

// Creates the app's own user record the first time someone signs in.
export function UserSync() {
  const { isAuthenticated } = useConvexAuth();
  const updateCurrentUser = useMutation(api.users.updateCurrentUser);

  useEffect(() => {
    if (isAuthenticated) {
      void updateCurrentUser();
    }
  }, [isAuthenticated, updateCurrentUser]);

  return null;
}
