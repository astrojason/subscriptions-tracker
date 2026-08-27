"use client";

import { Copy } from "lucide-react";
import { useState } from "react";

export function ErrorBlock({ message }: { message: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can be denied by the browser; the text is still
      // selectable (user-select: all) so the user can copy it manually.
    }
  }

  return (
    <div className="error-block" role="alert">
      <div className="flex items-center justify-between gap-2">
        <span className="card-kicker" style={{ color: "#b64444" }}>
          Error
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="btn btn-ghost"
          style={{ fontSize: "12px", padding: "2px 6px" }}
        >
          <Copy size={13} strokeWidth={1.5} />
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre>{message}</pre>
    </div>
  );
}
