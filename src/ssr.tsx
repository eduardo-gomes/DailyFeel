import { generateHydrationScript, renderToString } from "solid-js/web";
import Journal from "./components/journal";

const app = renderToString(() => <Journal/>);

const hydration = generateHydrationScript();

// noinspection JSUnusedGlobalSymbols
export default { app, hydration };
