import { generateHydrationScript, renderToString } from "solid-js/web";
import Journal from "./components/journal";
import * as fs from "fs";

const app = renderToString(() => <Journal/>);

const page = fs.readFileSync("./src/index.html", {encoding: "utf8"})
	.replace("<!--HydrationScript-->", generateHydrationScript())
	.replace("<!--App-->", app);

// noinspection JSUnusedGlobalSymbols
export { page as html };
