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