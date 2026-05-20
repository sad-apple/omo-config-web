import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { computeEtag } from "@/lib/etag";
import {
  getPresetDir,
  getPresetOpencodeJsonPath,
  getPresetOmoJsoncPath,
  getCurrentPresetFilePath,
  getConfigDir,
  getOpencodeJsonPath,
  getOmoJsoncPath,
} from "@/lib/config-paths";

export const dynamic = "force-dynamic";


async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.stat(filePath);
    return true;
  } catch {
    console.error("[activate] fileExists check failed for:", filePath);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { presetName, etags } = body as {
      presetName?: string;
      etags?: { opencode: string | null; omo: string | null };
    };

    if (!presetName || typeof presetName !== "string") {
      return NextResponse.json(
        { error: "presetName is required and must be a string" },
        { status: 400 }
      );
    }

    const presetDir = getPresetDir(presetName);

    // Validate preset directory exists
    try {
      await fs.stat(presetDir);
    } catch {
      console.error("[activate] Failed to stat preset dir:", presetDir);
      return NextResponse.json(
        { error: `Preset "${presetName}" does not exist` },
        { status: 404 }
      );
    }

    // ETag validation
    if (etags) {
      const targetOpencodePath = getOpencodeJsonPath();
      const targetOmoPath = getOmoJsoncPath();

      let currentOpencodeRaw = "";
      let currentOmoRaw = "";
      try {
        currentOpencodeRaw = await fs.readFile(targetOpencodePath, "utf-8");
      } catch {
        /* file doesn't exist */
        console.error("[activate] Failed to read opencode.json for ETag check:");
      }
      try {
        currentOmoRaw = await fs.readFile(targetOmoPath, "utf-8");
      } catch {
        /* file doesn't exist */
        console.error("[activate] Failed to read oh-my-openagent.jsonc for ETag check:");
      }

      const currentOpencodeEtag = currentOpencodeRaw ? computeEtag(currentOpencodeRaw) : null;
      const currentOmoEtag = currentOmoRaw ? computeEtag(currentOmoRaw) : null;

      if (
        (etags.opencode && etags.opencode !== currentOpencodeEtag) ||
        (etags.omo && etags.omo !== currentOmoEtag)
      ) {
        return NextResponse.json(
          {
            error: "Conflict: configuration has been modified by another source",
            serverEtags: { opencode: currentOpencodeEtag, omo: currentOmoEtag },
          },
          { status: 409 }
        );
      }
    }

    const configDir = getConfigDir();

    // Ensure ~/.config/opencode/ directory exists
    await fs.mkdir(configDir, { recursive: true });

    // Atomic copy: copy to temp files first, then rename
    const tempDir = path.join(os.tmpdir(), `omo-activate-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });

    const filesCopied: string[] = [];
    const copyOperations: Promise<void>[] = [];

    // Copy opencode.json if it exists in preset
    const presetOpencodePath = getPresetOpencodeJsonPath(presetName);
    const targetOpencodePath = getOpencodeJsonPath();
    if (await fileExists(presetOpencodePath)) {
      const tempPath = path.join(tempDir, "opencode.json");
      await fs.copyFile(presetOpencodePath, tempPath);
      copyOperations.push(fs.rename(tempPath, targetOpencodePath));
      filesCopied.push("opencode.json");
    }

    // Copy oh-my-openagent.jsonc if it exists in preset
    const presetOmoPath = getPresetOmoJsoncPath(presetName);
    const targetOmoPath = getOmoJsoncPath();
    if (await fileExists(presetOmoPath)) {
      const tempPath = path.join(tempDir, "oh-my-openagent.jsonc");
      await fs.copyFile(presetOmoPath, tempPath);
      copyOperations.push(fs.rename(tempPath, targetOmoPath));
      filesCopied.push("oh-my-openagent.jsonc");
    }

    // Atomic rename all files
    await Promise.all(copyOperations);

    // Cleanup temp dir
    await fs.rm(tempDir, { recursive: true, force: true });

    // Write current preset name
    const currentPresetFile = getCurrentPresetFilePath();
    await fs.mkdir(path.dirname(currentPresetFile), { recursive: true });
    await fs.writeFile(currentPresetFile, presetName, "utf-8");

    return NextResponse.json({
      success: true,
      presetName,
      filesCopied,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Failed to activate preset:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
