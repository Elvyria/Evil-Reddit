export const observer = new IntersectionObserver(observe, { rootMargin: '200px' })

const enterView = new Event("enterView")
const exitView = new Event("exitView")

function observe(entries, _observer) {
	entries.forEach(entry => {
		const el = entry.target

		if (entry.isIntersecting)
			el.dispatchEvent(enterView)
		else
			el.dispatchEvent(exitView)
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
	}
}
