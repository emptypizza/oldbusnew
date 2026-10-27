import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = await readFile(path.join(root, 'index.html'), 'utf8');
const data = JSON.parse(await readFile(path.join(root, 'content/research-data.json'), 'utf8'));
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
assert.equal(new Set(ids).size, ids.length, 'HTML IDs must be unique');
for (const match of html.matchAll(/\bhref="#([^"]+)"/g)) assert(ids.includes(match[1]), `Missing anchor: ${match[1]}`);
for (const match of html.matchAll(/\b(?:src|href)="((?:assets|content)\/[^"#]+|styles\.css|app\.js)"/g)) {
  await access(path.join(root, match[1]));
}
assert.equal(data.fleet.categories.reduce((sum, item) => sum + item.vehicles, 0), data.fleet.total);
assert.equal(data.fleet.categories.reduce((sum, item) => sum + item.operators, 0), data.fleet.operators);
assert.equal(data.scrappage.categories.reduce((sum, item) => sum + item.vehicles, 0), data.scrappage.total);
assert(html.includes(data.fleet.total.toLocaleString('en-US')), 'Fleet number and HTML diverged');
assert(html.includes(data.scrappage.total.toLocaleString('en-US')), 'Scrappage number and HTML diverged');
const sources = new Set(data.sources.map((source) => source.id));
for (const group of data.priceGroups) {
  assert.equal(group.items.length, group.sampleCount);
  assert.equal(Math.min(...group.items.map((item) => item.amountKrw)), group.rangeMinKrw);
  assert.equal(Math.max(...group.items.map((item) => item.amountKrw)), group.rangeMaxKrw);
  for (const item of group.items) {
    assert(Number.isSafeInteger(item.amountKrw) && item.amountKrw > 0, 'Prices must be positive KRW integers');
    assert.equal(item.actualTransactionVerified, false, 'Unverified cases must remain labeled');
    if (item.lotAmountKrw) assert.equal(item.amountKrw * item.vehicles, item.lotAmountKrw);
  }
}
function verifySourceRefs(value) {
  if (!value || typeof value !== 'object') return;
  if (value.sourceIds) for (const id of value.sourceIds) assert(sources.has(id), `Missing source: ${id}`);
  Object.values(value).forEach(verifySourceRefs);
}
verifySourceRefs(data);
console.log(`Verified ${ids.length} unique HTML anchors, linked assets, fleet/scrappage totals, 13 price cases and source references.`);
