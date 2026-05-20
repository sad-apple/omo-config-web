import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { createHash } from "crypto";
import { getOpencodeJsonPath, getOmoJsoncPath, getConfigDir } from "@/lib/config-paths";
import { splitConfig } from "@/lib/config-splitter";
import { mergeJsonc, writeNewConfig } from "@/lib/jsonc-writer";

export const dynamic = "force-dynamic";

interface PublishRequestBody {
  config: Record<string, unknown>;
  etags?: { opencode: string | null; omo: string | null };
  force?: boolean;
}

function computeEtag(content: string): string {
  return createHash("sha256").update(content).digest("hex").slice(0, 16);
}

export async function POST(request: Request) {
  try {
    const body: PublishRequestBody = await request.json();
    const { config, etags, force } = body;

    if (!config || typeof config !== "object") {
      return NextResponse.json(
        { success: false, error: "Invalid config data" },
        { status: 400 }
      );
    }

    const opencodePath = getOpencodeJsonPath();
    const omoPath = getOmoJsoncPath();

    // ETag validation (skip if force=true)
    if (etags && !force) {
      let currentOpencodeRaw = "";
      let currentOmoRaw = "";
      try {
        currentOpencodeRaw = await fs.readFile(opencodePath, "utf-8");
      } catch { /* file doesn't exist */ }
      try {
        currentOmoRaw = await fs.readFile(omoPath, "utf-8");
      } catch { /* file doesn't exist */ }

      const currentOpencodeEtag = currentOpencodeRaw ? computeEtag(currentOpencodeRaw) : null;
      const currentOmoEtag = currentOmoRaw ? computeEtag(currentOmoRaw) : null;

      if (
        (etags.opencode && etags.opencode !== currentOpencodeEtag) ||
        (etags.omo && etags.omo !== currentOmoEtag)
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Conflict: configuration has been modified by another source",
            serverEtags: {
              opencode: currentOpencodeEtag,
              omo: currentOmoEtag,
            },
          },
          { status: 409 }
        );
      }
    }

    // Split config into opencode.json and oh-my-openagent.jsonc
    const { opencodeJson, omoJsonc } = splitConfig(
      config as unknown as Parameters<typeof splitConfig>[0]
    );

    // Ensure config directory exists
    const configDir = getConfigDir();
    await fs.mkdir(configDir, { recursive: true });

    const filesWritten: string[] = [];

    // Write opencode.json
    let opencodeRaw = "";
    try {
      opencodeRaw = await fs.readFile(opencodePath, "utf-8");
    } catch {
      // File doesn't exist yet
    }

    if (opencodeRaw.trim()) {
      // Existing file — merge to preserve comments
      const merged = mergeJsonc(opencodeRaw, opencodeJson as Record<string, unknown>, false);
      await fs.writeFile(opencodePath, merged, "utf-8");
    } else {
      // New file — write fresh
      const content = writeNewConfig(opencodeJson as Record<string, unknown>, false);
      await fs.writeFile(opencodePath, content, "utf-8");
    }
    filesWritten.push("opencode.json");

    // Write oh-my-openagent.jsonc
    let omoRaw = "";
    try {
      omoRaw = await fs.readFile(omoPath, "utf-8");
    } catch {
      // File doesn't exist yet
    }

    if (omoRaw.trim()) {
      // Existing file — merge to preserve comments
      const merged = mergeJsonc(omoRaw, omoJsonc as Record<string, unknown>, true);
      await fs.writeFile(omoPath, merged, "utf-8");
    } else {
      // New file — write fresh
      const content = writeNewConfig(omoJsonc as Record<string, unknown>, true);
      await fs.writeFile(omoPath, content, "utf-8");
    }
    filesWritten.push("oh-my-openagent.jsonc");

    // Compute new etags after writing
    const newOpencodeRaw = await fs.readFile(opencodePath, "utf-8");
    const newOmoRaw = await fs.readFile(omoPath, "utf-8");

    return NextResponse.json({
      success: true,
      filesWritten,
      timestamp: Date.now(),
      etags: {
        opencode: computeEtag(newOpencodeRaw),
        omo: computeEtag(newOmoRaw),
      },
    });
  } catch (error) {
    console.error("Publish error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
