import { computeEtag } from "@/lib/etag";
import { NextResponse } from "next/server";
import fs from "fs/promises";
import * as jsonc from "jsonc-parser";
import { getOpencodeJsonPath, getOmoJsoncPath, getPresetOpencodeJsonPath, getPresetOmoJsoncPath } from "@/lib/config-paths";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const preset = searchParams.get("preset");

  const opencodePath = preset ? getPresetOpencodeJsonPath(preset) : getOpencodeJsonPath();
  const omoPath = preset ? getPresetOmoJsoncPath(preset) : getOmoJsoncPath();

  let opencodeRaw = "";
  let omoRaw = "";
  let opencodeExists = false;
  let omoExists = false;

  try {
    opencodeRaw = await fs.readFile(opencodePath, "utf-8");
    opencodeExists = true;
  } catch {
    // File doesn't exist — that's fine
    console.error("[config] Failed to read opencode.json:");
  }

  try {
    omoRaw = await fs.readFile(omoPath, "utf-8");
    omoExists = true;
  } catch {
    // File doesn't exist — that's fine
    console.error("[config] Failed to read oh-my-openagent.jsonc:");
  }

  let opencode: Record<string, unknown> = {};
  let omo: Record<string, unknown> = {};

  if (opencodeExists && opencodeRaw.trim()) {
    try {
      opencode = JSON.parse(opencodeRaw);
    } catch {
      // If JSON is invalid, return empty
      console.error("[config] Failed to parse opencode.json:");
      opencode = {};
    }
  }
    try {
      omo = jsonc.parse(omoRaw) as Record<string, unknown>;
    } catch {
      // If JSONC is invalid, return empty
      console.error("[config] Failed to parse oh-my-openagent.jsonc:");
      omo = {};
    }


  return NextResponse.json({
    opencode,
    omo,
    opencodeExists,
    omoExists,
    opencodeRaw,
    omoRaw,
    etags: {
      opencode: opencodeExists ? computeEtag(opencodeRaw) : null,
      omo: omoExists ? computeEtag(omoRaw) : null,
    },
  });
}
