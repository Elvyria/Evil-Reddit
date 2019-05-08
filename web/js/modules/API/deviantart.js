import createImg from '../createImg.js'

function getDeviantart(url) {
	const backendURL = "https://backend.deviantart.com/oembed?format=jsonp&callback=?&url="
	const img = createImg()

	scriptRequestPromise(backendURL + url)
		.then(json => img.setAttribute("data-src", json.url))

	return img
}

export default getDeviantart