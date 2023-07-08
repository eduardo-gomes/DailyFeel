export function deepFreeze<T extends Object>(obj: T) {
	for (const name of Reflect.ownKeys(obj)) {
		const value = obj[name as keyof T];
		if ((value && typeof value === "object") || typeof value === "function") deepFreeze(value);
	}
	return Object.freeze(obj);
}