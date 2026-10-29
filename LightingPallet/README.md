# Lighting Prompt Palette

Standalone browser version of [ComfyUI Lighting Prompt Palette](https://github.com/palealloy2999-prog/ComfyUI-Lighting-Prompt-Palette), using its catalog and original thumbnails. ComfyUI, Python, and a build step are not required to use the published app.

Select cards to build an English prompt in click order. Category buttons jump within the list and show selected / total counts. Click **Copy prompt** below the preview to copy it. Deselecting and reselecting moves an item to the end. **Clear All** resets selection. The description language can be chosen independently; Japanese is the default. Selection and language are saved only in this browser.

GitHub Pages serves this directory directly at `https://palealloy2999-prog.github.io/tools/LightingPallet/`. For local preview, serve the repository root with a static HTTP server and open `/LightingPallet/`; opening the HTML directly as a file will not load its JSON catalogs. Clipboard access requires HTTPS or localhost and browser permission. If copying fails, the app selects the prompt for manual copying.

The `lighting.json` and `lighting.en.json` catalogs preserve the original IDs, aliases, category order, prompt tags and image references. All 55 images are 256×256 WebP. Changes to the app do not modify the ComfyUI node.
