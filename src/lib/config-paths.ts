import os from "os";
import path from "path";

export function getConfigDir(): string {
  return path.join(os.homedir(), ".config", "opencode");
}

export function getOpencodeJsonPath(): string {
  return path.join(getConfigDir(), "opencode.json");
}

export function getOmoJsoncPath(): string {
  return path.join(getConfigDir(), "oh-my-openagent.jsonc");
}

export function getPresetsDir(): string {
  return path.join(os.homedir(), ".config", "omo-config-web");
}

export function getPresetDir(presetName: string): string {
  return path.join(getPresetsDir(), presetName);
}

export function getPresetOpencodeJsonPath(presetName: string): string {
  return path.join(getPresetDir(presetName), "opencode.json");
}

export function getPresetOmoJsoncPath(presetName: string): string {
  return path.join(getPresetDir(presetName), "oh-my-openagent.jsonc");
}

export function getCurrentPresetFilePath(): string {
  return path.join(getPresetsDir(), ".current");
}