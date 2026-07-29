import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router";
import type { ReactNode } from "react";

import appCss from "~/styles/app.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      {
        title: "Tangerine — Your warm, adaptive planning companion",
      },
      {
        name: "description",
        content:
          "Tangerine helps you plan with compassion, not punishment. An adaptive planner that bends with your energy.",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      {
        rel: "preconnect",
        href: "https://fonts.googleapis.com",
      },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Newsreader:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&display=swap",
      },
    ],
  }),
  notFoundComponent: () => (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-8 text-center">
      <span className="text-6xl">🍊</span>
      <h1 className="font-serif text-3xl font-semibold text-brand-dark">
        Page not found
      </h1>
      <p className="max-w-sm text-brand-deep">
        This page took a little nap. Let's get you back somewhere cozy.
      </p>
      <a
        href="/dashboard"
        className="rounded-full bg-brand-deep px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-light"
      >
        Go to Dashboard
      </a>
    </div>
  ),
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-dvh">
        {children}
        <Scripts />
      </body>
    </html>
  );
}