export const once = { once: true }

export function scale(a, b, c) {
	return Math.ceil(c * (a / b))
}

export function hide(elem) {
	elem.style.display = "none"
}

export function show(elem) {
	elem.style.display = ""
}

export function wrap(e, tag = "div") {
	const wrapper = document.createElement(tag)
	wrapper.appendChild(e)
	return wrapper
}

export function empty(elem) {
	while (elem.firstChild)
		elem.removeChild(elem.lastChild)
}
