import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const source = await readFile(new URL("app.js", root), "utf8");
const catalogs = {};
for (const name of ["lighting.json", "lighting.en.json"]) catalogs[`./${name}`] = JSON.parse(await readFile(new URL(name, root), "utf8"));
class Element {
    constructor(tag) {
        this.tag = tag; this.children = []; this.dataset = {}; this.attributes = {}; this.listeners = {};
        this.value = ""; this.textContent = ""; this.disabled = false; this.scrollTop = 0; this.offsetTop = 0;
        this.classes = new Set();
        this.classList = { add: key => this.classes.add(key), remove: key => this.classes.delete(key), toggle: (key, on) => on ? this.classes.add(key) : this.classes.delete(key) };
    }
    append(...children) { this.children.push(...children); }
    replaceChildren(...children) { this.children = children; }
    setAttribute(key, value) { this.attributes[key] = value; }
    addEventListener(key, callback) { this.listeners[key] = callback; }
    closest(selector) { return selector === ".lp-card" && this.className !== "lp-card" ? null : this; }
    scrollTo(options) { this.scrolled = options; }
    focus() { this.focused = true; }
    select() { this.selected = true; }
    click(target = this) { if (!this.disabled) return this.listeners.click?.({ target }); }
}
async function boot(saved = null, options = {}) {
    const elements = Object.fromEntries(["navigation", "catalog", "count", "clear", "prompt", "copy", "status", "language"].map(id => [id, new Element(id)]));
    for (const id of ["clear", "copy", "language"]) elements[id].disabled = true;
    let stored = saved;
    const copied = [];
    let now = 0, timerId = 0;
    const timers = new Map();
    vm.runInNewContext(source, {
        document: { getElementById: id => elements[id], createElement: tag => new Element(tag) },
        localStorage: { getItem: () => { if (options.storageFails) throw new Error("Blocked"); return stored; }, setItem: (_, value) => { if (options.storageFails) throw new Error("Blocked"); stored = value; } },
        navigator: { clipboard: { writeText: async text => { if (options.copyFails) throw new Error("Denied"); copied.push(text); } } },
        fetch: async path => ({ ok: !options.fetchFails, status: 404, json: async () => catalogs[path] }),
        requestAnimationFrame: callback => callback(), matchMedia: () => ({ matches: false }),
        setTimeout: (callback, delay) => { const id = ++timerId; timers.set(id, { callback, due: now + delay }); return id; },
        clearTimeout: id => timers.delete(id),
    });
    await new Promise(resolve => setTimeout(resolve, 0));
    return {
        elements, copied, get saved() { return stored; }, get pendingTimers() { return timers.size; },
        advance(milliseconds) {
            now += milliseconds;
            for (const [id, timer] of timers) {
                if (timer.due <= now) { timers.delete(id); timer.callback(); }
            }
        },
    };
}
const app = await boot();
const el = app.elements;
const cards = el.catalog.children.filter(element => element.dataset.id);
const headings = el.catalog.children.filter(element => element.tag === "h2");
assert.equal(cards.length, 55);
assert.equal(headings.length, 5);
assert.equal(el.navigation.children.length, 5);
assert.equal(el.navigation.children[0].textContent, "光学効果 (0/8)");
assert.equal(headings[0].textContent, "光学効果 (0/8)");
assert.equal(el.copy.disabled, true);
const choose = id => el.catalog.click(cards.find(card => card.dataset.id === id));
choose("effects_light_streaks"); choose("rendering_volumetric_lighting"); choose("rendering_atmospheric_scattering");
assert.equal(el.prompt.value, "light streaks, volumetric lighting, atmospheric scattering");
assert.ok(el.navigation.children[0].textContent.endsWith("(1/8)"));
assert.ok(el.navigation.children[1].textContent.endsWith("(2/16)"));
await el.copy.click();
assert.deepEqual(app.copied, [el.prompt.value]);
assert.match(el.status.textContent, /Copied!/);
assert.equal(el.status.classes.has("visible"), true);
app.advance(1000);
await el.copy.click();
assert.equal(app.pendingTimers, 1);
app.advance(1200);
assert.equal(el.status.classes.has("visible"), true);
app.advance(1000);
assert.equal(el.status.classes.has("visible"), false);
assert.equal(app.pendingTimers, 0);
await el.copy.click();
choose("effects_light_streaks"); choose("effects_light_streaks");
assert.equal(el.status.classes.has("visible"), false);
assert.equal(app.pendingTimers, 0);
assert.equal(el.prompt.value, "volumetric lighting, atmospheric scattering, light streaks");
headings[2].offsetTop = 780;
el.navigation.click(el.navigation.children[2]);
assert.equal(el.catalog.scrolled.top, 780);
assert.equal(el.catalog.children.length, 60);
const beforeLanguageChange = el.prompt.value;
el.language.value = "en"; el.language.listeners.change();
assert.equal(el.prompt.value, beforeLanguageChange);
assert.equal(el.navigation.children[0].textContent, "Optical Effects (1/8)");
assert.equal(el.navigation.children[1].textContent, "Light Effects (2/16)");
assert.equal(el.catalog.children[0].textContent, "Optical Effects (1/8)");
for (const card of el.catalog.children.filter(element => element.dataset.id)) {
    assert.equal(card.children.length, 2);
    assert.ok(card.title.includes(catalogs["./lighting.en.json"].find(item => item.id === card.dataset.id).description));
}
const restored = await boot(app.saved);
assert.equal(restored.elements.prompt.value, beforeLanguageChange);
assert.equal(restored.elements.language.value, "en");
assert.equal(restored.elements.navigation.children[0].textContent, "Optical Effects (1/8)");
el.clear.click();
assert.equal(el.prompt.value, "");
assert.equal(el.copy.disabled, true);
assert.equal(el.clear.disabled, true);
const legacy = await boot(JSON.stringify({ selected: ["rendering_god_rays", "effects_god_rays", "rendering_bloom", "unknown", null] }));
assert.equal(legacy.elements.prompt.value, "god rays, bloom");
const denied = await boot(JSON.stringify({ selected: ["effects_bloom"] }), { copyFails: true });
await denied.elements.copy.click();
assert.equal(denied.elements.prompt.focused, true);
assert.equal(denied.elements.prompt.selected, true);
assert.match(denied.elements.status.textContent, /Copy failed/);
assert.equal(denied.elements.status.classes.has("visible"), true);
assert.equal(denied.elements.status.classes.has("error"), true);
denied.advance(6000);
assert.equal(denied.elements.status.classes.has("visible"), false);
const blocked = await boot(null, { storageFails: true });
blocked.elements.catalog.click(blocked.elements.catalog.children.find(card => card.dataset.id === "effects_bloom"));
assert.equal(blocked.elements.prompt.value, "bloom");
const failed = await boot(null, { fetchFails: true });
assert.match(failed.elements.status.textContent, /Catalog unavailable/);
assert.equal(failed.elements.copy.disabled, true);
console.log("App checks passed: picker, copy, timed notifications, repeated-copy timer reset, selection dismissal, copy denial, storage and catalog errors.");
