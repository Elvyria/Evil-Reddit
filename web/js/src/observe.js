export const observer = new IntersectionObserver(observe, { rootMargin: '200px' })

const enterView = new Event("enterView")
const exitView = new Event("exitView")

function observe(entries, observer) {
	entries.forEach(entry => {
		const el = entry.target

		if (entry.isIntersecting) {
			el.dispatchEvent(enterView)
		} else {
			el.dispatchEvent(exitView)
		}

		if (!el.observe)
			observer.unobserve(el)
	})
}

export function lazyload(element, name) {
	if (element.dataset[name]) {
		element[name] = element.dataset[name]
		delete element.dataset[name]
	}
}
