export default function event_to_promise(target: EventTarget) {
	return new Promise((resolve, reject) => {
		target.addEventListener("success", resolve);
		target.addEventListener("error", reject);
	});
}