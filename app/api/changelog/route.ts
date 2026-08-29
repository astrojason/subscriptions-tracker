import { execSync } from "child_process";
import { readFileSync } from "fs";
import { NextResponse } from "next/server";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET() {
  const log = execSync(
    "git log --pretty=format:%h|%s|%ad --date=short -n 50",
    { cwd: process.cwd() }
  )
    .toString()
    .trim();

  const entries = log
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [hash, ...rest] = line.split("|");
      const date = rest.pop() ?? "";
      return { hash, message: rest.join("|"), date };
    });

  const pkg = JSON.parse(
    readFileSync(path.join(process.cwd(), "package.json"), "utf-8")
  );

  return NextResponse.json({ version: pkg.version, entries });
}
