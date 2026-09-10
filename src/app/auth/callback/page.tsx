import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthCallbackHandler } from "./callback-handler";

/**
 * Where invite and password-reset emails land.
 *
 * Supabase verifies the token on its own domain and then bounces the
 * browser here. Which shape it arrives in depends on the email template:
 * the stock templates hand back tokens in the URL fragment, which only
 * the browser can read — hence a client component rather than a route
 * handler.
 */
export default function AuthCallbackPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Harbour</CardTitle>
          <CardDescription>Confirming your link…</CardDescription>
        </CardHeader>
        <CardContent>
          <AuthCallbackHandler />
        </CardContent>
      </Card>
    </div>
  );
}
