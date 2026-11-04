import { resolve } from "node:path";

const directory = resolve(
	process.argv.at(2) ?? "/private/tmp/uwh-home-card-options",
);
const result = await Bun.build({
	entrypoints: [resolve(import.meta.dir, "../review/home-card-options.ts")],
	target: "browser",
	minify: true,
});
if (!result.success)
	throw new Error("Could not build home card review controls.");
const script = result.outputs.at(0);
if (!script) throw new Error("Home card review controls are missing.");
await Bun.write(resolve(directory, "home-card-options.js"), script);
await Bun.write(
	resolve(directory, "home-card-options.html"),
	`<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Home card options</title>
<style>
:root{color-scheme:dark;font-family:Inter,system-ui,sans-serif;background:#111710;color:#edf1df}
*{box-sizing:border-box}body{margin:0;padding:24px}main{max-width:1600px;margin:auto}.controls{position:sticky;top:0;z-index:2;background:#111710;padding:12px 0 1px}
header{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:20px}
h1{font-size:22px;letter-spacing:-.5px;margin:0}h2{font-size:13px;font-weight:500;color:#aebaac;margin:0 0 12px}
nav,.tools,.group{display:flex;gap:6px;align-items:center;flex-wrap:wrap}nav{margin-bottom:24px}
button{font:inherit;font-size:13px;color:inherit;background:#20291f;border:1px solid #3b4736;padding:10px 14px;min-height:44px;border-radius:24px;cursor:pointer}
button[aria-pressed=true]{background:#d8ff63;color:#182018;border-color:#d8ff63}button:focus-visible,input:focus-visible{outline:2px solid #d8ff63;outline-offset:3px}
label{display:flex;gap:8px;align-items:center;min-height:44px;font-size:13px;padding:0 8px}input{accent-color:#d8ff63;width:18px;height:18px}
#comparison{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px;align-items:start}
article{min-width:0}.frame-host{overflow:hidden;border:1px solid #3b4736;border-radius:16px;background:#172016;width:100%}
#comparison[data-viewport=phone] article{width:100%;max-width:390px;justify-self:center}
iframe{display:block;border:0;transform-origin:top left;background:#172016}
@media(max-width:600px){body{padding:12px}#comparison{gap:10px}header{gap:12px}button{padding:9px 12px}h2{font-size:12px}}
</style>
<main>
<div class="controls"><header><h1>Home cards</h1><div class="tools"><div class="group" role="group" aria-label="Viewport"><button data-viewport="phone" aria-pressed="true">Phone</button><button data-viewport="desktop" aria-pressed="false">Desktop</button></div><label><input id="interact" type="checkbox">Interact</label><button id="reset">Reset</button></div></header>
<nav aria-label="Card treatment"><button data-treatment="spotlight" aria-pressed="true">A · Yellow spotlight</button><button data-treatment="wash" aria-pressed="false">B · Color washes</button><button data-treatment="accent" aria-pressed="false">C · Quiet accents</button></nav></div>
<section id="comparison" aria-label="Before and after home cards"></section>
</main><script src="home-card-options.js" defer></script>
</html>`,
);
console.log(
	`Home card review: ${resolve(directory, "home-card-options.html")}`,
);
