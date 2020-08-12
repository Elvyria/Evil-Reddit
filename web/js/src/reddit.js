import "./array.js"
import { gfycat, redgifs } from "./external.js"
import { reddit } from "./reddit.api.js"

import Bricks from "bricks.js"
import Hls from "hls.js"

const fetchJsonp = require("fetch-jsonp")

const favicon = document.getElementById("icon")
const ribbon = document.getElementById("reddit-ribbon")
const searchInput = document.querySelector("input")
const spinner = document.getElementById("spinner")

const overlay = document.getElementById("overlay")
const fullPost = document.getElementById("full-post")
const comments = document.getElementById("comments")

let hls

const observer = new IntersectionObserver(lazyload, { rootMargin: '100px' })

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

			if (end)
				return

			ribbon.addPosts(posts)
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

	requestPosts()
}

ribbon.addPosts = (data) => {
	const frag = document.createDocumentFragment()

	data.forEach(child => {
		const post = reddit.post(child.data)
		const div = createPost(post)
		frag.appendChild(div)
	})

	ribbon.appendChild(frag)
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
	empty(ribbon)

	spinner.style.display = ""

	window.scrollTo(0,0);

	return reddit.requestSearch(query, subreddit).then(posts => {
		ribbon.addPosts(posts)
		spinner.style.display = "none"
	})
}

function openPost(title, content, permalink) {
	openOverlay()

	if (comments.loaded !== permalink) {
		empty(comments)

		// TODO: Replies
		reddit.requestPost(permalink).then(json => {
			const reveal = (comment) => { comment.style.opacity = 1 }
			const frag = document.createDocumentFragment()

			json[1].data.children.forEach((child, i) => {
				const comment = createComment(child.data)
				frag.appendChild(comment)
				setTimeout(reveal, 15 * i, comment);
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

function createPost(post) {
	const div = document.createElement("div")
	div.name = post.name
	div.className = "ribbon-post"

	const title = document.createElement("div")
	title.className = "post-title"

	if (post.flair)
		title.appendChild( createFlair(post.flair.text, post.flair.fg, post.flair.bg) )

	title.innerHTML += post.title

	div.appendChild(title)

	const content = createContent(post)

	div.appendChild(content)

	div.onclick = (e) => {
		div.style.display = "none"

		openPost(title, content, post.permalink).then(() => {
			div.appendChild(title)
			div.appendChild(content)

			div.style.display = ""
		})
	}

	return div
}

// FIXME: Mom's spaghetti
function createContent(post) {
	const content = document.createElement("div")
	content.className = "post-content"

	if (post.hint === "image") {

		// GIF
		if (post.preview.variants.mp4) {

			let url = post.preview.variants.mp4.source.url

			if (post.preview.variants.mp4.resolutions.length > 0)
				url = post.preview.variants.mp4.resolutions.last_or(3).url

			content.appendChild(
				createVideo({ sd: url }, null, "video/mp4")
			)

		} else {

			let previewURL = post.preview.source.url
			let placeholderURL = post.thumbnail.url

			// TODO: Add config option - placeholder resolution
			if (post.preview.resolutions.length > 0) {
				previewURL = post.preview.resolutions.last_or(3).url
				placeholderURL = post.preview.resolutions[0].url
			}

			content.appendChild(
				createImg(previewURL, placeholderURL, post.preview.source.url)
			)
		}

		content.style.height = scale(post.preview.source.height, post.preview.source.width, 400) + "px"

	} else if (post.hint === "hosted:video") {

		let poster = post.preview.source.url

		if (post.preview.resolutions.length > 0)
			poster = post.preview.resolutions.last_or(3).url

		content.appendChild(
			createVideo({ hls: post.media.reddit_video.hls_url }, poster, "application/vnd.apple.mpegurl", true)
		)

		// For some reason width and height where swapped in media, so here's workaround
		content.style.height = scale(post.preview.source.height, post.preview.source.width, 400) + "px"

	} else if (post.hint === "rich:video") {

		if (post.media.type === "gfycat.com") {
			const gif = gfycat(post.media.oembed.thumbnail_url)
			content.appendChild(
				createVideo(gif, null, "video/mp4")
			)
			content.style.height = scale(post.media.oembed.thumbnail_height, post.media.oembed.thumbnail_width, 400) + "px"
		} else if (post.media.type === "redgifs.com") {
			const video = createVideo(null, post.preview.source.url, "video/mp4")
			video.addEventListener("enterView", () => {
				redgifs(post.url).then(urls => {
					video.addSource(urls.sd, "video/mp4")
					video.addSource(urls.hd, "video/mp4")
					video.load()
				})
			}, { once: true })
			content.appendChild(video)
			content.style.height = scale(post.preview.source.height, post.preview.source.width, 400) + "px"
		} else {
			content.innerHTML += post.media.oembed.html
			content.firstChild.dataset.src = content.firstChild.src
			content.firstChild.src = ""
			content.firstChild.style.cssText = ""

			content.style.height = scale(post.media.oembed.height, post.media.oembed.width, 400) + "px"
			observer.observe(content.firstChild)
		}

	} else if (post.hint === "link") { // Reposts

		let previewURL = post.preview.source.url
		let placeholderURL = post.thumbnail.url

		if (post.preview.resolutions.length > 0) {
			previewURL = post.preview.resolutions.last_or(3).url
			placeholderURL = post.preview.resolutions[0].url
		}

		content.appendChild( createLink(post.url, createImg(previewURL, placeholderURL)) )
		content.style.height = scale(post.preview.source.height, post.preview.source.width, 400) + "px"

	} else if (post.html != null) {
		const textNode = document.createElement("div")
		content.innerHTML += post.html
	} else if (post.url.endsWith(".jpg")) {
		content.appendChild( createImg(post.url) )
	} else if (post.gallery) {
		const images = post.gallery.map(img => wrap(createImg(img.p.last_or(3).u, img.p[0].u, img.s.u), "li"))
		const album = createAlbum(images)

		content.appendChild(album)
		content.style.height = scale(post.gallery[0].s.y, post.gallery[0].s.x, 400) + "px"
	}

	return content
}

function createComment(data) {
	const comment = document.createElement("div")
	comment.className = "comment"

	const author = document.createElement("a")
	author.href = "https://reddit.com/user/" + data.author
	author.className = "comment-author"
	author.innerText = data.author

	const title = document.createElement("div")
	title.appendChild(author)
	title.innerHTML += "  •  " + ago(new Date(data.created_utc * 1000))

	const content = document.createElement("div")
	content.className = "comment-content"
	content.innerHTML = data.body_html

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

function clearBlur(e) {
	e.target.classList.remove("blur-up")
}

function createImg(url, placeholder, source) {
	const img = document.createElement("img")

	img.dataset.src = url
	img.src = placeholder
	img.source = source
	img.className = "blur-up"
	img.referrerPolicy = "no-referrer"

	img.addEventListener("enterView", clearBlur, { once: true })

	observer.observe(img)

	return img
}

function initHLS(event) {
	if (!hls) hls = new Hls()

	if (hls.media) {
		hls.media.pause()
		hls.media.src = null
		hls.destroy()
	}

	hls = new Hls()
	const url = event.target.src
	hls.attachMedia(event.target)
	hls.loadSource(url)
	hls.media.play()
}

function createVideo(urls, poster, type, controls) {
	const video = document.createElement("video")
	video.addSource = addSource

	if (poster) {
		video.dataset.poster = poster
		video.preload = "none"

		observer.observe(video)
	}


	// TODO: Chromium blocks controls if no src where provided
	if (controls) {
		video.controls = true

		// const controls = document.createElement("div")

		// const playpause = document.createElement("div")
		// playpause.addEventListener('click', () => {
		// if (video.paused || video.ended) {
		// video.play()
		// } else {
		// video.pause()
		// }
		// });

		// const progress = document.createElement("progress")
		// video.addEventListener('loadedmetadata', () => {
		// progress.setAttribute('max', video.duration);
		// });

		// const volume = document.createElement("div")
		// const fullscreen = document.createElement("div")

	} else {
		video.loop = video.autoplay =  true
	}

	video.addEventListener("play", onPlay)
	// video.addEventListener("pause", () => {})

	if (!urls) return video

	if (urls.hls) {
		video.src = urls.hls
		video.addEventListener("play", initHLS, { once: true })
	}

	if (urls.sd)
		video.addSource(urls.sd, type)

	if (urls.hd)
		video.addSource(urls.hd, type)

	return video
}

function onPlay(e) {
	const video = e.target
	observer.observe(video)
}

function createLink(url, preview) {
	const a = document.createElement("a")
	a.className = "external-link"
	a.href = url
	a.target = "_blank"
	a.rel = "noreferrer noopener"
	a.onclick = (e) => { e.stopPropagation() }

	const icon = document.createElement("span")
	icon.innerText = ""
	icon.className = "external-link-icon"

	a.appendChild(preview)
	a.appendChild(icon)

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

const enterView = new Event("enterView")

function lazyload(entries, observer) {
	entries.forEach(entry => {
		const el = entry.target

		if (entry.isIntersecting) {
			for (const k in el.dataset) {
				el[k] = el.dataset[k]
				delete el.dataset[k]
			}

			el.dispatchEvent(enterView)

			if (!el.paused)
				observer.unobserve(entry.target)
		} else {
			if (el.tagName === "VIDEO")
				el.pause()
		}

	})
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

function addSource(src, type) {
	const source = document.createElement("source")
	source.src = src
	source.type = type
	this.appendChild(source)
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
