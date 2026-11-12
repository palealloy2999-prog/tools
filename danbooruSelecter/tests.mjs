import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { parseCategory, applyNavigation, safeLink, catalogPath } from './catalog.mjs';
import { formatPrompt, searchItems, itemKey } from './format.mjs';
import { categoryGroups } from './categories.mjs';
const fixture = { 'カテゴリ名': '検証', 'セクション一覧': [{ 'セクション名': '機構', 'タグ一覧': [
    { label: '可動関節', tag: 'joint_(robot)' }, { label: '定型文', tag: '(servo:1.2), metal_frame', original: true },
    { label: 'カテゴリ', tag: 'tag_group:other' }, { label: 'プール', tag: 'pool%20group%3ATest' }, { tag: '' },
] }] };
const normal = parseCategory(fixture, 'json', 'example.json'), custom = parseCategory(fixture, 'custom', 'example.json');
const items = normal.sections[0].items;
assert.equal(items.length, 4);
assert.equal(items[2].target, 'json/other'); assert.equal(items[3].target, 'json/pool_group_test');
assert.equal(items[0].literal, false); assert.equal(custom.sections[0].items[0].literal, true);
assert.equal(formatPrompt({ selected: [...items.slice(0, 2), items[0]], separator: 'comma', remove_underscores: true }), 'joint \\(robot\\), (servo:1.2), metal frame');
assert.equal(formatPrompt({ selected: items.slice(0, 2), separator: 'pipe', remove_underscores: false }), '{joint_\\(robot\\)|(servo:1.2), metal_frame}');
assert.equal(formatPrompt({ selected: [{ tag: '%E0%A4%A', literal: false }], separator: 'comma' }), '%E0%A4%A');
assert.notEqual(itemKey(items[0]), itemKey(custom.sections[0].items[0]));
assert.equal(searchItems([{...items[0], category: '検証', section: '機構'}], '関節 robot').length, 1);
assert.equal(searchItems([{...items[0], category: '検証', section: '機構'}], '関節 missing').length, 0);
applyNavigation([normal], [{ label: '機械', tag: 'root', children: [{ tag: 'example', label: '検証' }] }]);
assert.deepEqual(normal.navigation[0].path, ['機械']);
assert.equal(categoryGroups([normal, custom])[0].label, 'カスタム定型文');
assert.equal(categoryGroups([normal])[0].label, '機械');
assert.equal(safeLink('https://danbooru.donmai.us/posts?tags=robot'), 'https://danbooru.donmai.us/posts?tags=robot');
for (const link of ['javascript:alert(1)', 'https://danbooru.donmai.us.evil.test/', 'https://user@danbooru.donmai.us/', 'http://danbooru.donmai.us/']) assert.equal(safeLink(link), null);
assert.equal(catalogPath('custom/approved.json'), 'custom/approved.json');
for (const path of ['../custom/private.json', 'https://example.org/a.json', 'custom/a/b.json', 'custom/../a.json', 'custom/.hidden.json']) assert.throws(() => catalogPath(path));
assert.throws(() => parseCategory({}, 'custom', 'bad.json'));
assert.throws(() => parseCategory(fixture, 'invalid', 'bad.json'));
assert.deepEqual(JSON.parse(readFileSync(new URL('./catalog-manifest.json', import.meta.url))), {files: []});
const files = readdirSync(new URL('.', import.meta.url));
assert(!files.includes('json') && !files.includes('custom'), 'No private catalog directories may ship');
console.log('PASS: catalog conversion, formatting parity, search, navigation, safe links/paths, empty publication manifest, no private data directories');
