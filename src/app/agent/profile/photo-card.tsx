"use client";

import { useRef, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { saveMyPhoto } from "../actions";

const BUCKET = "agent-photos";
// The bucket enforces the same limits; checking here gives a readable message
// instead of a storage error.
const MAX_BYTES = 2 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function PhotoCard({
  agentId,
  name,
  photoUrl,
}: {
  agentId: string;
  name: string;
  photoUrl: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  // One fixed object per agent, overwritten on replace, so old photos don't
  // pile up in storage. The URL carries a version so browsers refetch it.
  const path = `${agentId}/photo`;

  function handleFile(file: File | undefined) {
    if (!file) return;
    if (!TYPES.includes(file.type)) {
      toast.error("Use a JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("That photo is over 2 MB. Try a smaller version.");
      return;
    }

    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type, cacheControl: "3600" });
      if (error) {
        toast.error(error.message);
        return;
      }
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const result = await saveMyPhoto(`${data.publicUrl}?v=${Date.now()}`);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Photo updated");
    });
  }

  function handleRemove() {
    startTransition(async () => {
      const result = await saveMyPhoto(null);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      // After the record is cleared, so a failed delete never leaves the
      // profile pointing at a missing image.
      await createClient().storage.from(BUCKET).remove([path]);
      toast.success("Photo removed");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Photo</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4 text-center">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- a single small avatar from our own storage
          <img
            src={photoUrl}
            alt={name}
            className="size-32 rounded-full border object-cover"
          />
        ) : (
          <div className="flex size-32 items-center justify-center rounded-full bg-primary text-3xl font-semibold text-primary-foreground">
            {initials(name)}
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={TYPES.join(",")}
          className="hidden"
          onChange={(e) => {
            handleFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <div className="flex flex-wrap justify-center gap-2">
          <Button size="sm" variant="outline" disabled={isPending} onClick={() => inputRef.current?.click()}>
            {isPending ? "Working…" : photoUrl ? "Replace photo" : "Upload photo"}
          </Button>
          {photoUrl && (
            <Button size="sm" variant="ghost" disabled={isPending} onClick={handleRemove}>
              Remove
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Shown in your sidebar. Not shown to clients yet. JPEG, PNG, or WebP, up to 2 MB.
        </p>
      </CardContent>
    </Card>
  );
}
