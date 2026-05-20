import { createHash } from "crypto";

/**
 * Compute a short ETag hash from file content.
 * Returns first 16 characters of SHA-256 hex digest.
 */
export function computeEtag(content: string): string {
  return createHash("sha256").update(content).digest("hex").slice(0, 16);
}
