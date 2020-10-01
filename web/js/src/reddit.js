import "./array.js"
import { observer, lazyload } from "./observe.js"
import { reddit } from "./reddit.api.js"
import { gfycat, redgifs } from "./external.js"
import { createVideo } from "./video.js"

import Bricks from "bricks.js"

const fetchJsonp = require("fetch-jsonp")

const favicon = document.getElementById("icon")
const ribbon = document.getElementById("reddit-ribbon")
const searchInput = document.querySelector("input")
const spinner = document.getElementById("spinner")

const overlay = document.getElementById("overlay")
const fullPost = document.getElementById("full-post")
const comments = document.getElementById("comments")

const once = { once: true }

loadConfig("/config.json").then(main)

function main(config) {
	let isLoading = true
	let end = false

	const sizes = [
		{ columns: 1, gutter: 10 },
		{ mq: "800px", columns: 2, gutter: 10 },
		{ mq: "1280px", columns: 3, gutter: 10 },
		{ mq: "1920px", columns: 4, gutter: 10 }
	]

	const brick = Bricks({
		container: ribbon,
		packed: 'data-packed',
		sizes: sizes,
		position: false
	}).resize(true)

	//TODO: Rename me
	const options = parseUrl(new URL(window.location.href))

	const requestPosts = (after) => {
		isLoading = true

		reddit.requestPosts(options.subreddit, options.sorting, after).then(posts => {
			end = isLoading = posts.length === 0

			if (end) return

			addPosts(posts)
			spinner.style.display = "none"
			brick.pack()
			isLoading = false
		})
	}

	const loadOnScroll = (event) => {
		if (!isLoading && !end && ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 1000)) {
			requestPosts(ribbon.lastChild.name ?? "")
		}
	}

	window.addEventListener("scroll", loadOnScroll)

	// Sort buttons
	Array.from(document.getElementById("sorting").children).forEach((button, i) => {
		button.onclick = () => {
			options.sorting = reddit.sortMethods.subreddit[i]

			empty(ribbon)
			window.scrollTo(0, 0)
			spinner.style.display = ""
			isLoading = true
			end = false

			requestPosts()
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

	searchInput.addEventListener("keypress", e => {
		if (e.keyCode === 13) {
			search(options.subreddit, searchInput.value).then(brick.pack)

			//TODO: History states
			// history.pushState(null, "", `/r/${options.subreddit}/search?q=${searchInput.value}`)
		}
	})

	reddit.requestAbout(options.subreddit).then(data => {
		document.title = data.title
		favicon.href = data.icon_img
	})

	if (options.fullPost) {
		reddit.requestPost(window.location.pathname, options.sorting).then(data => {
			const post = reddit.post(data[0].data.children[0].data)

			const div = createPost(post)
			const title = div.getElementsByClassName("post-title")[0]
			const content = div.getElementsByClassName("post-content")[0]

			openFullPost(title, content, div.permalink)
		})

	} else requestPosts()
}

function addPosts(data) {
	const frag = document.createDocumentFragment()

	data.forEach(child => {
		const post = reddit.post(child.data)
		const div = createPost(post)

		div.addEventListener("click", clickPost)

		frag.appendChild(div)
	})

	ribbon.appendChild(frag)
}

function clickPost() {
	this.style.display = "none"

	const title = this.getElementsByClassName("post-title")[0]
	const content = this.getElementsByClassName("post-content")[0]

	openFullPost(title, content, this.permalink).then(() => {
		this.appendChild(title)
		this.appendChild(content)

		this.style.display = ""
	})
}

function parseUrl(url) {
	const parts = url.pathname.split('/')

	const result = {
		subreddit: parts[2],
		fullPost:  false,
		sorting:   undefined,
	}

	if (parts[3] === "comments") {
		result.sorting = url.searchParams.get("sort") ?? reddit.sortMethods.comments[0]
		result.fullPost = true
	} else {
		result.sorting = reddit.sortMethods.subreddit.includes(parts[3]) ? parts[3] : reddit.sortMethods.subreddit[0]
	}

	return result
}

function search(subreddit, query) {
	spinner.style.display = ""

	return reddit.requestSearch(query, subreddit).then(posts => {
		empty(ribbon)

		window.scrollTo(0,0);

		addPosts(posts)

		spinner.style.display = "none"
	})
}

function openFullPost(title, content, permalink) {
	openOverlay()

	if (comments.loaded !== permalink) {
		empty(comments)

		// TODO: Load more comments, limit levels
		reddit.requestPost(permalink).then(json => {
			const frag = document.createDocumentFragment()

			json[1].data.children.forEach((child, i) => {
				if (child.kind !== "more")
					addComment(frag, child.data)
			})

			comments.appendChild(frag)
			comments.loaded = permalink
		})
	}

	fullPost.insertBefore(content, fullPost.firstChild)
	fullPost.insertBefore(title, fullPost.firstChild)

	// TODO:
	const media = content.firstChild
	if (media && media.source) {
		media.src = media.source
		delete media.source
	}

	const subTitle = document.title
	document.title = title.textContent

	history.pushState(null, title.textContent, permalink)

	return new Promise((resolve, reject) => {
		overlay.onclick = () => {
			closeOverlay()

			document.title = subTitle
			history.pushState(null, subTitle, window.location.pathname.substring(0, window.location.pathname.indexOf("comments") - 1))

			resolve()
		}
	})
}

function addComment(fragment, data, level = 0) {
	const comment = createComment(data.author, data.body_html, ago(new Date(data.created_utc * 1000)))
	comment.style.paddingLeft = 21 * level + "px";
	fragment.appendChild(comment)
	setTimeout(e => e.style.opacity = 1, 15 * fragment.children.length, comment);

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

	if (post.hint === "image")
	{
		// GIF
		if (post.preview.variants.mp4)
		{
			let url = post.preview.variants.mp4.source.url

			if (post.preview.variants.mp4.resolutions.length > 0)
				url = post.preview.variants.mp4.resolutions.last_or(3).url

			content.appendChild(createVideo({ sd: url }))
		}
		else
		{
			let previewURL = post.preview.source.url
			let placeholderURL = post.thumbnail.url

			// TODO: Add config option - placeholder resolution
			if (post.preview.resolutions.length > 0) {
				previewURL = post.preview.resolutions.last_or(3).url
				placeholderURL = post.preview.resolutions[0].url
			}

			content.appendChild(createImg(previewURL, null, post.preview.source.url))
		}

		content.style.height = scale(post.preview.source.height, post.preview.source.width, 400) + "px"
	}
	else if (post.hint === "hosted:video")
	{
		let poster = post.preview.source.url

		if (post.preview.resolutions.length > 0)
			poster = post.preview.resolutions.last_or(3).url

		content.appendChild(createVideo(post.media, poster, true))

		content.style.height = scale(post.media.height, post.media.width, 400) + "px"
	}
	else if (post.hint === "rich:video")
	{
		if (post.media.type === "gfycat.com")
		{
			const gif = gfycat(post.media.oembed.thumbnail_url)
			content.appendChild(createVideo(gif))
			content.style.height = scale(post.media.oembed.thumbnail_height, post.media.oembed.thumbnail_width, 400) + "px"
		}
		else if (post.media.type === "redgifs.com")
		{
			const video = createVideo(null, post.preview.source.url)

			video.addEventListener("enterView", () => {
				redgifs(post.url).then(urls => {
					video.addSource(urls.sd, "video/mp4")
					video.addSource(urls.hd, "video/mp4")
					video.load()
				})
			}, once)

			content.appendChild(video)
			content.style.height = scale(post.preview.source.height, post.preview.source.width, 400) + "px"
		}
		else
		{
			content.innerHTML += post.media.oembed.html
			content.firstChild.dataset.src = content.firstChild.src
			content.firstChild.src = ""
			content.firstChild.style.cssText = ""
			content.firstChild.addEventListener("enterView", (e) => lazyload(e.target, "src"), once)

			content.style.height = scale(post.media.oembed.height, post.media.oembed.width, 400) + "px"
			observer.observe(content.firstChild)
		}
	}
	else if (post.hint === "link") // Reposts
	{
		let previewURL = post.preview.source.url
		let placeholderURL = post.thumbnail.url

		if (post.preview.resolutions.length > 0) {
			previewURL = post.preview.resolutions.last_or(3).url
			placeholderURL = post.preview.resolutions[0].url
		}

		content.appendChild(createLink(post.url, createImg(previewURL, placeholderURL)))
		content.style.height = scale(post.preview.source.height, post.preview.source.width, 400) + "px"
	}
	else if (post.html != null)
	{
		content.innerHTML += post.html
		// Remove SC_ON / SC_OFF commments
		content.childNodes[0].remove()
		content.childNodes[1].remove()
	}
	else if (post.url.endsWith(".jpg"))
	{
		content.appendChild(createImg(post.url))
	}
	else if (post.gallery)
	{
		const images = post.gallery.map(img => wrap(createImg(img.p.last_or(3).u, img.p[0].u, img.s.u), "li"))

		content.appendChild(createAlbum(images))
		content.style.height = scale(post.gallery[0].s.y, post.gallery[0].s.x, 400) + "px"
	}
	else if (!post.url.includes(post.permalink))
	{
		content.appendChild(createLink(post.url))
	}

	return content
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

function createImg(url, placeholder, source) {
	const img = document.createElement("img")

	if (placeholder) {
		img.src = placeholder
		img.className = "blur-up"
	}

	img.dataset.src = url
	img.source = source
	img.referrerPolicy = "no-referrer"

	img.addEventListener("enterView", (e) => {
		lazyload(e.target, "src")
		e.target.classList.remove("blur-up")
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
			right.style.display = ""
			if (current === 0)
				left.style.display = "none"
		}

		e.stopPropagation()
	}

	right.onclick = (e) => {
		if (current + 1 < collection.children.length) {
			centerInList(collection.children, ++current)
			left.style.display = ""
			if (current === collection.children.length - 1)
				right.style.display = "none"
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
		elem.removeChild(elem.firstChild)
}

function openOverlay() {
	overlay.style.display   = ""
	fullPost.style.display = ""
	document.body.style.overflow = "hidden"
}

function closeOverlay() {
	overlay.style.display   = "none"
	fullPost.style.display = "none"
	document.body.style.overflow  = ""
}
