import { scale, wrap } from "./globals.js"
import { gfycat, redgifs } from "./external.js"
import { elements } from "./elements.js"

const postWidth = 400

export function content(post) {
	return content[post.hint](post)
}

content.element = () => {
	const $element = document.createElement("div")
	$element.className = "post-content"

	return $element
}

content["image"] = (post) => {
	const element = content.element()

	let thumbnail = post.thumbnail.url
	let source = post.url

	if (post.preview && post.preview.resolutions.length > 0)
		thumbnail = post.preview.resolutions.last_or(3).url

	element.appendChild(elements.image(thumbnail, source))
	element.style.height = scale(post.preview.source.height, post.preview.source.width, postWidth) + "px"

	return element
}

content["gif"] = (post) => {
	const element = content.element()

	let urls = { hd: post.preview.variants.mp4.source.url }

	if (post.preview.variants.mp4.resolutions.length > 0)
		urls.sd = post.preview.variants.mp4.resolutions.last_or(3).url

	element.appendChild(elements.video(urls))
	element.style.height = scale(post.preview.source.height, post.preview.source.width, postWidth) + "px"

	return element
}

content["gallery"] = (post) => {
	const element = content.element()

	if (post.gallery.length === 0)
		return element

	const album = elements.album(
		post.gallery.map(createGalleryElement)
	)

	element.appendChild(album)
	element.style.height = scale(post.gallery[0].s.y, post.gallery[0].s.x, postWidth) + "px"

	return element
}

function createGalleryElement(entry) {
	let element

	switch (entry.m) {
		case "image/gif":
			element = entry.s.mp4 ?
				elements.video({ sd: entry.s.mp4 }) : elements.image(entry.s.gif)

			break
		default:
			element = entry.p.length === 0 ?
				elements.image(entry.s.u) : elements.image(entry.p.last_or(3).u, entry.s.u)
	}

	return wrap(element, "li")
}

content["video"] = (post) => {
	const element = content.element()

	let poster = post.preview.source.url

	if (post.preview.resolutions.length > 0)
		poster = post.preview.resolutions.last_or(3).url

	element.appendChild(elements.video(post.media, poster, true))

	element.style.height = scale(post.media.height, post.media.width, postWidth) + "px"

	return element
}

content["iframe"] = (post) => {
	const element = content.element()

	const div = document.createElement("div")
	div.innerHTML = post.media.oembed.html

	element.appendChild(elements.iframe(div.firstElementChild.src))

	element.style.height = scale(post.media.oembed.height, post.media.oembed.width, postWidth) + "px"

	return element
}

content["iframe:gfycat"] = (post) => {
	const element = content.element()

	const video = elements.video(() => gfycat(post.media.oembed.thumbnail_url))
	element.appendChild(video)

	element.style.height = scale(post.media.oembed.thumbnail_height, post.media.oembed.thumbnail_width, postWidth) + "px"

	return element
}

content["iframe:redgifs"] = (post) => {
	const element = content.element()

	const video = elements.video(() => redgifs(post.url), post.preview.source.url)

	element.appendChild(video)
	element.style.height = scale(post.preview.source.height, post.preview.source.width, postWidth) + "px"

	return element
}

content["link"] = (post) => {
	const element = content.element()

	if (post.preview) {
		let thumbnail = post.thumbnail.url
		let source = post.preview.source.url

		if (post.preview.resolutions.length > 0)
			thumbnail = post.preview.resolutions.last_or(3).url

		element.appendChild(elements.link(post.url, elements.image(thumbnail, source)))
		element.style.height = scale(post.preview.source.height, post.preview.source.width, postWidth) + "px"

	} else element.appendChild(elements.link(post.url))

	return element
}

content["html"] = (post) => {
	const element = content.element()

	element.innerHTML += post.html

	// Remove SC_ON / SC_OFF commments
	element.childNodes[0].remove()
	element.childNodes[1].remove()

	return element
}

content["unknown"] = (post) => {
	const element = content.element()
	return element
}
