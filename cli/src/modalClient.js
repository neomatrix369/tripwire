import { spawn } from 'node:child_process';

// Spawns the Modal sandbox function for one scan_run. Real invocation shells out
// to `modal run`, passing the target + scan_run_id; the sandbox app (sandbox/scan_app.py)
// owns everything from there (copy content in, run scanners, write to Supabase, tear down).
export function spawnScanSandbox({ target, itemType, itemId, scanRunId }) {
  return new Promise((resolve, reject) => {
    const proc = spawn('modal', [
      'run', 'sandbox/scan_app.py::scan_item',
      '--target', target, '--item-type', itemType, '--item-id', itemId, '--scan-run-id', scanRunId
    ], { stdio: 'inherit' });
    proc.on('exit', code => code === 0 ? resolve() : reject(new Error('sandbox exited ' + code)));
    proc.on('error', reject); // e.g. modal CLI not installed/logged in
  });
}
