import "./array.js"
import { observer, lazyload } from "./observe.js"
import { reddit } from "./reddit.api.js"
import { gfycat, redgifs } from "./external.js"
import { createVideo } from "./video.js"

import Bricks from "bricks.js"

const favicon = document.getElementById("icon")
const ribbon = document.getElementById("reddit-ribbon")
const searchInput = document.querySelector("input")
const spinner = document.getElementById("spinner")

const overlay = document.getElementById("overlay")
const fullPost = document.getElementById("full-post")
const comments = document.getElementById("comments")

// Templates
const t_post = document.getElementById("post-template").content.firstElementChild
const t_iframe = document.getElementById("iframe-template").content
const t_post_link = document.getElementById("post-link-template").content.firstElementChild
const t_img = document.getElementById("img-template").content.firstElementChild
const t_album = document.getElementById("album-template").content.firstElementChild
const t_comment = document.getElementById("comment-template").content.firstElementChild

const once = { once: true }

//TODO: Rename me
let options

const brick = Bricks(
	{
		container: ribbon,
		packed: "bricked",
		sizes: [
			{               columns: 1, gutter: 10 },
			{ mq: "800px",  columns: 2, gutter: 10 },
			{ mq: "1280px", columns: 3, gutter: 10 },
			{ mq: "1920px", columns: 4, gutter: 10 }
		],
		position: false
	}
).resize(true).pack()

loadConfig("/config.json").then(main)

function main(config) {

	hotkeys()

	window.scrollTo({ top: 0, behavior: 'smooth' })

	options = parseUrl(new URL(window.location.href))

	// Sort buttons
	Array.from(document.getElementById("sorting").children).forEach((button, i) => {
		button.onclick = () => {
			if (options.sortSub === reddit.sortMethods.subreddit[i])
				return

			options.sortSub = reddit.sortMethods.subreddit[i]

			window.scrollTo({ top: 0, behavior: 'smooth' })

			reddit.requestPosts(options.subreddit, options.sortSub, "", 100).then(posts => {
				//TODO: Create status element
				if (posts.length === 0) {
					return
				}

				empty(ribbon)

				const more = posts.length >= 100 ? (after) => reddit.requestPosts(options.subreddit, options.sortSub, after) : null
				addPosts(posts, more)
			})

			history.pushState(null, "", `/r/${options.subreddit}/${options.sortSub}`)
		}
	})

	fullPost.addEventListener("click", zoom)

	// TODO: History states
	// window.addEventListener("popstate", (e) => {})

	searchInput.addEventListener("keydown", e => {
		if (e.key === "Enter") {
			const query = searchInput.value.trim()

			if (query.length !== 0)
			{
				search(options.subreddit, query)
				history.pushState(null, "", `/r/${options.subreddit}/search/?q=${searchInput.value}`)
			}
			else
			{
				reddit.requestPosts(options.subreddit, options.sortSub).then(posts => {
					if (posts.length === 0) return

					empty(ribbon)

					const more = posts.length >= 100 ? (after) => reddit.requestPosts(options.subreddit, options.sortSub, after) : null
					addPosts(posts, more)
				})
				history.pushState(null, "", `/r/${options.subreddit}`)
			}
		}
	})

	reddit.requestAbout(options.subreddit).then(data => {
		document.title = data.title
		favicon.href = data.icon_img
	})

	ribbon.addEventListener("click", clickPost)

	if (options.fullPost) {
		reddit.requestPost(window.location.pathname, options.sortComments).then(data => {
			const post = reddit.post(data[0].data.children[0].data)

			const div = createPost(post)
			const title = div.querySelector(".post-title")
			const content = div.querySelector(".post-content")

			openFullPost(title, content, div.permalink)
		})
	}

	reddit.requestPosts(options.subreddit, options.sortSub).then(posts => {
		hide(spinner)

		//TODO: Create status element
		if (posts.length === 0) return

		const more = posts.length >= 100 ? (after) => reddit.requestPosts(options.subreddit, options.sortSub, after) : null
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

function hotkeys() {
	// document.addEventListener("keydown", e => {
		// switch (e.code) {
			// case "Key?": {
			// }
		// }
	// })
}

function addPosts(data, more) {
	if (data.length === 0) return

	const frag = document.createDocumentFragment()

	let accum = 0

	data.forEach(child => {
		const post = reddit.post(child.data)
		accum += post.score
		const div = createPost(post)


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

	if (!post) return

	hide(post)

	const title = post.getElementsByClassName("post-title")[0]
	const content = post.getElementsByClassName("post-content")[0]

	openFullPost(title, content, post.permalink).then(() => {
		post.appendChild(title)
		post.appendChild(content)

		show(post)
	})
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
		result.sortComments = url.searchParams.get("sort") ?? reddit.sortMethods.comments[0]
		result.sortSub = reddit.sortMethods.subreddit[0]
		result.fullPost = true
	} else {
		result.sortSub = reddit.sortMethods.subreddit.includes(parts[3]) ? parts[3] : reddit.sortMethods.subreddit[0]
		result.sortComments = reddit.sortMethods.substring
	}

	return result
}

function search(subreddit, query) {
	return reddit.requestSearch(query, subreddit, "", "", 100).then(posts => {
		empty(ribbon)

		window.scrollTo({ top: 0, behavior: 'smooth' })

		const more = posts.length >= 100 ? (after) => reddit.requestSearch(query, subreddit, "", after) : null
		addPosts(posts, more)
	})
}

function openFullPost(title, content, permalink) {
	openOverlay()

	loadSources(content)

	fullPost.insertBefore(content, fullPost.firstChild)
	fullPost.insertBefore(title, fullPost.firstChild)

	if (comments.loaded !== permalink) {
		empty(comments)

		// TODO: Load more comments, limit levels
		reddit.requestPost(permalink).then(json => {
			const frag = document.createDocumentFragment()

			json[1].data.children.forEach(child => {
				if (child.kind !== "more")
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
		lazyload(img, "source", "src")

		img.decode().then(() => {
			if (img.dataset.src) {
				delete img.dataset.src
				img.classList.add("lazyloaded")
			}
		})
	}

	const video = content.querySelector("video")
	if (video)
		video.loadSource()
}

function addComment(fragment, data, level = 0) {
	const comment = createComment(data.author, data.body_html, ago(new Date(data.created_utc * 1000)))
	comment.style.paddingLeft = 21 * level + "px"
	fragment.appendChild(comment)
	setTimeout(e => e.style.opacity = 1, 15 * fragment.children.length, comment)

	if (data.replies) {
		data.replies.data.children.forEach(child => addComment(fragment, child.data, level + 1))
	}
}

function createPost(post) {
	const div = t_post.cloneNode(true)
	div.name = post.name
	div.score = post.score
	div.permalink = post.permalink

	const title = div.querySelector(".post-title")

	if (post.flair)
		title.appendChild(createFlair(post.flair.text, post.flair.fg, post.flair.bg))

	title.innerHTML += post.title

	div.appendChild(createContent(post))

	return div
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

			content.appendChild(createImg(thumbnail, source))
			content.style.height = scale(post.preview.source.height, post.preview.source.width, 400) + "px"

			break
		}
		case "gif": {
			let urls = { hd: post.preview.variants.mp4.source.url }

			if (post.preview.variants.mp4.resolutions.length > 0)
				urls.sd = post.preview.variants.mp4.resolutions.last_or(3).url

			content.appendChild(createVideo(urls))
			content.style.height = scale(post.preview.source.height, post.preview.source.width, 400) + "px"

			break
		}
		case "gallery": {
			if (post.gallery.length === 0)
				break

			const elements = post.gallery.map(entry => createGalleryElement(entry))

			content.appendChild(createAlbum(elements))
			content.style.height = scale(post.gallery[0].s.y, post.gallery[0].s.x, 400) + "px"

			break
		}
		case "video": {
			let poster = post.preview.source.url

			if (post.preview.resolutions.length > 0)
				poster = post.preview.resolutions.last_or(3).url

			content.appendChild(createVideo(post.media, poster, true))

			content.style.height = scale(post.media.height, post.media.width, 400) + "px"

			break
		}
		case "iframe:gfycat": {
			const gif = gfycat(post.media.oembed.thumbnail_url)
			content.appendChild(createVideo(gif))
			content.style.height = scale(post.media.oembed.thumbnail_height, post.media.oembed.thumbnail_width, 400) + "px"

			break
		}
		case "iframe:redgifs": {
			const video = createVideo(null, post.preview.source.url)

			video.addEventListener("enterView", (e) => {
				redgifs(post.url).then(urls => {
					video.addSource(urls.sd, "video/mp4")
					video.addSource(urls.hd, "video/mp4")
				})
			}, once)

			content.appendChild(video)
			content.style.height = scale(post.preview.source.height, post.preview.source.width, 400) + "px"

			break
		}
		case "iframe": {
			const div = document.createElement("div")
			div.innerHTML = post.media.oembed.html

			content.appendChild(createIframe(div.firstElementChild.src))

			content.style.height = scale(post.media.oembed.height, post.media.oembed.width, 400) + "px"

			break
		}
		case "link": {
			if (post.preview) {
				let thumbnail = post.thumbnail.url
				let source = post.preview.source.url

				if (post.preview.resolutions.length > 0)
					thumbnail = post.preview.resolutions.last_or(3).url

				content.appendChild(createLink(post.url, createImg(thumbnail, source)))
				content.style.height = scale(post.preview.source.height, post.preview.source.width, 400) + "px"

			} else content.appendChild(createLink(post.url))

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
			element = entry.p.length === 0 ?
				createImg(entry.s.gif) : createVideo({ sd: entry.s.mp4 })

			break
		default:
			element = entry.p.length === 0 ?
				createImg(entry.s.u) : createImg(entry.p.last_or(3).u, entry.s.u)
	}

	return wrap(element, "li")
}

function createIframe(src) {
	const fragment = t_iframe.cloneNode(true)

	const iframe = fragment.querySelector("iframe")
	iframe.dataset.src = src

	const loader = fragment.querySelector(".iframe-loader")

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

function createComment(author, html, date) {
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

function createFlair(text, fg, bg) {
	const flair = document.createElement("div")
	flair.innerText = text
	flair.className = "flair flair-" + fg

	if (bg) flair.style.backgroundColor = bg

	return flair
}

function createImg(url, source) {
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

function createLink(url, preview) {
	const a = t_post_link.cloneNode()
	a.href = url

	if (preview) {
		const icon = document.createElement("span")
		icon.innerText = ""
		icon.className = "external-link-icon"

		a.appendChild(preview)
		a.appendChild(icon)
	} else {
		a.innerText = url
	}

	return a
}

function centerInList(list, center) {
	for (let i = 0; i < list.length; i++) {
		list[i].style.left = (i - center) * 100 + "%"
	}
}

function createAlbum(images) {
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

function hide(elem) {
	elem.style.display = "none"
}

function show(elem) {
	elem.style.display = ""
}

function loadConfig(path) {
	return fetch(path).then(resp => resp.json())
}

function scale(a, b, c) {
	return Math.ceil(c * (a / b))
}

function wrap(e, tag = "div") {
	const wrapper = document.createElement(tag)
	wrapper.appendChild(e)
	return wrapper
}

function empty(elem) {
	while (elem.firstChild)
		elem.removeChild(elem.lastChild)
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
