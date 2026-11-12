export function parseCategory(data, source, filename) {
    if (!['custom', 'json'].includes(source)) throw new Error('読み込み先が不正です');
    if (!data || !Array.isArray(data['セクション一覧'])) throw new Error('セクション一覧がありません');
    const stem = filename.replace(/\.json$/i, '');
    return {
        id: `${source}/${stem}`, source, name: String(data['カテゴリ名'] || stem),
        sections: data['セクション一覧'].map(section => {
            if (!section || !Array.isArray(section['タグ一覧'])) throw new Error('タグ一覧が不正です');
            return { name: String(section['セクション名'] || 'その他'), items: section['タグ一覧'].flatMap(item => {
                if (!item || typeof item.tag !== 'string' || !item.tag.trim()) return [];
                let decoded;
                try { decoded = decodeURIComponent(item.tag); } catch { decoded = item.tag; }
                const lower = decoded.toLowerCase();
                const target = lower.startsWith('tag_group:') ? 'json/' + decoded.slice(10)
                    : lower.startsWith('pool group:') ? 'json/pool_group_' + decoded.slice(11).trim().toLowerCase() : null;
                return [{ tag: item.tag, label: String(item.label ?? item.tag), literal: source === 'custom' || Boolean(item.original), target, link: typeof item.link === 'string' ? item.link : '' }];
            }) };
        }),
    };
}

export function applyNavigation(categories, nodes) {
    if (!Array.isArray(nodes)) throw new Error('カテゴリ索引は配列にしてください');
    const byId = new Map(categories.map(c => [c.id, c]));
    let order = 0;
    function visit(entries, path) {
        for (const node of entries) {
            const category = byId.get('json/' + node.tag);
            const name = category?.name || String(node.label || node.tag || '');
            if (category) (category.navigation ||= []).push({ path, order: order++ });
            if (Array.isArray(node.children)) visit(node.children, [...path, name]);
        }
    }
    for (const category of categories) delete category.navigation;
    visit(nodes, []);
}

export function safeLink(value) {
    try { const url = new URL(value); return url.protocol === 'https:' && url.hostname === 'danbooru.donmai.us' && !url.username && !url.password ? url.href : null; } catch { return null; }
}

export function catalogPath(value) {
    if (typeof value !== 'string' || !/^(json|custom)\/[\w.-]+\.json$/.test(value) || value.split('/')[1].startsWith('.')) throw new Error('データパスが不正です');
    return value;
}
