import { NextResponse } from "next/server";
import fs from "fs/promises";
import {
  getPresetsDir,
  getPresetDir,
  getPresetOpencodeJsonPath,
  getPresetOmoJsoncPath,
  getCurrentPresetFilePath,
} from "@/lib/config-paths";
import type { Preset, PresetListResponse, CreatePresetRequest } from "@/types";

export const dynamic = "force-dynamic";

const PRESET_NAME_REGEX = /^[a-zA-Z0-9_-]{1,50}$/;

async function listPresets(): Promise<PresetListResponse> {
  const presetsDir = getPresetsDir();
  let currentPreset: string | null = null;

  try {
    const currentContent = await fs.readFile(getCurrentPresetFilePath(), "utf-8");
    currentPreset = currentContent.trim() || null;
  } catch {
    // .current file doesn't exist
    console.error("[presets] Failed to read .current file:");
  }

  const presets: Preset[] = [];

  try {
    const entries = await fs.readdir(presetsDir, { withFileTypes: true });

    for (const entry of entries) {
      // Skip hidden entries and non-directories
      if (entry.name.startsWith(".") || !entry.isDirectory()) {
        continue;
      }

      const presetName = entry.name;
      const opencodePath = getPresetOpencodeJsonPath(presetName);
      const omoPath = getPresetOmoJsoncPath(presetName);

      let hasOpencodeConfig = false;
      let hasOmoConfig = false;

      try {
        await fs.access(opencodePath);
        hasOpencodeConfig = true;
      } catch {
        // File doesn't exist
        console.error("[presets] Failed to access opencode.json:");
      }

      try {
        await fs.access(omoPath);
        hasOmoConfig = true;
      } catch {
        // File doesn't exist
        console.error("[presets] Failed to access oh-my-openagent.jsonc:");
      }

      // Get directory stats
      const stat = await fs.stat(getPresetDir(presetName));

      presets.push({
        name: presetName,
        createdAt: stat.birthtimeMs,
        modifiedAt: stat.mtimeMs,
        hasOpencodeConfig,
        hasOmoConfig,
      });
    }
  } catch {
    // Presets directory doesn't exist yet
    console.error("[presets] Failed to read presets directory:");
  }

  return { presets, currentPreset };
}

export async function GET() {
  try {
    const result = await listPresets();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to list presets", details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreatePresetRequest;
    const { name, copyFrom } = body;

    // Validate name
    if (!name || !PRESET_NAME_REGEX.test(name)) {
      return NextResponse.json(
        { error: "Invalid preset name. Must be 1-50 characters, alphanumeric, hyphens, and underscores only." },
        { status: 400 }
      );
    }

    // Check if preset already exists
    const presetDir = getPresetDir(name);
    try {
      await fs.access(presetDir);
      return NextResponse.json(
        { error: `Preset "${name}" already exists.` },
        { status: 409 }
      );
    } catch {
      // Directory doesn't exist, safe to create
      console.error("[presets] Preset dir check failed for:", name);
    }

    // Validate copyFrom source if specified
    if (copyFrom) {
      const sourceDir = getPresetDir(copyFrom);
      try {
        await fs.access(sourceDir);
      } catch {
        console.error("[presets] Failed to access source preset:", copyFrom);
        return NextResponse.json(
          { error: `Source preset "${copyFrom}" does not exist.` },
          { status: 404 }
        );
      }
    }
    // Create preset directory
    await fs.mkdir(presetDir, { recursive: true });

    // Copy config files if copyFrom specified
    if (copyFrom) {
      const srcOpencode = getPresetOpencodeJsonPath(copyFrom);
      const dstOpencode = getPresetOpencodeJsonPath(name);
      const srcOmo = getPresetOmoJsoncPath(copyFrom);
      const dstOmo = getPresetOmoJsoncPath(name);

      try {
        await fs.copyFile(srcOpencode, dstOpencode);
      } catch {
        // Source opencode.json doesn't exist, skip
        console.error("[presets] Failed to copy opencode.json:");
      }

      try {
        await fs.copyFile(srcOmo, dstOmo);
      } catch {
        // Source oh-my-openagent.jsonc doesn't exist, skip
        console.error("[presets] Failed to copy oh-my-openagent.jsonc:");
      }
    }

    // Build response preset object
    const stat = await fs.stat(presetDir);
    const preset: Preset = {
      name,
      createdAt: stat.birthtimeMs,
      modifiedAt: stat.mtimeMs,
      hasOpencodeConfig: copyFrom
        ? await fileExists(getPresetOpencodeJsonPath(name))
        : false,
      hasOmoConfig: copyFrom
        ? await fileExists(getPresetOmoJsoncPath(name))
        : false,
    };

    return NextResponse.json({ success: true, preset }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create preset", details: String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = (await request.json()) as { name: string };
    const { name } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Preset name is required." },
        { status: 400 }
      );
    }

    // Check if it's the current preset
    try {
      const currentContent = await fs.readFile(getCurrentPresetFilePath(), "utf-8");
      const currentPreset = currentContent.trim();
      if (currentPreset === name) {
        return NextResponse.json(
          { error: `Cannot delete the current preset "${name}". Switch to another preset first.` },
          { status: 400 }
        );
      }
    } catch {
      // .current file doesn't exist, safe to proceed
      console.error("[presets] Failed to read .current file for delete check:");
    }

    // Check if preset exists
    const presetDir = getPresetDir(name);
    try {
      await fs.access(presetDir);
    } catch {
      console.error("[presets] Failed to access preset dir for delete:", name);
      return NextResponse.json(
        { error: `Preset "${name}" does not exist.` },
        { status: 404 }
      );
    }

    // Delete preset directory
    await fs.rm(presetDir, { recursive: true, force: true });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete preset", details: String(error) },
      { status: 500 }
    );
  }
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    console.error("[presets] fileExists check failed for:", filePath);
    return false;
  }
}
