declare const IS_SSR: boolean | undefined;
export const SSR = (typeof IS_SSR !== "undefined" ? IS_SSR : false);