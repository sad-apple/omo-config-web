import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import * as jsonc from "jsonc-parser";
import { getOpencodeJsonPath, getOmoJsoncPath } from "@/lib/config-paths";

export const dynamic = "force-dynamic";

export async function GET() {
  const opencodePath = getOpencodeJsonPath();
  const omoPath = getOmoJsoncPath();

  let opencodeRaw = "";
  let omoRaw = "";
  let opencodeExists = false;
  let omoExists = false;

  try {
    opencodeRaw = await fs.readFile(opencodePath, "utf-8");
    opencodeExists = true;
  } catch {
    // File doesn't exist — that's fine
  }

  try {
    omoRaw = await fs.readFile(omoPath, "utf-8");
    omoExists = true;
  } catch {
    // File doesn't exist — that's fine
  }

  let opencode: Record<string, unknown> = {};
  let omo: Record<string, unknown> = {};

  if (opencodeExists && opencodeRaw.trim()) {
    try {
      opencode = JSON.parse(opencodeRaw);
    } catch {
      // If JSON is invalid, return empty
      opencode = {};
    }
  }

  if (omoExists && omoRaw.trim()) {
    try {
      const errors: jsonc.ParseError[] = [];
      const parsed = jsonc.parseTree(omoRaw, errors);
      if (errors.length === 0 && parsed) {
        omo = parsed as unknown as Record<string, unknown>;
      }
    } catch {
      // If JSONC is invalid, return empty
      omo = {};
    }
  }

  return NextResponse.json({
    opencode,
    omo,
    opencodeExists,
    omoExists,
    opencodeRaw,
    omoRaw,
  });
}
