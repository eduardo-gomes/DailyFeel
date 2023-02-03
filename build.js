import { build } from "esbuild";
import { solidPlugin } from "esbuild-plugin-solid";
import fs from "fs";

build({
	entryPoints: ["./src/index.tsx"],
	bundle: true,
	sourcemap: true,
	minify: false,
	format: "esm",
	outfile: "out/bundled.js",
	logLevel: "info",
	plugins: [solidPlugin()]
}).catch(() => process.exit(1));

fs.mkdirSync("./out", {recursive: true});
fs.copyFileSync("./src/index.html", "./out/index.html");