import "./array.js"
import "./hotkeys.js"
import { once, scale, hide, show, wrap, empty } from "./globals.js"
import { observer, lazyload } from "./observe.js"
import { reddit as provider } from "./providers/reddit.js"
import { gfycat, redgifs } from "./external.js"

import { elements } from "./elements.js"

import Bricks from "bricks.js"

const ribbon = document.getElementById("reddit-ribbon")
const spinner = document.getElementById("spinner")

const overlay = document.getElementById("overlay")
const fullPost = document.getElementById("full-post")
const comments = document.getElementById("comments")

//TODO: Calculate from style
const postWidth = 400

//TODO: Rename me
let options

const brick = Bricks({

	container: ribbon,
	packed: "bricked",
	sizes: [
		{                           columns: 1, gutter: 10 },
		{ mq: `${postWidth * 2}px`, columns: 2, gutter: 10 },
		{ mq: `${postWidth * 3}px`, columns: 3, gutter: 10 },
		{ mq: `${postWidth * 4}px`, columns: 4, gutter: 10 }
	],
	position: false

}).resize(true).pack()

let clickDistance = 0

main()

function main() {

	document.addEventListener("mousedown", e => { clickDistance = e.x + e.y })
	document.addEventListener("mouseup",   e => { clickDistance = Math.abs(clickDistance - e.x - e.y) })

	window.scrollTo({ top: 0, behavior: 'smooth' })

	options = parseUrl(new URL(window.location.href))

	// Sort buttons
	Array.from(document.getElementById("sorting").children).forEach((button, i) => {
		button.onclick = () => {
			if (options.sortSub === provider.sortMethods.subreddit[i])
				return

			options.sortSub = provider.sortMethods.subreddit[i]

			provider.requestPosts(options.subreddit, options.sortSub, "", 100).then(posts => {
				//TODO: Create status element
				if (posts.length === 0) {
					return
				}

				empty(ribbon)
				window.scrollTo({ top: 0 })

				const more = posts.length >= 100 ? (after) => provider.requestPosts(options.subreddit, options.sortSub, after) : null
				addPosts(posts, more)
			})

			history.pushState(null, "", `/r/${options.subreddit}/${options.sortSub}`)
		}
	})

	fullPost.addEventListener("click", zoom)

	// TODO: History states
	// window.addEventListener("popstate", (e) => {})

	const searchInput = document.querySelector("input")

	searchInput.value = ""

	searchInput.addEventListener("keydown", e => {
		if (e.key === "Enter") {
			const query = searchInput.value.trim()

			if (query.length !== 0) {
				search(options.subreddit, query)
				searchInput.value = ""
			}
		}
	})

	searchInput.addEventListener("focus", () => {
		searchInput.value = searchInput.dataset.value
		searchInput.placeholder = "Search"
	})

	searchInput.addEventListener("blur", () => {
		searchInput.dataset.value = searchInput.value
		searchInput.placeholder = searchInput.dataset.placeholder
		searchInput.value = ""
	})

	provider.requestAbout(options.subreddit).then(data => {
		const iconUrl = data.icon_img !== "" ? data.icon_img : data.community_icon
		document.title = data.title

		const favicon = document.getElementById("favicon")
		favicon.href = iconUrl

		const banner = document.getElementById("banner")
		if (data.banner_background_image !== "") {
			banner.srcset = `${data.banner_background_image} 1x`

			if (data.mobile_banner_image !== "") {
				banner.srcset += `,${data.mobile_banner_image} 2x`
			}

			show(banner)
		}

		const iconImg = document.getElementById("icon-image")
		iconImg.src = iconUrl

		const iconTitle = document.getElementById("icon-title")
		iconTitle.textContent = data.title
	})

	ribbon.addEventListener("click", e => { 
		if (clickDistance < 10)
			clickPost(e)
	})

	if (options.fullPost) {
		provider.requestPost(window.location.pathname, options.sortComments).then(data => {
			const post = provider.post(data[0].data.children[0].data)

			const flair = post.flair ? elements.flair(post.flair.text, post.flair.fg, post.flair.bg) : null

			const div = elements.post(post.title, createContent(post), post.permalink, post.score, flair)
			div.name = post.name

			const title = div.querySelector(".post-title")
			const content = div.querySelector(".post-content")

			openFullPost(title, content, post.permalink)
		})
	}

	provider.requestPosts(options.subreddit, options.sortSub).then(posts => {
		hide(spinner)

		//TODO: Create status element
		if (posts.length === 0) return

		const more = posts.length >= 100 ? (after) => provider.requestPosts(options.subreddit, options.sortSub, after) : null
		addPosts(posts, more)
	})
}

function zoom(event) {
	const content = fullPost.getElementsByClassName("post-content")[0]
	const img = event.target

	if (content.firstChild === img && img.tagName === "IMG" && img.naturalHeight > img.naturalWidth) {
		if (img.classList.contains("zoom-in"))
		{
			content.style.overflowY = ""
			img.classList.remove("zoom-in")
		}
		else
		{
			content.style.overflowY = "scroll"
			img.classList.add("zoom-in")
		}
	}
}

function addPosts(data, more) {
	if (data.length === 0) return

	const frag = document.createDocumentFragment()

	let accum = 0

	data.forEach(child => {
		const post = provider.post(child.data)
		accum += post.score

		const flair = post.flair ? elements.flair(post.flair.text, post.flair.fg, post.flair.bg) : null

		const div = elements.post(post.title, createContent(post), post.permalink, post.score, flair)
		div.name = post.name

		frag.appendChild(div)
	})

	const average = accum / frag.children.length

	for (const post of frag.children) {
		if (post.score > average * 1.5)
			post.classList.add("ribbon-post-top")
	}

	if (more) {
		const lastChild = frag.lastChild

		lastChild.addEventListener("enterView", (e) => {
			observer.unobserve(lastChild)

			more(lastChild.name).then(posts => addPosts(posts, more))
		}, once)

		observer.observe(lastChild)
	}

	const empty = ribbon.children.length === 0

	ribbon.appendChild(frag)

	if (empty)
		brick.pack()
	else
		brick.update()
}

function clickPost(event) {
	const post = event.target.closest(".ribbon-post")

	if (post)
	{
		hide(post)

		const title = post.getElementsByClassName("post-title")[0]
		const content = post.getElementsByClassName("post-content")[0]

		openFullPost(title, content, post.link).then(() => {
			post.appendChild(title)
			post.appendChild(content)

			show(post)
		})
	}
}

function parseUrl(url) {
	const parts = url.pathname.split('/')

	const result = {
		subreddit:    parts[2],
		fullPost:     false,
		sortSub:      undefined,
		sortComments: undefined,
	}

	if (parts[3] === "comments") {
		result.sortComments = url.searchParams.get("sort") ?? provider.sortMethods.comments[0]
		result.sortSub = provider.sortMethods.subreddit[0]
		result.fullPost = true
	} else {
		result.sortSub = provider.sortMethods.subreddit.includes(parts[3]) ? parts[3] : provider.sortMethods.subreddit[0]
		result.sortComments = provider.sortMethods.substring
	}

	return result
}

function search(subreddit, query) {
	history.pushState(null, "", `/r/${options.subreddit}/search/?q=${query}`)

	return provider.requestSearch(query, subreddit, "", "", 100).then(posts => {
		empty(ribbon)

		window.scrollTo({ top: 0 })

		const more = posts.length >= 100 ? (after) => provider.requestSearch(query, subreddit, "", after) : null
		addPosts(posts, more)
	})
}

// TODO: Rework without element movements
function openFullPost(title, content, permalink) {
	openOverlay()

	loadSources(content)

	fullPost.insertBefore(content, fullPost.firstChild)
	fullPost.insertBefore(title,   fullPost.firstChild)

	if (comments.loaded !== permalink) {
		empty(comments)

		// TODO: Load more comments, limit levels
		provider.requestPost(permalink).then(json => {
			const frag = document.createDocumentFragment()

			json[1].data.children.forEach(child => {
				if (child.kind !== "more") // TODO
					addComment(frag, child.data)
			})

			comments.appendChild(frag)
			comments.loaded = permalink
		})
	}

	const subTitle = document.title
	document.title = title.textContent

	history.pushState(null, title.textContent, permalink)

	return new Promise(resolve => {
		overlay.onclick = () => {
			closeOverlay()

			document.title = subTitle
			history.pushState(null, subTitle, window.location.pathname.substring(0, window.location.pathname.indexOf("comments") - 1))

			fullPost.removeChild(title)
			fullPost.removeChild(content)

			resolve()
		}
	})
}

function loadSources(content) {
	const images = content.getElementsByTagName("img")
	for (const img of images)
	{
		img.addEventListener("load", () => {
			delete img.dataset.src
			img.classList.add("lazyloaded")
		}, once)

		lazyload(img, "source", "src")
	}

	const videos = content.getElementsByTagName("video")
	for (const video of videos)
	{
		video.loadSource()
	}
}

function addComment(fragment, data, level = 0) {
	const comment = elements.comment(data.author, data.body_html, ago(new Date(data.created_utc * 1000)))
	comment.style.paddingLeft = 21 * level + "px"
	fragment.appendChild(comment)
	setTimeout(e => e.style.opacity = 1, 15 * fragment.children.length, comment)

	if (data.replies) {
		data.replies.data.children.forEach(child => { 
			if (child.kind !== "more") // TODO
				addComment(fragment, child.data, level + 1)
		})
	}
}

function createContent(post) {
	const content = document.createElement("div")
	content.className = "post-content"

	switch (post.hint) {
		case "image": {
			let thumbnail = post.thumbnail.url
			let source = post.url

			if (post.preview && post.preview.resolutions.length > 0)
				thumbnail = post.preview.resolutions.last_or(3).url

			content.appendChild(elements.image(thumbnail, source))
			content.style.height = scale(post.preview.source.height, post.preview.source.width, postWidth) + "px"

			break
		}
		case "gif": {
			let urls = { hd: post.preview.variants.mp4.source.url }

			if (post.preview.variants.mp4.resolutions.length > 0)
				urls.sd = post.preview.variants.mp4.resolutions.last_or(3).url

			content.appendChild(elements.video(urls))
			content.style.height = scale(post.preview.source.height, post.preview.source.width, postWidth) + "px"

			break
		}
		case "gallery": {
			if (post.gallery.length === 0)
				break

			const images = post.gallery.map(entry => createGalleryElement(entry))

			content.appendChild(elements.album(images))
			content.style.height = scale(post.gallery[0].s.y, post.gallery[0].s.x, postWidth) + "px"

			break
		}
		case "video": {
			let poster = post.preview.source.url

			if (post.preview.resolutions.length > 0)
				poster = post.preview.resolutions.last_or(3).url

			content.appendChild(elements.video(post.media, poster, true))

			content.style.height = scale(post.media.height, post.media.width, postWidth) + "px"

			break
		}
		case "iframe:gfycat": {
			const gif = gfycat(post.media.oembed.thumbnail_url)
			content.appendChild(elements.video(gif))
			content.style.height = scale(post.media.oembed.thumbnail_height, post.media.oembed.thumbnail_width, postWidth) + "px"

			break
		}
		case "iframe:redgifs": {
			const video = elements.video(redgifs(post.url), post.preview.source.url)

			content.appendChild(video)
			content.style.height = scale(post.preview.source.height, post.preview.source.width, postWidth) + "px"

			break
		}
		case "iframe": {
			const div = document.createElement("div")
			div.innerHTML = post.media.oembed.html

			content.appendChild(elements.iframe(div.firstElementChild.src))

			content.style.height = scale(post.media.oembed.height, post.media.oembed.width, postWidth) + "px"

			break
		}
		case "link": {
			if (post.preview) {
				let thumbnail = post.thumbnail.url
				let source = post.preview.source.url

				if (post.preview.resolutions.length > 0)
					thumbnail = post.preview.resolutions.last_or(3).url

				content.appendChild(elements.link(post.url, elements.image(thumbnail, source)))
				content.style.height = scale(post.preview.source.height, post.preview.source.width, postWidth) + "px"

			} else content.appendChild(elements.link(post.url))

			break
		}
		case "html": {
			content.innerHTML += post.html

			// Remove SC_ON / SC_OFF commments
			content.childNodes[0].remove()
			content.childNodes[1].remove()

			break
		}
	}

	return content
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

function ago(date) {
	const suffix = (n) => {
		if (n > 1) {
			return "s ago"
		}

		return " ago"
	}

	let n = Math.floor((new Date() - date) / 1000)
	const result = (n, unit) => n + unit + suffix(n)

	if (n < 60) return result(n, " second")

	n = Math.floor(n / 60)
	if (n < 60) return result(n, " minute")

	n = Math.floor(n / 60)
	if (n < 24) return result(n, " hour")

	n = Math.floor(n / 24)
	if (n < 365) return result(n, " day")

	return result(Math.floor(n / 365), " year")
}

function showSearch() {
	show(overlay)
	document.body.style.overflow = "hidden"
}

function openOverlay() {
	show(overlay)
	show(fullPost)
	document.body.style.overflow = "hidden"
}

function closeOverlay() {
	hide(overlay)
	hide(fullPost)
	document.body.style.overflow  = ""
}
