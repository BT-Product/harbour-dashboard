"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { buttonVariants } from "@/components/ui/button";

type State = { status: "working" } | { status: "failed"; message: string };

export function AuthCallbackHandler() {
  const router = useRouter();
  const [state, setState] = useState<State>({ status: "working" });
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    async function run() {
      const supabase = createClient();
      const url = new URL(window.location.href);
      // Stock Supabase templates put everything after a '#'; a template
      // switched to {{ .TokenHash }} would use the query string instead.
      const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
      const query = url.searchParams;

      const errorDescription = hash.get("error_description") ?? query.get("error_description");
      if (errorDescription) {
        setState({ status: "failed", message: errorDescription });
        return;
      }

      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) {
          setState({ status: "failed", message: error.message });
          return;
        }
        router.replace("/set-password");
        return;
      }

      const tokenHash = query.get("token_hash");
      const type = query.get("type");
      if (tokenHash && type) {
        const { error } = await supabase.auth.verifyOtp({
          type: type as "invite" | "recovery" | "email" | "signup" | "magiclink",
          token_hash: tokenHash,
        });
        if (error) {
          setState({ status: "failed", message: error.message });
          return;
        }
        router.replace("/set-password");
        return;
      }

      setState({
        status: "failed",
        message: "That link didn't carry a sign-in token. It may have already been used.",
      });
    }

    void run();
  }, [router]);

  if (state.status === "working") {
    return <p className="text-sm text-muted-foreground">One moment…</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{state.message}</p>
      <p className="text-sm text-muted-foreground">
        Links can only be used once and expire after a while. Ask your agent to send a new one, or
        reset your password if you&apos;ve already set one.
      </p>
      <div className="flex gap-2">
        <Link href="/forgot-password" className={buttonVariants({ size: "sm" })}>
          Email me a new link
        </Link>
        <Link href="/login" className={buttonVariants({ variant: "outline", size: "sm" })}>
          Sign in
        </Link>
      </div>
    </div>
  );
}
