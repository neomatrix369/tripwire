import { spawn as defaultSpawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Resolved package-relatively so `tripwire scan` works from any cwd (T3) —
// hooks and skills invoke the CLI from arbitrary directories, not the repo root.
const SCAN_APP = fileURLToPath(new URL('../../sandbox/scan_app.py', import.meta.url));

// Spawns the Modal sandbox for one scan_run via the local entrypoint
// (sandbox/scan_app.py::main). That host-side wrapper packs local directories into
// a tar and passes bytes to remote scan_item — host paths are not on Modal's FS.
// Do not invoke ::scan_item directly; that skips packing and leaves an empty workdir.
// `spawnImpl` is injectable for characterization tests (no live Modal).
export function spawnScanSandbox({ target, itemType, itemId, scanRunId, packPath = null, spawnImpl = defaultSpawn }) {
  return new Promise((resolve, reject) => {
    const args = [
      'run', SCAN_APP,
      '--target', target, '--item-type', itemType, '--item-id', itemId, '--scan-run-id', scanRunId,
    ];
    // Manifest MCP keys stay the --target identity; packPath is the host dir to tar.
    if (packPath) args.push('--pack-path', packPath);
    const proc = spawnImpl('modal', args, { stdio: 'inherit' });
    proc.on('exit', code => code === 0 ? resolve() : reject(new Error('sandbox exited ' + code)));
    proc.on('error', reject); // e.g. modal CLI not installed/logged in
  });
}
