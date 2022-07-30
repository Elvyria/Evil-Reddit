export const once = { once: true }

export function ago(date) {
	const suffix = (n) => {
		if (n > 1) {
			return "s ago"
		}

		return " ago"
	}

	let n = Math.floor((new Date() - date) / 1000)
	const result = (n, unit) => `${n} ${unit}${suffix(n)}`

	if (n < 60) return result(n, "second")

	n = Math.floor(n / 60)
	if (n < 60) return result(n, "minute")

	n = Math.floor(n / 60)
	if (n < 24) return result(n, "hour")

	n = Math.floor(n / 24)
	if (n < 365) return result(n, "day")

	return result(Math.floor(n / 365), " year")
}

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
