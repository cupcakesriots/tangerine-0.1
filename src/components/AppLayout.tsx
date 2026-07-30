import { Link, useLocation } from "@tanstack/react-router";
import { getOnboarding } from "~/lib/storage";

const navItems = [
  { href: "/dashboard", label: "Home", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  { href: "/tasks", label: "Tasks", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" },
  { href: "/calendar", label: "Calendar", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
  { href: "/wellness", label: "Wellness", icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" },
  { href: "/coach", label: "Coach", icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" },
  { href: "/settings/integrations", label: "Settings", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const onboarding = getOnboarding();
  const name = onboarding?.name || null;

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      {/* Mobile top bar - Orange gradient */}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-gradient-to-r from-brand-deep to-brand-light px-4 py-3 shadow-[0_2px_12px_-4px_rgba(194,105,1,0.3)] lg:hidden">
        <Link to="/dashboard" className="flex items-center gap-2.5">
          <span className="text-xl">🍊</span>
          <span className="font-serif text-lg font-semibold tracking-tight text-white drop-shadow-sm">Tangerine</span>
        </Link>
        {name && <span className="text-sm font-medium text-white/80">{name}</span>}
      </header>

      {/* Desktop sidebar - Orange top */}
      <aside className="hidden w-64 shrink-0 border-r border-white/10 bg-white/30 backdrop-blur-2xl lg:flex lg:flex-col">
        <div className="flex items-center gap-3.5 bg-gradient-to-r from-brand-deep to-brand-light px-6 py-6 shadow-[0_2px_12px_-4px_rgba(194,105,1,0.2)]">
          <span className="text-3xl drop-shadow-sm">🍊</span>
          <div>
            <span className="font-serif text-xl font-semibold tracking-tight text-white drop-shadow-sm">Tangerine</span>
            {name && <p className="text-xs font-medium text-white/70">{name}</p>}
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-5">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link key={item.href} to={item.href}
                className={`flex items-center gap-3.5 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-brand-warm/60 text-brand-deep shadow-[0_1px_4px_-2px_rgba(194,105,1,0.06)]"
                    : "text-brand-muted hover:bg-white/50 hover:text-brand-dark"}`}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={item.icon} /></svg>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/30 px-6 py-4">
          <p className="text-xs font-medium text-brand-muted/40">Adaptive planning companion</p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pb-24 lg:pb-6">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
      </main>

      {/* Mobile bottom nav - Orange gradient */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/10 bg-gradient-to-r from-brand-deep to-brand-light shadow-[0_-2px_12px_-4px_rgba(194,105,1,0.2)] lg:hidden">
        <div className="flex items-center justify-around px-2 py-1.5">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link key={item.href} to={item.href}
                className={`flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                  isActive ? "text-white drop-shadow" : "text-white/50"}`}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill={isActive ? "white" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={item.icon} /></svg>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
