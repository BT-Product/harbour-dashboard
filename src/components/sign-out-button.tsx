import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/actions/auth";

export function SignOutButton({ full = false }: { full?: boolean }) {
  return (
    <form action={signOut} className={full ? "w-full" : undefined}>
      <Button
        variant="ghost"
        size="sm"
        type="submit"
        className={full ? "w-full justify-start gap-3 px-3 text-sidebar-foreground/70" : undefined}
      >
        {full && <LogOut className="size-4" />}
        Sign out
      </Button>
    </form>
  );
}
