import { ago, once, hide, show } from "./globals.js"
import { observer, lazyload } from "./observe.js"
import { video } from "./video.js"

export const elements = {}

// Templates
const t_post      = document.getElementById("post-template").content.firstElementChild
const t_flair     = document.getElementById("flair-template").content.firstElementChild
const t_iframe    = document.getElementById("iframe-template").content
const t_link      = document.getElementById("post-link-template").content.firstElementChild
const t_link_icon = document.getElementById("post-link-icon-template").content.firstElementChild
const t_img       = document.getElementById("img-template").content.firstElementChild
const t_album     = document.getElementById("album-template").content.firstElementChild
const t_comment   = document.getElementById("comment-template").content.firstElementChild

elements.sortButton = (title, symbol, onclick) => {
	const div = document.createElement("div")
	div.className = "sort-button"
	div.onclick = onclick

	if (symbol) {
		const $icon = document.createElement("span")
		$icon.innerText = symbol
		$icon.className = "sort-icon"
		div.appendChild($icon)
	}

	if (title) {
		const $title = document.createElement("span")
		$title.innerText = title
		$title.className = "sort-title"
		div.appendChild($title)
	}

	return div
}

elements.post = (title, $content, opts) => {
	const $t        = t_post.cloneNode(true)
	const $title    = $t.querySelector(".post-title")
	const $info     = $t.querySelector(".post-info")
	const $score    = $info.querySelector(".post-info-score")
	const $comments = $info.querySelector(".post-info-comments")
	const $author   = $info.querySelector(".post-info-author")

	if (opts.score) {
		$score.textContent = formatScore(opts.score)
	}
	else hide($score)

	if (opts.comments) {
		$comments.textContent = opts.comments
	}
	else hide($comments)

	if (opts.author) {
		const $a = $author.querySelector("a")
		$a.href = `https://reddit.com${opts.author}`
		$a.innerText = opts.author
	}
	else hide($a)

	if (opts.date) {
		$author.innerHTML += " " + ago(opts.date)
	}

	if (opts.flair) {
		const $flair = elements.flair(opts.flair.text, opts.flair.fg, opts.flair.bg)
		$title.appendChild($flair)
	}

	$title.innerHTML += title
	$t.replaceChild($content, $t.querySelector(".post-content"))

	return $t
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
		iframe.addEventListener("exitView", (_) => {
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
	authorLink.href = `https://reddit.com/user/${author}`
	authorLink.innerText = author

	const content = comment.querySelector(".comment-content")
	content.innerHTML = html

	return comment
}

elements.flair = (text, fg, bg) => {
	const flair = t_flair.cloneNode()
	flair.innerText = text

	if (fg) flair.classList.add("flair-" + fg)
	if (bg) flair.style.backgroundColor = bg

	return flair
}

elements.image = (url, source) => {
	const img = t_img.cloneNode()

	img.dataset.src = url
	img.dataset.source = source
	img.addEventListener("load", () => img.classList.add("lazyloaded"), once)

	img.addEventListener("enterView", (_) => {
		lazyload(img, "src")
	}, once)

	observer.observe(img)

	return img
}

elements.link = (url, preview) => {
	const a = t_link.cloneNode()
	a.href = url

	if (preview) {
		const icon = t_link_icon.cloneNode(true)

		a.append(preview, icon)
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

function formatScore(score) {
	if (score < 0)
		return NaN

	if (score < 10000)
		return score

	if (score >= 10000 && score < 100000)
		return (score / 1000).toFixed(1) + "k"

	if (score >= 100000 && score < 1000000)
		return Math.trunc(score / 1000) + "k"

	return ""
}
