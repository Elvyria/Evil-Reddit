export const observer = new IntersectionObserver(observe, { rootMargin: '200px' })

const enterView = new Event("enterView")
const exitView = new Event("exitView")

function observe(entries, _observer) {
	entries.forEach(entry => {
		const el = entry.target

		if (entry.isIntersecting)
		{
			switch (el.tagName) {
				case "IFRAME":
				case "IMG":
					lazyload(el, "src")
					break
				default:
					el.dispatchEvent(enterView)
			}
		}
		else el.dispatchEvent(exitView)
	})
}

export function lazyload(element, data, attr) {
	if (element.dataset[data]) {
		observer.unobserve(element)

		if (attr)
			element[attr] = element.dataset[data]
		else
			element[data] = element.dataset[data]

		delete element.dataset[data]
		element.classList.add("lazyloaded")
	}
}
