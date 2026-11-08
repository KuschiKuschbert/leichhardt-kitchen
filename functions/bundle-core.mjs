/* Bundle the same timing and validation code used by the browser. Firebase deploys only functions/.
   Run before local checks/tests and deployment; this is not an npm install lifecycle hook. */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const source = fileURLToPath(new URL('../js/cooling-core.js', import.meta.url));
const target = fileURLToPath(new URL('./shared-cooling.cjs', import.meta.url));
await writeFile(target, await readFile(source));
