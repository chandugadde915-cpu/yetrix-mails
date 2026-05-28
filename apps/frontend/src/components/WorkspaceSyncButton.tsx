"use client";

import { apiPost } from "@/lib/client-api";
import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

interface SyncResult {
  domains: number;
  mailboxes: number;
  aliases: number;
}

export function WorkspaceSyncButton() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function sync() {
    setMessage("");
    startTransition(async () => {
      try {
        const result = await apiPost<SyncResult>("/api/workspace/sync", {});
        setMessage(
          `Synced ${result.domains} domains, ${result.mailboxes} mailboxes, ${result.aliases} aliases.`,
        );
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Sync failed.");
      }
    });
  }

  return (
    <div className="sync-control">
      <button className="button secondary" type="button" disabled={isPending} onClick={sync}>
        <RefreshCw size={18} />
        Sync workspace
      </button>
      {message ? <span>{message}</span> : null}
    </div>
  );
}
