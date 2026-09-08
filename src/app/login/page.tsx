import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Harbour</CardTitle>
          <CardDescription>Sign in to see where your transaction stands.</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm next={next ?? "/dashboard"} />
        </CardContent>
      </Card>
    </div>
  );
}
