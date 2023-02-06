import { join } from "path";
import { mkdirSync } from "fs";
import { tmpdir } from "os";

const setGlobalVars = require("indexeddbshim");
// @ts-ignore
// noinspection JSConstantReassignment
global.window = {};
// @ts-ignore
global.location = {origin: "localhost"};

const path = join(tmpdir(), "dailyfeel");
mkdirSync(path, {recursive: true});

setGlobalVars(window, {databaseBasePath: path});

if (typeof window.indexedDB != "object") throw new Error("indexedDB not properly defined");