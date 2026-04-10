import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Target, MessageSquare, Users, LogOut } from "lucide-react";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, isAdmin } = useAuth();
  const [location] = useLocation();

  const navigation = [
    { name: "Projects", href: "/projects", icon: LayoutDashboard },
    { name: "Observability", href: "/observability", icon: Target },
    ...(isAdmin ? [
      { name: "System Prompts", href: "/prompts", icon: MessageSquare },
      { name: "Users", href: "/users", icon: Users },
    ] : []),
  ];

  return (
    <div className="flex min-h-screen w-full bg-background">
      <div className="hidden border-r bg-card md:flex md:w-64 md:flex-col">
        <div className="flex h-14 items-center border-b px-4">
          <span className="font-semibold tracking-tight">AI Asset Validator</span>
        </div>
        <div className="flex-1 overflow-auto py-2">
          <nav className="grid items-start px-2 text-sm font-medium gap-1">
            {navigation.map((item) => {
              const isActive = location.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                    isActive && "bg-muted text-primary"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="mt-auto border-t p-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col truncate">
              <span className="text-sm font-medium truncate">{user?.fullName}</span>
              <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
            </div>
            <button
              onClick={logout}
              className="text-muted-foreground hover:text-foreground transition-colors p-2"
              title="Log out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {children}
      </main>
    </div>
  );
}