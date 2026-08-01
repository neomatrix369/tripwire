import { createHash } from 'node:crypto';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

// Content hash: file bytes + folder structure for source-based items.
// Git targets can only be hashed after clone happens inside the sandbox (spec Phase 1).
export async function hashLocalPath(target) {
  const hash = createHash('sha256');
  async function walk(p) {
    const st = await stat(p);
    if (st.isDirectory()) {
      const entries = (await readdir(p)).sort();
      for (const e of entries) await walk(path.join(p, e));
    } else {
      hash.update(p);
      hash.update(await readFile(p));
    }
  }
  await walk(target);
  return hash.digest('hex');
}

export function hashSchema(toolSchemaJson) {
  return createHash('sha256').update(JSON.stringify(toolSchemaJson)).digest('hex');
}
