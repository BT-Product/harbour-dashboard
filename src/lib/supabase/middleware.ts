import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./database.types";

// Everything an invited client touches before they have a session has to be
// here. /auth/callback especially: it's where an email link lands, and the
// tokens arrive in the URL fragment — a redirect to /login would drop them
// and strand the client exactly the way the localhost Site URL did.
// /set-password stays public too, so a cookie that hasn't propagated yet
// can't bounce someone mid-flow; the page checks for a session itself.
const PUBLIC_PATHS = [
  "/login",
  "/api/health",
  // Vercel Cron arrives with no session. The route does its own auth against
  // CRON_SECRET — without this it just gets redirected to /login and the
  // reminder silently never sends.
  "/api/cron",
  "/auth",
  "/forgot-password",
  "/set-password",
];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + "/"));

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  if (user && (path === "/login" || path.startsWith("/agent"))) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_agent")
      .eq("id", user.id)
      .single();

    if (path === "/login") {
      const url = request.nextUrl.clone();
      url.pathname = profile?.is_agent ? "/agent" : "/dashboard";
      url.search = "";
      return NextResponse.redirect(url);
    }

    if (!profile?.is_agent) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
