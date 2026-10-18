// Observe the same in-source layout reader used by the server. Tests do not
// write geometry through this helper; setup seeds only a disposable fixture.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { readFileLayouts } from '../../../memo-tools/packages/tools/lib/model/view-layout-block.js';
export function parseLayoutSource(text) {
 const qualified=readFileLayouts(text);
 return { layouts:Object.fromEntries(Object.entries(qualified).map(([id,layout])=>[id.split('::').at(-1),layout])) };
}
export const layoutSource = fixture => readFileSync(resolve(fixture,'model/catalog/views.sysml'),'utf8');
export const fixtureLayouts = fixture => parseLayoutSource(layoutSource(fixture)).layouts;
