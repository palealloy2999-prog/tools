import { DEFAULT_STATE, itemKey, formatPrompt, searchItems } from './format.mjs';
import { categoryGroups } from './categories.mjs';
import { parseCategory, applyNavigation, safeLink, catalogPath } from './catalog.mjs';

const $ = id => document.getElementById(id);
const storageKey = 'palealloy.danbooruSelecter.v1';
let state = structuredClone(DEFAULT_STATE), trailing = true;
let published = [], local = new Map(), navigation = [], localNavigation = null;
let categories = [], all = [], results = [], mode = 'category', limit = 200, timer, noticeTimer, loading = true;
function el(tag, text, className) { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (className) node.className = className; return node; }
function notice(message) { clearTimeout(noticeTimer); $('notice').textContent = message; $('notice').classList.add('visible'); noticeTimer = setTimeout(() => $('notice').classList.remove('visible'), 2800); }
try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (saved) {
        if (saved.version !== 1 || !Array.isArray(saved.selected) || !['comma','pipe','semicolon'].includes(saved.separator) || saved.selected.some(x => !x || typeof x.tag !== 'string' || typeof x.literal !== 'boolean')) throw new Error();
        state = { version: 1, selected: saved.selected.map(x => ({ tag: x.tag, label: String(x.label || x.tag), literal: x.literal })), separator: saved.separator, remove_underscores: saved.remove_underscores !== false };
        trailing = saved.trailing !== false;
    }
} catch { notice('保存内容を読み込めませんでした。初期設定で開始します。'); }
function prompt() {
    return formatPrompt(state);
}
function save() {
    try { localStorage.setItem(storageKey, JSON.stringify({ ...state, trailing })); } catch { notice('ブラウザーに保存できません。この画面では引き続き使えます。'); }
    sync();
}
function sync() {
    $('count').textContent = state.selected.length; $('clear').disabled = !state.selected.length;
    $('copy').disabled = !state.selected.length; $('preview').value = prompt();
    $('separator').value = state.separator; $('underscores').checked = state.remove_underscores; $('trailing').checked = trailing;
    $('chosen').replaceChildren();
    if (!state.selected.length) $('chosen').append(el('p', 'タグを選ぶと、ここに選択順で並びます。', 'empty'));
    for (const item of state.selected) {
        const chip = el('button', (item.label || item.tag) + ' ×', 'chip'); chip.title = item.tag;
        chip.setAttribute('aria-label', (item.label || item.tag) + ' を解除');
        chip.onclick = () => { state.selected = state.selected.filter(x => itemKey(x) !== itemKey(item)); save(); };
        $('chosen').append(chip);
    }
    const keys = new Set(state.selected.map(itemKey));
    for (const input of $('results').querySelectorAll('input')) input.checked = keys.has(input.dataset.key);
}
function render() {
    $('results').replaceChildren();
    const selected = new Set(state.selected.map(itemKey));
    for (const item of results.slice(0, limit)) {
        const row = el('div', undefined, 'row');
        if (item.target) {
            const button = el('button', item.label + ' →'); button.disabled = !categories.some(x => x.id === item.target);
            button.title = button.disabled ? 'このカテゴリのデータがありません' : 'カテゴリを開く';
            button.onclick = () => { $('category').value = item.target; sections(); mode = 'category'; update(); };
            row.append(button);
        } else {
            const label = el('label', undefined, 'toggle'), input = el('input'), text = el('span', undefined, 'text');
            input.type = 'checkbox'; input.dataset.key = itemKey(item); input.checked = selected.has(itemKey(item));
            input.onchange = () => { state.selected = state.selected.filter(x => itemKey(x) !== itemKey(item)); if (input.checked) state.selected.push({ tag: item.tag, label: item.label, literal: item.literal }); save(); };
            text.append(el('span', item.label, 'name'), el('span', item.tag, 'tag'));
            label.title = item.category + ' / ' + item.section; label.append(input, text); row.append(label);
        }
        const href = safeLink(item.link);
        if (href) { const link = el('a', '↗'); link.href = href; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.setAttribute('aria-label', item.label + ' をDanbooruで開く（新しいタブ）'); row.append(link); }
        $('results').append(row);
    }
    if (!results.length) $('results').append(el('p', all.length ? '該当するタグがありません。検索語やカテゴリを変更してください。' : loading ? '公開データを読み込み中…' : '公開データはまだありません。「データを読み込む」から手元のJSONを選択できます。', 'empty'));
    $('more').hidden = results.length <= limit; $('more').textContent = `さらに表示（残り ${Math.max(0, results.length-limit)}）`;
    $('status').textContent = `${mode === 'search' ? '全カテゴリ検索' : 'カテゴリ表示'} · ${results.length} 件${results.length > limit ? ` · ${limit} 件表示` : ''}`;
}
function update() {
    clearTimeout(timer); limit = 200;
    const items = mode === 'search' ? searchItems(all, $('search').value) : all.filter(x => (!$('category').value || x.categoryId === $('category').value) && (!$('section').value || x.section === $('section').value));
    const seen = new Set(); results = items.filter(x => { const key = x.target || itemKey(x); if (seen.has(key)) return false; seen.add(key); return true; });
    render(); $('results').scrollTop = 0;
}
function option(select, label, value) { const o = el('option', label); o.value = value; select.append(o); }
function sections() {
    $('section').replaceChildren(); option($('section'), 'すべてのセクション', '');
    const current = categories.find(x => x.id === $('category').value);
    for (const name of new Set(current?.sections.map(x => x.name) || [])) option($('section'), name, name);
    $('section').disabled = !current;
}
function rebuild() {
    const merged = new Map(published.map(x => [x.id, x])); for (const [key, value] of local) merged.set(key, value);
    categories = [...merged.values()]; applyNavigation(categories, localNavigation ?? navigation);
    const previous = $('category').value; $('category').replaceChildren(); option($('category'), 'すべてのカテゴリ', '');
    for (const group of categoryGroups(categories)) { const node = el('optgroup'); node.label = group.label; for (const x of group.options) option(node, x.label, x.id); $('category').append(node); }
    if (categories.some(x => x.id === previous)) $('category').value = previous;
    sections(); all = categories.flatMap(c => c.sections.flatMap(s => s.items.map(i => ({ ...i, categoryId: c.id, category: c.name, section: s.name }))));
    $('total').textContent = `${all.filter(x => !x.target).length} タグ`; update(); sync();
}
$('search').oninput = () => { mode = 'search'; clearTimeout(timer); timer = setTimeout(update, 120); };
$('search').onfocus = () => { if ($('search').value.trim()) { mode = 'search'; update(); } };
$('search').onkeydown = e => { if (e.key === 'Enter') { mode = 'search'; update(); } };
$('category').onchange = () => { sections(); mode = 'category'; update(); };
$('section').onchange = () => { mode = 'category'; update(); };
$('more').onclick = () => { limit += 200; render(); };
$('clear').onclick = () => { state.selected = []; save(); };
$('separator').onchange = () => { state.separator = $('separator').value; save(); };
$('underscores').onchange = () => { state.remove_underscores = $('underscores').checked; save(); };
$('trailing').onchange = () => { trailing = $('trailing').checked; save(); };
$('copy').onclick = async () => { try { const text = $('preview').value; await navigator.clipboard.writeText(text + (text && trailing ? ',' : '')); notice('コピーしました'); } catch { $('preview').focus(); $('preview').select(); notice('出力欄を選択しました。手動でコピーしてください。'); } };
$('forget').onclick = () => { local.clear(); localNavigation = null; rebuild(); notice('ローカルデータを一覧から外しました。選択中のタグは保持されます。'); };
$('files').onchange = async () => {
    const files = [...$('files').files], source = $('source').value; let loaded = 0; const failed = [];
    for (const file of files) {
        try {
            const data = JSON.parse((await file.text()).replace(/^\uFEFF/, ''));
            if (file.name.toLowerCase() === 'index.json') { if (source === 'json') { applyNavigation([], data); localNavigation = data; } continue; }
            const category = parseCategory(data, source, file.name); local.set(category.id, category); loaded++;
        } catch { failed.push(file.name); }
    }
    rebuild(); $('files').value = ''; notice(`${loaded} ファイルを読み込みました${failed.length ? `。読み込み失敗: ${failed.join('、')}` : ''}`);
};
async function readJSON(path) { const response = await fetch(path, { cache: 'no-cache' }); if (!response.ok) throw new Error(`HTTP ${response.status}`); return JSON.parse((await response.text()).replace(/^\uFEFF/, '')); }
rebuild();
try {
    const manifest = await readJSON('./catalog-manifest.json');
    if (!Array.isArray(manifest.files)) throw new Error('files must be an array');
    const failures = [];
    for (const value of manifest.files) {
        try {
            const path = catalogPath(value), [source, name] = path.split('/');
            const data = await readJSON('./' + path);
            if (name.toLowerCase() === 'index.json') { if (source === 'json') { applyNavigation([], data); navigation = data; } continue; }
            published.push(parseCategory(data, source, name));
        } catch { failures.push(String(value)); }
    }
    if (failures.length) notice(`公開データの読み込み失敗: ${failures.join('、')}`);
} catch { notice('公開データの一覧を読み込めません。ローカルJSONは引き続き利用できます。'); }
loading = false; rebuild();
