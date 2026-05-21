import { fileExists } from "@/lib/server-utils";

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
  getPresetsDir,
} from "@/lib/config-paths";

export const dynamic = "force-dynamic";



export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const presetName = searchParams.get("preset");

    if (!presetName) {
      return NextResponse.json(
        { error: "preset query parameter is required" },
        { status: 400 }
      );
    }

    const presetDir = getPresetDir(presetName);
    try {
      await fs.stat(presetDir);
    } catch {
      return NextResponse.json(
        { error: `Preset "${presetName}" does not exist` },
        { status: 404 }
      );
    }

    const targetOpencodePath = getOpencodeJsonPath();
    const targetOmoPath = getOmoJsoncPath();
    const presetOpencodePath = getPresetOpencodeJsonPath(presetName);
    const presetOmoPath = getPresetOmoJsoncPath(presetName);

    const changedFiles: string[] = [];

    // Check opencode.json
    const runtimeOpencodeExists = await fileExists(targetOpencodePath);
    const presetOpencodeExists = await fileExists(presetOpencodePath);
    if (runtimeOpencodeExists && presetOpencodeExists) {
      const runtimeContent = await fs.readFile(targetOpencodePath, "utf-8");
      const presetContent = await fs.readFile(presetOpencodePath, "utf-8");
      if (runtimeContent !== presetContent) {
        changedFiles.push("opencode.json");
      }
    } else if (runtimeOpencodeExists && !presetOpencodeExists) {
      changedFiles.push("opencode.json");
    }

    // Check oh-my-openagent.jsonc
    const runtimeOmoExists = await fileExists(targetOmoPath);
    const presetOmoExists = await fileExists(presetOmoPath);
    if (runtimeOmoExists && presetOmoExists) {
      const runtimeContent = await fs.readFile(targetOmoPath, "utf-8");
      const presetContent = await fs.readFile(presetOmoPath, "utf-8");
      if (runtimeContent !== presetContent) {
        changedFiles.push("oh-my-openagent.jsonc");
      }
    } else if (runtimeOmoExists && !presetOmoExists) {
      changedFiles.push("oh-my-openagent.jsonc");
    }

    return NextResponse.json({
      presetName,
      hasChanges: changedFiles.length > 0,
      changedFiles,
    });
  } catch (error) {
    console.error("[activate] Failed to check preset diff:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
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

    // Backup existing runtime files before overwriting
    const backupDir = path.join(getPresetsDir(), '.backup', new Date().toISOString().replace(/[:.]/g, '-'));
    const runtimeOpencodePath = getOpencodeJsonPath();
    const runtimeOmoPath = getOmoJsoncPath();
    const filesToBackup: string[] = [];

    if (await fileExists(runtimeOpencodePath)) {
      filesToBackup.push('opencode.json');
    }
    if (await fileExists(runtimeOmoPath)) {
      filesToBackup.push('oh-my-openagent.jsonc');
    }

    if (filesToBackup.length > 0) {
      await fs.mkdir(backupDir, { recursive: true });
      const backupOps: Promise<void>[] = [];

      if (filesToBackup.includes('opencode.json')) {
        backupOps.push(fs.copyFile(runtimeOpencodePath, path.join(backupDir, 'opencode.json')));
      }
      if (filesToBackup.includes('oh-my-openagent.jsonc')) {
        backupOps.push(fs.copyFile(runtimeOmoPath, path.join(backupDir, 'oh-my-openagent.jsonc')));
      }

      await Promise.all(backupOps);
      console.log(`[activate] Backed up ${filesToBackup.length} file(s) to ${backupDir}`);
    }

    // Atomic copy with rollback: copy to temp, rename, restore originals on failure
    const tempDir = path.join(os.tmpdir(), `omo-activate-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });

    const filesCopied: string[] = [];
    // Track original file contents for rollback
    const originals: { dest: string; data: string | null }[] = [];

    try {
      // Copy opencode.json if it exists in preset
      const presetOpencodePath = getPresetOpencodeJsonPath(presetName);
      const targetOpencodePath = getOpencodeJsonPath();
      if (await fileExists(presetOpencodePath)) {
        const tempPath = path.join(tempDir, "opencode.json");
        await fs.copyFile(presetOpencodePath, tempPath);

        // Snapshot original for rollback
        let originalData: string | null = null;
        if (await fileExists(targetOpencodePath)) {
          originalData = await fs.readFile(targetOpencodePath, "utf-8");
        }
        originals.push({ dest: targetOpencodePath, data: originalData });

        await fs.rename(tempPath, targetOpencodePath);
        filesCopied.push("opencode.json");
      }

      // Copy oh-my-openagent.jsonc if it exists in preset
      const presetOmoPath = getPresetOmoJsoncPath(presetName);
      const targetOmoPath = getOmoJsoncPath();
      if (await fileExists(presetOmoPath)) {
        const tempPath = path.join(tempDir, "oh-my-openagent.jsonc");
        await fs.copyFile(presetOmoPath, tempPath);

        // Snapshot original for rollback
        let originalData: string | null = null;
        if (await fileExists(targetOmoPath)) {
          originalData = await fs.readFile(targetOmoPath, "utf-8");
        }
        originals.push({ dest: targetOmoPath, data: originalData });

        await fs.rename(tempPath, targetOmoPath);
        filesCopied.push("oh-my-openagent.jsonc");
      }

      // Write current preset name
      const currentPresetFile = getCurrentPresetFilePath();
      await fs.mkdir(path.dirname(currentPresetFile), { recursive: true });
      await fs.writeFile(currentPresetFile, presetName, "utf-8");
    } catch (copyError) {
      // Rollback: restore all files to their original state
      for (const { dest, data } of originals) {
        try {
          if (data !== null) {
            await fs.writeFile(dest, data, "utf-8");
          } else {
            await fs.unlink(dest);
          }
        } catch (rollbackError) {
          console.error("[activate] Rollback failed for:", dest, rollbackError);
        }
      }
      throw copyError;
    } finally {
      // Always clean up temp dir
      await fs.rm(tempDir, { recursive: true, force: true });
    }

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
