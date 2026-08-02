import { spawn as defaultSpawn } from 'node:child_process';

// Spawns the Modal sandbox for one scan_run via the local entrypoint
// (sandbox/scan_app.py::main). That host-side wrapper packs local directories into
// a tar and passes bytes to remote scan_item — host paths are not on Modal's FS.
// Do not invoke ::scan_item directly; that skips packing and leaves an empty workdir.
// `spawnImpl` is injectable for characterization tests (no live Modal).
export function spawnScanSandbox({ target, itemType, itemId, scanRunId, spawnImpl = defaultSpawn }) {
  return new Promise((resolve, reject) => {
    const proc = spawnImpl('modal', [
      'run', 'sandbox/scan_app.py',
      '--target', target, '--item-type', itemType, '--item-id', itemId, '--scan-run-id', scanRunId
    ], { stdio: 'inherit' });
    proc.on('exit', code => code === 0 ? resolve() : reject(new Error('sandbox exited ' + code)));
    proc.on('error', reject); // e.g. modal CLI not installed/logged in
  });
}
