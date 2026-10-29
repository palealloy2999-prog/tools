const navigation = document.getElementById("navigation");
const grid = document.getElementById("catalog");
const count = document.getElementById("count");
const clear = document.getElementById("clear");
const preview = document.getElementById("prompt");
const copy = document.getElementById("copy");
const status = document.getElementById("status");
const language = document.getElementById("language");
const storageKey = "palealloy.lighting-palette.v1";
const labels = {
    optical_effects: { ja: "光学効果", en: "Optical Effects" },
    light_effects: { ja: "光の演出", en: "Light Effects" },
    lighting: { ja: "照明", en: "Lighting" },
    material: { ja: "材質", en: "Material" },
    rendering: { ja: "レンダリング", en: "Rendering" },
};
let items = [], english = [], ids = [], activeCategory = "optical_effects";
const cards = new Map();
const headings = new Map();
let statusTimer;

function showStatus(message, error = false) {
    clearTimeout(statusTimer);
    status.textContent = message;
    status.classList.toggle("error", error);
    status.classList.add("visible");
    statusTimer = setTimeout(() => status.classList.remove("visible"), error ? 6000 : 2200);
}

function save() {
    try {
        localStorage.setItem(storageKey, JSON.stringify({ selected: ids, category: activeCategory, language: language.value }));
    } catch { /* Selection still works when browser storage is unavailable. */ }
}

function refresh() {
    const chosen = new Set(ids);
    for (const [id, card] of cards) {
        card.classList.toggle("selected", chosen.has(id));
        card.setAttribute("aria-pressed", String(chosen.has(id)));
    }
    for (const button of navigation.children) {
        const key = button.dataset.category;
        const entries = items.filter(item => item.category === key);
        const total = entries.filter(item => chosen.has(item.id)).length;
        const label = `${labels[key]?.[language.value] ?? key} (${total}/${entries.length})`;
        button.textContent = label;
        button.setAttribute("aria-current", key === activeCategory ? "location" : "false");
        headings.get(key).textContent = label;
    }
    const prompts = new Map(items.map(item => [item.id, item.prompt]));
    preview.value = [...new Set(ids.map(id => prompts.get(id)))].join(", ");
    count.textContent = `Selected / 選択: ${ids.length}`;
    copy.disabled = ids.length === 0;
    clear.disabled = ids.length === 0;
}

function render() {
    const scrollTop = grid.scrollTop;
    grid.replaceChildren();
    cards.clear();
    headings.clear();
    const localized = new Map((language.value === "en" ? english : items).map(item => [item.id, item]));
    for (const key of new Set(items.map(item => item.category))) {
        const heading = document.createElement("h2");
        heading.className = "lp-heading";
        grid.append(heading);
        headings.set(key, heading);
        for (const entry of items.filter(item => item.category === key)) {
            const item = localized.get(entry.id);
            const card = document.createElement("button");
            card.type = "button";
            card.className = "lp-card";
            card.dataset.id = item.id;
            card.title = `${item.name}${item.name_ja ? ` / ${item.name_ja}` : ""}\n${item.description}`;
            const image = document.createElement("img");
            image.src = `./thumbnails/${item.image}`;
            image.alt = item.name;
            image.width = image.height = 256;
            image.loading = "lazy";
            image.draggable = false;
            const name = document.createElement("strong");
            name.textContent = item.name;
            card.append(image, name);
            if (item.name_ja) {
                const secondary = document.createElement("small");
                secondary.textContent = item.name_ja;
                card.append(secondary);
            }
            grid.append(card);
            cards.set(item.id, card);
        }
    }
    refresh();
    grid.scrollTop = scrollTop;
}

function selectionChanged() {
    clearTimeout(statusTimer);
    status.textContent = "";
    status.classList.remove("visible");
    status.classList.remove("error");
    refresh();
    save();
}

grid.addEventListener("click", event => {
    const card = event.target.closest(".lp-card");
    if (!card) return;
    const id = card.dataset.id;
    ids = ids.includes(id) ? ids.filter(value => value !== id) : [...ids, id];
    selectionChanged();
});

navigation.addEventListener("click", event => {
    const button = event.target.closest("button");
    if (!button) return;
    activeCategory = button.dataset.category;
    const behavior = matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth";
    grid.scrollTo({ top: headings.get(activeCategory).offsetTop, behavior });
    refresh();
    save();
});

clear.addEventListener("click", () => { ids = []; selectionChanged(); });
language.addEventListener("change", () => { render(); save(); });
copy.addEventListener("click", async () => {
    if (!preview.value) return;
    try {
        await navigator.clipboard.writeText(preview.value);
        showStatus("Copied! / コピーしました。");
    } catch {
        preview.focus();
        preview.select();
        showStatus("コピーできませんでした。選択中のテキストを手動でコピーしてください。 / Copy failed; please copy the selected text manually.", true);
    }
});

async function loadCatalog(path) {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`Catalog: ${response.status}`);
    return response.json();
}

async function init() {
    try {
        [items, english] = await Promise.all([loadCatalog("./lighting.json"), loadCatalog("./lighting.en.json")]);
        const categories = [...new Set(items.map(item => item.category))];
        let saved = null;
        try { saved = JSON.parse(localStorage.getItem(storageKey)); } catch { /* Start with an empty selection if saved data cannot be read. */ }
        const canonical = new Map(items.flatMap(item => [item.id, ...(item.aliases ?? [])].map(id => [id, item.id])));
        if (Array.isArray(saved?.selected)) ids = [...new Set(saved.selected.map(id => canonical.get(id)).filter(Boolean))];
        if (categories.includes(saved?.category)) activeCategory = saved.category;
        language.value = saved?.language === "en" ? "en" : "ja";
        for (const key of categories) {
            const button = document.createElement("button");
            button.type = "button";
            button.dataset.category = key;
            navigation.append(button);
        }
        render();
        language.disabled = false;
        requestAnimationFrame(() => grid.scrollTo({ top: headings.get(activeCategory).offsetTop, behavior: "instant" }));
    } catch {
        grid.textContent = "一覧を読み込めませんでした。ページを再読み込みしてください。 / Could not load the catalog. Please reload the page.";
        showStatus("Catalog unavailable / データを読み込めません。", true);
    }
}

init();
