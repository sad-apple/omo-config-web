import * as jsonc from "jsonc-parser";
import type { ParseError } from "jsonc-parser";

/**
 * Merges new data into an existing JSON/JSONC file while preserving comments.
 *
 * @param originalText - The original file content
 * @param newData - The new data to merge
 * @param isJsonc - Whether the file is JSONC (preserve comments) or plain JSON
 * @returns The merged content
 */
export function mergeJsonc(
  originalText: string,
  newData: Record<string, unknown>,
  isJsonc: boolean,
): string {
  // Handle empty or whitespace-only content
  if (!originalText.trim()) {
    return JSON.stringify(newData, null, 2) + "\n";
  }

  if (!isJsonc) {
    // Plain JSON: parse and merge
    try {
      const parsed = JSON.parse(originalText);
      const merged = { ...parsed, ...newData };
      return JSON.stringify(merged, null, 2) + "\n";
    } catch {
      // If parsing fails, fall back to writing new data
      console.error("[jsonc-writer] Failed to parse JSON for merge, writing new data");
      return JSON.stringify(newData, null, 2) + "\n";
    }
  }

  // JSONC: use jsonc-parser to preserve comments
  const errors: ParseError[] = [];
  jsonc.parseTree(originalText, errors);

  // If parsing fails, fall back to writing new data
  if (errors.length > 0) {
    return JSON.stringify(newData, null, 2) + "\n";
  }

  // Apply edits SEQUENTIALLY to avoid offset corruption
  let currentText = originalText;
  const formattingOptions = {
    tabSize: 2,
    insertSpaces: true,
    eol: "\n",
  };

  for (const [key, value] of Object.entries(newData)) {
    const edits = jsonc.modify(currentText, [key], value, { formattingOptions });
    currentText = jsonc.applyEdits(currentText, edits);
  }

  return currentText;
}

/**
 * Writes new config data to a file.
 * For new files, there's no existing content to preserve, so just use JSON.stringify.
 *
 * @param newData - The new data to write
 * @param isJsonc - Whether to output with JSONC comment header
 * @returns The stringified content
 */
export function writeNewConfig(
  newData: Record<string, unknown>,
  isJsonc: boolean,
): string {
  if (isJsonc) {
    // For JSONC files, add a comment header to distinguish from plain JSON
    return "// OMO Config\n" + JSON.stringify(newData, null, 2) + "\n";
  }
  return JSON.stringify(newData, null, 2) + "\n";
}
