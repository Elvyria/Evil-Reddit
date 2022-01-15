import { once, hide, show } from "./globals.js"
import { observer, lazyload } from "./observe.js"
import { video } from "./video.js"

export const elements = {}

// Templates
const t_post = document.getElementById("post-template").content.firstElementChild
const t_iframe = document.getElementById("iframe-template").content
const t_link = document.getElementById("post-link-template").content.firstElementChild
const t_link_icon = document.getElementById("post-link-icon-template").content.firstElementChild
const t_img = document.getElementById("img-template").content.firstElementChild
const t_album = document.getElementById("album-template").content.firstElementChild
const t_comment = document.getElementById("comment-template").content.firstElementChild

elements.post = (title_text, body, link, score, flair) => {
	const div = t_post.cloneNode(true)
	const title = div.querySelector(".post-title")

	div.link = link

	if (score)
		div.score = score

	if (flair)
		title.appendChild(flair)

	title.innerHTML += title_text

	div.appendChild(body)

	return div
}

elements.video = video

elements.iframe = (src) => {
	const fragment = t_iframe.cloneNode(true)

	const iframe = fragment.querySelector("iframe")
	iframe.dataset.src = src

	const loader = fragment.querySelector(".iframe-loader")
	const provider = fragment.querySelector(".iframe-provider")
	provider.innerText = new URL(src).host

	loader.addEventListener("click", (e) => {
		iframe.src = iframe.dataset.src
		hide(loader)

		observer.observe(iframe)
		iframe.addEventListener("exitView", (e) => {
			iframe.src = ""
			show(loader)
		}, once)

		e.stopPropagation()
	})

	return fragment
}

elements.comment = (author, html, date) => {
	const comment = t_comment.cloneNode(true)

	const title = comment.querySelector(".comment-title")
	title.innerHTML += "  •  " + date

	const authorLink = comment.querySelector(".comment-author")
	authorLink.href = "https://reddit.com/user/" + author
	authorLink.innerText = author

	const content = comment.querySelector(".comment-content")
	content.innerHTML = html

	return comment
}

elements.flair = (text, fg, bg) => {
	const flair = document.createElement("div")
	flair.innerText = text
	flair.className = "flair flair-" + fg

	if (bg) flair.style.backgroundColor = bg

	return flair
}

elements.image = (url, source) => {
	const img = t_img.cloneNode()

	img.dataset.src = url
	img.dataset.source = source
	img.addEventListener("load", () => img.classList.add("lazyloaded"), once)

	img.addEventListener("enterView", (e) => {
		lazyload(img, "src")
	}, once)

	observer.observe(img)

	return img
}

elements.link = (url, preview) => {
	const a = t_link.cloneNode()
	a.href = url

	if (preview)
	{
		const icon = t_link_icon.cloneNode(true)

		a.appendChild(preview)
		a.appendChild(icon)
	}
	else a.innerText = url.replace(/https?:\/\/(www.)?/, "")

	return a
}

elements.album = (images) => {
	const album = t_album.cloneNode(true)
	const collection = album.querySelector(".album-collection")
	const left = album.querySelector(".album-control-left")
	const right = album.querySelector(".album-control-right")

	images.forEach(img => collection.appendChild(img))

	album.current = 0
	centerInList(collection.children, album.current)

	left.onclick = (e) => {
		if (album.current > 0) {
			centerInList(collection.children, --album.current)
			show(right)
			if (album.current === 0)
				hide(left)
		}

		e.stopPropagation()
	}

	right.onclick = (e) => {
		if (album.current + 1 < collection.children.length) {
			centerInList(collection.children, ++album.current)
			show(left)
			if (album.current === collection.children.length - 1)
				hide(right)
		}

		e.stopPropagation()
	}

	return album
}

function centerInList(list, center) {
	for (let i = 0; i < list.length; i++) {
		list[i].style.left = (i - center) * 100 + "%"
	}
}
