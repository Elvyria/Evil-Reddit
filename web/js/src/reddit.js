import "./array.js"
import { gfycat } from "./external.js"
import { reddit } from "./reddit.api.js"

import "lazysizes"
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

	//TODO: Move under non anonymous function
	window.addEventListener("scroll", () => {
		if (!isLoading && !end && ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 1000)) {
			isLoading = true

			reddit.requestPosts(options.subreddit, options.sorting, ribbon.lastChild.name).then(posts => {
				end = posts.length === 0

				if (!end) {
					ribbon.addPosts(posts)
					brick.update()
				}

				isLoading = false
			})
		}
	})

	// Sort buttons
	Array.from(document.getElementById("sorting").children).forEach((button, i) => {
		button.onclick = () => {
			options.sorting = reddit.sortMethods.subreddit[i]

			empty(ribbon)
			window.scrollTo(0, 0)
			spinner.style.display = ""
			isLoading = true
			end = false

			reddit.requestPosts(options.subreddit, options.sorting).then(data => {
				ribbon.addPosts(data)
				spinner.style.display = "none"
				brick.pack()
				isLoading = false
			})
		}
	})

	// TODO: History states
	// window.addEventListener("popstate", (e) => {})

	// Lazyload video posters
	document.addEventListener("lazybeforeunveil", e => {
		if (e.target.dataset.poster)
			e.target.poster = e.target.dataset.poster
	});

	// Delete fields after loading
	document.addEventListener("lazyloaded", e => {
		if (e.target.dataset.src)
			delete e.target.dataset.src
		if (e.target.dataset.poster)
			delete e.target.dataset.poster
	})

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

	reddit.requestPosts(options.subreddit, options.sorting).then(data => {
		ribbon.addPosts(data)
		spinner.style.display = "none"
		brick.pack()
		isLoading = false
	})
}

// TODO:
ribbon.addPosts = (data) => {
	data.forEach(child => {
		const post = reddit.post(child.data)
		const div = createPost(post)
		ribbon.appendChild(div)
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
	empty(comments)

	// TODO: Replies
	reddit.requestPost(permalink).then(json => {
		json[1].data.children.forEach((child, i) => {
			const comment = createComment(child.data)
			comments.appendChild(comment)
			setTimeout(() => comment.style.opacity = 1, 15 * i);
		})
	})

	fullPost.insertBefore(content, fullPost.firstChild)
	fullPost.insertBefore(title, fullPost.firstChild)

	// TODO:
	const media = content.firstChild
	if (media && media.source) {
		media.src = media.source
		delete media.source
	}

	// TODO: History states
	// history.pushState(null, title.textContent, permalink)

	return new Promise((resolve, reject) => {
		overlay.onclick = () => {
			closeOverlay()

			// TODO: History states
			// history.pushState(null, title.textContent, window.location.pathname.substring(0, window.location.pathname.indexOf("comments") - 1))

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

			content.appendChild( createVideo(url, null, null, "video/mp4") )

		} else {

			let previewURL = post.preview.source.url
			let placeholderURL = post.thumbnail.url

			// TODO: Add config option - placeholder resolution
			if (post.preview.resolutions.length > 0) {
				previewURL = post.preview.resolutions.last_or(3).url
				placeholderURL = post.preview.resolutions[0].url
			}

			content.appendChild( createImg(previewURL, placeholderURL, post.preview.source.url) )
		}

		content.style.height = scale(post.preview.source.height, post.preview.source.width, 400) + "px"

	} else if (post.hint === "hosted:video") {

		let poster = post.preview.source.url

		if (post.preview.resolutions.length > 0)
			poster = post.preview.resolutions.last_or(3).url

		content.appendChild( createVideo(post.media.reddit_video.hls_url, poster, null, "application/vnd.apple.mpegurl", true) )

		// For some reason width and height where swapped in media, so here's workaround
		content.style.height = scale(post.preview.source.height, post.preview.source.width, 400) + "px"

	} else if (post.hint === "rich:video") {

		if (post.media.type === "gfycat.com") {
			const gif = gfycat(post.media.oembed.thumbnail_url)
			content.appendChild( createVideo(gif.sd + ".mp4", null, gif.hd + ".mp4", "video/mp4") )
			content.style.height = scale(post.media.oembed.thumbnail_height, post.media.oembed.thumbnail_width, 400) + "px"
		} else {
			content.innerHTML += post.media.oembed.html
			content.firstChild.dataset.src = content.firstChild.src
			content.firstChild.src = ""
			content.firstChild.style.cssText = ""
			content.firstChild.className = "lazyload"
			content.style.height = scale(post.media.oembed.height, post.media.oembed.width, 400) + "px"
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
		const images = post.gallery.map(img => createImg(img.p.last_or(3).u, img.p[0].u, img.s.u))
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

function createImg(url, placeholder, source) {
	const img = document.createElement("img")

	img.dataset.src = url
	img.src = placeholder
	img.source = source
	img.className = "lazyload blur-up"
	img.referrerPolicy = "no-referrer"

	return img
}

function createVideo(url, poster, source, type, controls) {
	const video = document.createElement("video")
	video.source = source

	if (poster) {
		video.className = "lazyload"
		video.dataset.poster = poster
		video.preload = "none"
	}

	if (type === "application/vnd.apple.mpegurl") {
		video.addEventListener("play", () => {
			if (!hls) hls = new Hls()

			if (hls.media === video) return

			if (hls.media) {
				hls.media.pause()
				hls.media.src = null
				hls.destroy()
			}

			hls = new Hls()
			hls.attachMedia(video)
			hls.loadSource(url)
			hls.media.play()
		})
	} else {
		const sourceElement = document.createElement("source")
		sourceElement.src = url
		sourceElement.type = type

		video.appendChild(sourceElement)
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
		video.loop = video.autoplay = true
	}

	// video.addEventListener("play", () => {})
	// video.addEventListener("pause", () => {})


	return video
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

function createAlbum(images) {
	const album  = document.createElement("div")
	const collection = document.createElement("div")
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

	let i = 0

	left.onclick = (e) => {
		if (i > 0) {
			collection.style.right = --i * 100 + "%"
			right.style.display = ""
			if (i === 0) {
				left.style.display = "none"
			}
		}

		e.stopPropagation()
	}

	right.onclick = (e) => {
		if (i + 1 < collection.children.length) {
			collection.style.right = ++i * 100 + "%"
			left.style.display = ""
			if (i === collection.children.length - 1) {
				right.style.display = "none"
			}
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

function wrap(e) {
	const div = document.createElement("div")
	div.appendChild(e)
	return div
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
