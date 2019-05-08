function createImg(link) {
	const img = document.createElement("img")
	img.className = "lazyload"

	if (link.then) {
		link.then( (url) => {
			img.setAttribute("data-src", url)
		})
	}

	else {
		img.setAttribute("data-src", link)
	}

	return img
}

export default createImg