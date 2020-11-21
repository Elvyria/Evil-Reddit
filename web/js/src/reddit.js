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

const once = { once: true }

//TODO: Rename me
let options

const brick = Bricks(
	{
		container: ribbon,
		packed: 'data-packed',
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
		}
	})

	const zoom = (event) => {
		const content = fullPost.getElementsByClassName("post-content")[0]
		const img = event.target

		if (content.firstChild === img && img.tagName === "IMG" && img.naturalHeight > img.naturalWidth) {
			if (img.classList.contains("zoom-in"))
			{
				content.style.overflowY = ''
				img.classList.remove("zoom-in")
			}
			else
			{
				content.style.overflowY = "scroll"
				img.classList.add("zoom-in")
			}
		}
	}

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
			const title = div.getElementsByClassName("post-title")[0]
			const content = div.getElementsByClassName("post-content")[0]

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

function hotkeys() {
	document.addEventListener("keydown", e => {

		switch (e.keyCode) {
			case 191: { // ?
			}
		}
	})
}

function addPosts(data, more) {
	if (data.length === 0) return

	const frag = document.createDocumentFragment()

	data.forEach(child => {
		const post = reddit.post(child.data)
		const div = createPost(post)

		frag.appendChild(div)
	})

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

	console.log("Clicked post")

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

	// TODO: Other elements (extract to loadSource or smth)
	let img = content.firstChild
	if (img && img.tagName === "IMG") {
		delete content.dataset.src
		lazyload(img, "source", "src")
	}

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
	const div = document.createElement("div")
	div.name = post.name
	div.permalink = post.permalink
	div.className = "ribbon-post"

	const title = document.createElement("div")
	title.className = "post-title"

	if (post.flair)
		title.appendChild(createFlair(post.flair.text, post.flair.fg, post.flair.bg))

	title.innerHTML += post.title

	div.appendChild(title)
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

			if (post.preview && post.preview.resolutions.length > 0) {
				thumbnail = post.preview.resolutions.last_or(3).url
			}

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
			const images = post.gallery.map(img => wrap(createImg(img.p.last_or(3).u, img.s.u), "li"))

			content.appendChild(createAlbum(images))
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
				let previewURL = post.preview.source.url

				if (post.preview.resolutions.length > 0) {
					previewURL = post.preview.resolutions.last_or(3).url
				}

				content.appendChild(createLink(post.url, createImg(previewURL)))
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

function createIframe(src) {
	const iframe = document.createElement("iframe")
	iframe.dataset.src = src
	iframe.referrerPolicy = "no-referrer"
	iframe.allowfullscreen = true

	const loader = document.createElement("div")
	loader.className = "iframe-loader"

	const icon = document.createElement("span")
	icon.innerText = "勒"

	loader.appendChild(icon)

	loader.addEventListener("click", (e) => {
		lazyload(iframe, "src")
		loader.remove()

		e.stopPropagation()
	})

	const result = document.createDocumentFragment()
	result.appendChild(loader)
	result.appendChild(iframe)

	return result
}

function createComment(author, html, date) {
	const comment = document.createElement("div")
	comment.className = "comment"

	const authorLink = document.createElement("a")
	authorLink.href = "https://reddit.com/user/" + author
	authorLink.className = "comment-author"
	authorLink.innerText = author

	const title = document.createElement("div")
	title.appendChild(authorLink)
	title.innerHTML += "  •  " + date

	const content = document.createElement("div")
	content.className = "comment-content"
	content.innerHTML = html

	comment.appendChild(title)
	comment.appendChild(content)

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
	const img = document.createElement("img")

	img.dataset.src = url
	img.dataset.source = source
	img.referrerPolicy = "no-referrer"
	img.decoding = "async"

	img.addEventListener("enterView", (e) => {
		lazyload(img, "src")
		img.decode().then(() => img.classList.add("lazyloaded"))
	}, once)

	observer.observe(img)

	return img
}

function createLink(url, preview) {
	const a = document.createElement("a")
	a.className = "external-link"
	a.href = url
	a.target = "_blank"
	a.rel = "noreferrer noopener"
	a.onclick = (e) => { e.stopPropagation() }

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
	const album  = document.createElement("div")
	const collection = document.createElement("ul")
	const left = wrap(document.createElement("div"))
	const right = wrap(document.createElement("div"))

	album.className = "album"
	collection.className = "album-collection"
	left.className = "album-control-left"
	left.firstChild.className = "album-arrow album-left"
	left.style.display = "none"
	right.className = "album-control-right"
	right.firstChild.className = "album-arrow album-right"

	images.forEach(img => collection.appendChild(img))

	let current = 0

	centerInList(collection.children, current)

	left.onclick = (e) => {
		if (current > 0) {
			centerInList(collection.children, --current)
			show(right)
			if (current === 0)
				hide(left)
		}

		e.stopPropagation()
	}

	right.onclick = (e) => {
		if (current + 1 < collection.children.length) {
			centerInList(collection.children, ++current)
			show(left)
			if (current === collection.children.length - 1)
				hide(right)
		}

		e.stopPropagation()
	}

	album.appendChild(collection)
	album.appendChild(left)
	album.appendChild(right)

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
