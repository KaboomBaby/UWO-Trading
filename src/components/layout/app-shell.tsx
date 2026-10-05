import { Link } from "react-router-dom";

type AppShellProps = {
  children: React.ReactNode;
};

const navigation = [
  { label: "Home", to: "/" },
  { label: "Browse", to: "/browse" },
  { label: "Post a listing", to: "/post" },
];

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-ink/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-6 px-4 py-4 sm:px-6">
          <Link
            to="/"
            className="flex items-center gap-3 text-lg font-semibold text-white"
          >
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-glow text-base text-ink">
              ⚓
            </span>
            <span>UWO Market</span>
          </Link>
          <nav className="ml-auto flex items-center gap-1 text-sm sm:gap-2">
            {navigation.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-lg px-3 py-2 text-slate-200 transition hover:bg-white/10 hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-white/10 bg-ink/80 px-4 py-6 text-sm text-slate-400 sm:px-6">
        <div className="mx-auto max-w-7xl">
          Milestone preview · local mock data · Supabase integration pending
        </div>
      </footer>
    </div>
  );
}
