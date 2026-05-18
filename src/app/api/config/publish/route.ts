import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { getOpencodeJsonPath, getOmoJsoncPath, getConfigDir } from "@/lib/config-paths";
import { splitConfig } from "@/lib/config-splitter";
import { mergeJsonc, writeNewConfig } from "@/lib/jsonc-writer";

export const dynamic = "force-dynamic";

interface PublishRequestBody {
  config: Record<string, unknown>;
}

export async function POST(request: Request) {
  try {
    const body: PublishRequestBody = await request.json();
    const { config } = body;

    if (!config || typeof config !== "object") {
      return NextResponse.json(
        { success: false, error: "Invalid config data" },
        { status: 400 }
      );
    }

    // Split config into opencode.json and oh-my-openagent.jsonc
    const { opencodeJson, omoJsonc } = splitConfig(
      config as unknown as Parameters<typeof splitConfig>[0]
    );

    // Ensure config directory exists
    const configDir = getConfigDir();
    await fs.mkdir(configDir, { recursive: true });

    const opencodePath = getOpencodeJsonPath();
    const omoPath = getOmoJsoncPath();
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

    return NextResponse.json({
      success: true,
      filesWritten,
      timestamp: Date.now(),
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
