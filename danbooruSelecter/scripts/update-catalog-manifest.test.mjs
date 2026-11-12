import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { updateManifest } from './update-catalog-manifest.mjs';

test('tracked-only discovery, deterministic output, addition, deletion, and validation', () => {
    const root = mkdtempSync(join(tmpdir(), 'danbooru-manifest-test-'));
    const git = (...args) => execFileSync('git', args, {cwd: root, stdio: 'pipe'});
    const write = (name, content) => { const path = join(root, 'danbooruSelecter', name); mkdirSync(join(path, '..'), { recursive: true }); writeFileSync(path, content); };
    const category = JSON.stringify({'カテゴリ名': 'Synthetic', 'セクション一覧': [{'セクション名': 'Example', 'タグ一覧': [{label: 'Example', tag: 'synthetic_tag'}]}]});
    try {
        git('init'); write('catalog-manifest.json', '{"files":[]}');
        write('json/b.json', category); write('custom/a.json', category); write('json/index.json', '[]');
        write('custom/index.json', '{}'); write('json/untracked-private.json', category);
        write('json/nested/ignored.json', '{}'); write('json/notes.txt', 'not catalog data');
        git('add', '--', 'danbooruSelecter/json/b.json', 'danbooruSelecter/custom/a.json', 'danbooruSelecter/json/index.json', 'danbooruSelecter/custom/index.json', 'danbooruSelecter/json/nested/ignored.json', 'danbooruSelecter/json/notes.txt');
        assert.deepEqual(updateManifest(root), {changed: true, files: ['custom/a.json', 'json/b.json', 'json/index.json']});
        assert.equal(updateManifest(root).changed, false);
        git('rm', '-f', '--', 'danbooruSelecter/json/b.json');
        assert.deepEqual(updateManifest(root).files, ['custom/a.json', 'json/index.json']);
        write('json/c.json', '\uFEFF' + category); git('add', '--', 'danbooruSelecter/json/c.json');
        assert.deepEqual(updateManifest(root).files, ['custom/a.json', 'json/c.json', 'json/index.json']);
        const previous = readFileSync(join(root, 'danbooruSelecter/catalog-manifest.json'), 'utf8');
        write('json/bad.json', '{'); git('add', '--', 'danbooruSelecter/json/bad.json');
        assert.throws(() => updateManifest(root), /json\/bad.json/);
        assert.equal(readFileSync(join(root, 'danbooruSelecter/catalog-manifest.json'), 'utf8'), previous);
    } finally { rmSync(root, { recursive: true, force: true }); }
});
