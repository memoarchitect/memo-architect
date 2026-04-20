import { listElements } from '../lib/element-store.mjs';
import { regenerateDocsFromElements } from '../lib/docs-sync.mjs';

function main() {
    const elements = listElements();
    const result = regenerateDocsFromElements(elements);
    console.log(`Synced docs from ${result.counts.total} elements`);
    console.log(`- user needs: ${result.counts.user_needs}`);
    console.log(`- software requirements: ${result.counts.software_requirements}`);
    console.log(`- features: ${result.counts.features}`);
    console.log(`- verification tests: ${result.counts.verification_tests}`);
    for (const file of result.files) {
        console.log(`  wrote: ${file}`);
    }
}

main();
