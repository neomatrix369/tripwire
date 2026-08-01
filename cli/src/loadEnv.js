import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';

/** Load repo-root `.env` (cli/bin → ../..), then walk cwd upward as fallback. */
export function loadEnv() {
  const fromPackage = join(dirname(fileURLToPath(import.meta.url)), '../../.env');
  const candidates = [fromPackage];

  let dir = process.cwd();
  for (let i = 0; i < 8; i++) {
    candidates.push(join(dir, '.env'));
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  for (const path of candidates) {
    if (!existsSync(path)) continue;
    config({ path, quiet: true });
    return path;
  }
  return null;
}
