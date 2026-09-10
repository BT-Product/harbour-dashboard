import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ForgotPasswordForm } from "./forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Email me a link</CardTitle>
          <CardDescription>
            Whether you never finished setting a password or forgot it, this sends a fresh link to
            get back in.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ForgotPasswordForm />
          <Link href="/login" className="block text-sm text-muted-foreground hover:text-foreground">
            Back to sign in
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
