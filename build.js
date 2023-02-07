import { build } from "esbuild";
import { solidPlugin } from "esbuild-plugin-solid";
import fs from "fs";

build({
	entryPoints: ["./src/index.tsx"],
	bundle: true,
	sourcemap: true,
	minify: false,
	format: "esm",
	outfile: "out/dist/bundled.js",
	define: {IS_SSR: "false"},
	logLevel: "info",
	plugins: [solidPlugin({solid: {hydratable: true}})]
}).catch(() => process.exit(1));

build({
	entryPoints: ["./src/ssr.tsx"],
	bundle: true,
	platform: "node",
	format: "esm",
	outfile: "out/ssr/ssr.js",
	logLevel: "info",
	external: ["solid-js"],
	define: {IS_SSR: "true"},
	plugins: [solidPlugin({solid: {generate: "ssr", hydratable: true}})],
}).catch(() => process.exit(1)).then(async () => {
	//Render page
	const ssr = await import("./out/ssr/ssr.js");
	fs.writeFileSync("./out/dist/index.html", ssr.html);
	console.log("index.html was rendered")
});

fs.mkdirSync("./out/dist", {recursive: true});
