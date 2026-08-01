import { spawn } from 'node:child_process';

// Spawns the Modal sandbox for one scan_run via the local entrypoint
// (sandbox/scan_app.py::main). That host-side wrapper packs local directories into
// a tar and passes bytes to remote scan_item — host paths are not on Modal's FS.
// Do not invoke ::scan_item directly; that skips packing and leaves an empty workdir.
export function spawnScanSandbox({ target, itemType, itemId, scanRunId }) {
  return new Promise((resolve, reject) => {
    const proc = spawn('modal', [
      'run', 'sandbox/scan_app.py',
      '--target', target, '--item-type', itemType, '--item-id', itemId, '--scan-run-id', scanRunId
    ], { stdio: 'inherit' });
    proc.on('exit', code => code === 0 ? resolve() : reject(new Error('sandbox exited ' + code)));
    proc.on('error', reject); // e.g. modal CLI not installed/logged in
  });
}
