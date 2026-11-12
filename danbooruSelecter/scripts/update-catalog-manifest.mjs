import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, lstatSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseCategory, applyNavigation, catalogPath } from '../catalog.mjs';

// Only tracked, direct children are public catalog candidates. Never glob local data.
export function updateManifest(repoRoot) {
    const tracked = execFileSync('git', ['ls-files', '-z', '--', 'danbooruSelecter/json/', 'danbooruSelecter/custom/'], { cwd: repoRoot, encoding: 'utf8' }).split('\0').filter(Boolean);
    const files = [];
    for (const filename of tracked.sort()) {
        const path = filename.replace(/^danbooruSelecter\//, '');
        if (!/^(json|custom)\/[^/]+\.json$/i.test(path)) continue;
        if (path.toLowerCase() === 'custom/index.json') continue;
        catalogPath(path);
        const fullPath = resolve(repoRoot, filename);
        if (!lstatSync(fullPath).isFile()) throw new Error(`${path}: only regular files are supported`);
        let data;
        try {
            data = JSON.parse(readFileSync(fullPath, 'utf8').replace(/^\uFEFF/, ''));
            const [source, name] = path.split('/');
            if (path.toLowerCase() === 'json/index.json') applyNavigation([], data);
            else parseCategory(data, source, name);
        } catch (error) { throw new Error(`${path}: ${error.message}`); }
        files.push(path);
    }
    const output = resolve(repoRoot, 'danbooruSelecter/catalog-manifest.json');
    const content = JSON.stringify({ files }, null, 2) + '\n';
    let previous = '';
    try { previous = readFileSync(output, 'utf8').replace(/\r\n/g, '\n'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    const changed = previous !== content;
    if (changed) writeFileSync(output, content);
    return { files, changed };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
    const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
    const { files, changed } = updateManifest(repoRoot);
    console.log(`${changed ? 'Updated' : 'Unchanged'} manifest: ${files.length} catalog files`);
}
