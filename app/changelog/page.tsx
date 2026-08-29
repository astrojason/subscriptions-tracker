"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Entry {
  hash: string;
  message: string;
  date: string;
}

interface ChangelogData {
  version: string;
  entries: Entry[];
}

export default function ChangelogPage() {
  const [data, setData] = useState<ChangelogData | null>(null);

  useEffect(() => {
    fetch("/api/changelog")
      .then((r) => r.json())
      .then(setData);
  }, []);

  return (
    <main
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: "var(--space-8) var(--space-4)",
      }}
    >
      <div style={{ marginBottom: "var(--space-6)" }}>
        <Link
          href="/"
          style={{
            fontSize: "0.8rem",
            color: "color-mix(in srgb, var(--color-text) 60%, transparent)",
            textDecoration: "none",
          }}
        >
          ← back
        </Link>
      </div>
      <h1
        style={{
          fontFamily: "var(--font-condensed)",
          fontSize: "1.5rem",
          fontWeight: 600,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          marginBottom: "var(--space-6)",
        }}
      >
        Changelog{data ? ` — v${data.version}` : ""}
      </h1>
      {!data ? (
        <p style={{ color: "color-mix(in srgb, var(--color-text) 50%, transparent)" }}>
          Loading…
        </p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {data.entries.map((e) => (
            <li
              key={e.hash}
              style={{
                display: "flex",
                gap: "var(--space-3)",
                marginBottom: "var(--space-2)",
                fontFamily: "monospace",
                fontSize: "0.85rem",
              }}
            >
              <span
                style={{
                  color: "color-mix(in srgb, var(--color-text) 45%, transparent)",
                  flexShrink: 0,
                  minWidth: "6rem",
                }}
              >
                {e.date}
              </span>
              <code
                style={{
                  color: "var(--color-accent, #6c9aff)",
                  flexShrink: 0,
                }}
              >
                {e.hash}
              </code>
              <span>{e.message}</span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
