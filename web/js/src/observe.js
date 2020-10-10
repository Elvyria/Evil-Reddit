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

export function lazyload(element, name) {
	if (element.dataset[name]) {
		element[name] = element.dataset[name]
		element.dataset[name] = null
		observer.unobserve(element)
	}
}
