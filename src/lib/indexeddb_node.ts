const setGlobalVars = require("indexeddbshim");
// @ts-ignore
// noinspection JSConstantReassignment
global.window = {};
// @ts-ignore
global.location = {origin: "localhost"};
setGlobalVars();

if (typeof window.indexedDB != "object") throw new Error("indexedDB not properly defined");