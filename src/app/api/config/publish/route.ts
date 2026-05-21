import { NextResponse } from "next/server";
import fs from "fs/promises";
import { computeEtag } from "@/lib/etag";
import { getPresetOpencodeJsonPath, getPresetOmoJsoncPath, getPresetDir } from "@/lib/config-paths";
import { splitConfig } from "@/lib/config-splitter";
import { mergeJsonc, writeNewConfig } from "@/lib/jsonc-writer";
import { validateConfig } from "@/lib/config-validator";

export const dynamic = "force-dynamic";

interface PublishRequestBody {
  config: Record<string, unknown>;
  etags?: { opencode: string | null; omo: string | null };
  force?: boolean;
  presetName: string;
}


export async function POST(request: Request) {
  try {
    const body: PublishRequestBody = await request.json();
    const { config, etags, force, presetName } = body;

    if (!config || typeof config !== "object") {
      return NextResponse.json(
        { success: false, error: "Invalid config data" },
        { status: 400 }
      );
    }

    if (!presetName) {
      return NextResponse.json(
        { success: false, error: "presetName is required" },
        { status: 400 }
      );
    }

    // Validate config before publishing
    const validation = validateConfig(config);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: "Validation failed", errors: validation.errors },
        { status: 400 }
      );
    }

    const opencodePath = getPresetOpencodeJsonPath(presetName);
    const omoPath = getPresetOmoJsoncPath(presetName);

    // ETag validation (skip if force=true)
    if (etags && !force) {
      let currentOpencodeRaw = "";
      let currentOmoRaw = "";
      try {
        currentOpencodeRaw = await fs.readFile(opencodePath, "utf-8");
      } catch {
        /* file doesn't exist */
        console.error("[publish] Failed to read opencode.json for ETag check:");
      }
      try {
        currentOmoRaw = await fs.readFile(omoPath, "utf-8");
      } catch {
        /* file doesn't exist */
        console.error("[publish] Failed to read oh-my-openagent.jsonc for ETag check:");
      }

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
    await fs.mkdir(getPresetDir(presetName), { recursive: true });

    const filesWritten: string[] = [];

    // Write opencode.json
    let opencodeRaw = "";
    try {
      opencodeRaw = await fs.readFile(opencodePath, "utf-8");
    } catch {
      // File doesn't exist yet
      console.error("[publish] Failed to read opencode.json for merge check:");
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
      console.error("[publish] Failed to read oh-my-openagent.jsonc for merge check:");
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
