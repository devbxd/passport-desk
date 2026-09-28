import { Link, NavLink, Outlet } from "react-router-dom";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { ScanLine, Table2, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { SignInButton } from "@/components/ui/signin.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Avatar, AvatarFallback } from "@/components/ui/avatar.tsx";
import { useAuth } from "@/hooks/use-auth.ts";
import { cn } from "@/lib/utils.ts";
import { InstallPrompt } from "@/components/install-prompt.tsx";

const NAV_ITEMS = [
  { to: "/scan", label: "Scan", icon: ScanLine },
  { to: "/records", label: "Records", icon: Table2 },
];

function Brand() {
  return (
    <Link to="/" className="group flex items-center gap-3">
      <span className="ring-primary/40 group-hover:ring-primary relative size-10 shrink-0 overflow-hidden rounded-full ring-2 transition-shadow group-hover:shadow-[0_0_18px_-2px_var(--gold)]">
        <img
          src="/logo.jpg"
          alt=""
          width={80}
          height={80}
          className="size-full scale-[1.22] object-cover"
        />
      </span>
      <span className="text-gold-gradient animate-shimmer font-serif text-2xl leading-none tracking-tight">
        Passport&nbsp;Desk
      </span>
    </Link>
  );
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle color theme"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      <Sun className="size-4 dark:hidden" />
      <Moon className="hidden size-4 dark:block" />
    </Button>
  );
}

function UserBadge() {
  const { user } = useAuth();
  const label = user?.profile.name ?? user?.profile.email ?? "Account";
  return (
    <div className="flex items-center gap-2">
      <Avatar className="size-7">
        <AvatarFallback className="text-xs">
          {label.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <span className="text-muted-foreground hidden max-w-32 truncate text-sm sm:inline">
        {label}
      </span>
    </div>
  );
}

export default function AppLayout() {
  return (
    <div className="bg-background flex min-h-screen flex-col">
      <header className="bg-background/75 border-primary/20 sticky top-0 z-30 border-b shadow-[0_1px_30px_-12px_var(--gold)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-6 px-4 sm:px-6">
          <Brand />
          <nav className="hidden items-center gap-1 md:flex">
            <Authenticated>
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      "flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-secondary text-secondary-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )
                  }
                >
                  <item.icon className="size-4" />
                  {item.label}
                </NavLink>
              ))}
            </Authenticated>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <AuthLoading>
              <Skeleton className="h-9 w-24" />
            </AuthLoading>
            <Unauthenticated>
              <SignInButton size="sm" signInText="Sign in" />
            </Unauthenticated>
            <Authenticated>
              <UserBadge />
              <SignInButton
                size="sm"
                variant="ghost"
                showIcon={false}
                signOutText="Sign out"
              />
            </Authenticated>
          </div>
        </div>
      </header>

      <main className="flex-1 pb-20 md:pb-0">
        <Outlet />
      </main>

      <Authenticated>
        <nav className="bg-background/95 fixed inset-x-0 bottom-0 z-30 flex border-t backdrop-blur md:hidden">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex flex-1 cursor-pointer flex-col items-center gap-1 py-3 text-xs font-medium",
                  isActive ? "text-primary" : "text-muted-foreground",
                )
              }
            >
              <item.icon className="size-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </Authenticated>

      <footer className="hidden border-t md:block">
        <div className="text-muted-foreground mx-auto flex w-full max-w-7xl flex-col gap-2 px-6 py-6 text-sm sm:flex-row sm:items-center sm:justify-between">
          <span>
            &copy; {new Date().getFullYear()} Passport Desk. All rights
            reserved.
          </span>
          <div className="flex items-center gap-4">
            <Link to="/#pricing" className="hover:underline">
              Pricing
            </Link>
            <Link to="/terms" className="hover:underline">
              Terms
            </Link>
            <Link to="/privacy" className="hover:underline">
              Privacy
            </Link>
          </div>
        </div>
      </footer>

      <InstallPrompt />
    </div>
  );
}
