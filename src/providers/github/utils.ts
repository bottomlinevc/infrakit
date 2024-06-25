import * as crypto from "crypto";

export function getShortHash(data: string): string {
  return crypto.createHash("sha256").update(data).digest("hex").substring(0, 6);
}
