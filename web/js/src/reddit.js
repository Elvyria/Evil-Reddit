import "lazysizes"
import Bricks from 'bricks.js'
import videojs from "video.js"
import reddit from './reddit.api.js'

const fetchJsonp = require("fetch-jsonp")

const favicon = document.getElementById("icon")
const ribbon = document.querySelector(".reddit-ribbon")
const search_input = document.querySelector("input")
const spinner = document.getElementById("spinner")

const overlay = document.getElementById("overlay")
const full_post = document.getElementById("full-post")

loadConfig("../config.json").then(main)

function main(config) {
	toggleOverlay()

	let isLoading = false

	const brick = Bricks({
		container: ribbon,
		packed: 'data-packed',
		sizes: [{ columns: config.reddit.columns, gutter: config.reddit.gutter }],
		position: false
	}).resize(true)

	videojs.log.level('off');

	//TODO:
	const subreddit = window.location.pathname

	window.addEventListener("scroll", () => {
		if (!isLoading && ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 1000)) {
			isLoading = true

			reddit.requestPosts(subreddit, "hot", ribbon.lastChild.name, 100).then(posts => {
				ribbon.addPosts(posts)
				isLoading = false
				brick.update()
			})
		}
	})

	search_input.addEventListener("keypress", e => {
		if (e.keyCode === 13) {
			search(subreddit, search_input.value)
			brick.pack()
		}
	})

	reddit.requestPosts(subreddit, "hot", "", 100).then(posts => {
		ribbon.addPosts(posts)
		spinner.style.display = "none"
		brick.pack()

		window.scrollTo(0,0);
	})

	reddit.requestAbout(subreddit).then(data => {
		document.title = data.title
		favicon.href = data.icon_img
	})
}

ribbon.addPosts = (data) => {
	data.forEach(child => {
		const post = reddit.post(child.data)

		const div = createPost(post)

		ribbon.appendChild(div)
	})
}

function loadConfig(path) {
	return fetch(path).then(resp => resp.json())
}

// TODO: Duplicate code
function search(subreddit, query) {
	empty(ribbon)
	spinner.style.display = ""

	reddit.requestSearch(query, subreddit).then(posts => {
		ribbon.addPosts(posts)
		spinner.style.display = "none"

		window.scrollTo(0,0);
	})
}

function openPost(div) {
	toggleOverlay()
	empty(full_post.children[0])

	div.style.display = "none"

	// TODO: Replies
	reddit.requestPost(div.permalink).then(json => {
		json[1].data.children.forEach(child => {
			const comment = createComment(child.data)
			full_post.children[2].appendChild(comment)
		})
	})

	let title = div.children[0]
	let content = div.children[1]

	let img = content.getElementsByTagName("img")[0]
	if (img) {
		let img_src = img.getAttribute("source")
		if (img_src) {
			img.src = img_src
		}
	}

	full_post.insertBefore(content, full_post.firstChild)
	full_post.insertBefore(title, full_post.firstChild)

	overlay.onclick = () => {
		toggleOverlay()

		div.appendChild(title)
		div.appendChild(content)

		div.style.display = ""
	}
}

function createPost(post) {
	const div = document.createElement("div")
	div.name = post.name
	div.className = "ribbon-post"
	div.permalink = post.permalink

	const title = document.createElement("div")
	title.className = "post-title"

	if (post.flair) {
		const flair = createFlair(post.flair.text, post.flair.fg, post.flair.bg)
		title.appendChild(flair)
	}

	title.innerHTML += post.title

	div.appendChild(title)

	const content = createContent(post)

	div.appendChild(content)

	div.onclick = () => { openPost(div) }

	return div
}

function createComment(data) {
	const comment = document.createElement("div")
	comment.className = "comment"

	const author = document.createElement("div")
	author.className = "comment-author"
	author.innerText = data.author + "  •  " + ago(new Date(data.created_utc * 1000))

	const content = document.createElement("div")
	content.className = "comment-content"
	content.innerHTML = data.body_html

	// const permalink = document.createElement("a")
	// permalink.href = comment.permalink

	comment.appendChild(author)
	comment.appendChild(content)

	return comment
}

function createFlair(text, fg, bg) {
	const flair = document.createElement("div")
	flair.innerText = text
	flair.className = "flair flair-" + fg
	flair.style.backgroundColor = bg

	return flair
}

function createContent(post) {
	const content = document.createElement("div")
	content.className = "post-content"

	if (post.hint === "image") {
		const previewURL = (post.preview.resolutions.length >= 4) ? post.preview.resolutions[3].url : post.preview.resolutions[post.preview.resolutions.length - 1].url
		const placeholderURL = post.preview.resolutions[0].url

		const img = createImg(previewURL, placeholderURL)
		img.setAttribute("source", post.preview.source.url)
		content.appendChild(img)

		const height = scale(post.preview.source.height, post.preview.source.width, 400)
		content.style.height = height + "px"

	} else if (post.hint === "hosted:video") {
		const video = createVideo(post.media.reddit_video.hls_url)
		content.appendChild(video)

		const height = scale(post.media.reddit_video.height, post.media.reddit_video.width, 400)
		content.style.height = height + "px"
	}
	else if (post.hint === "rich:video") {
		content.innerHTML += post.media.oembed.html
		content.querySelector("iframe").className = "lazyload"

	} else if (post.hint === "link") {
		// TODO: Don't scale thumbnail. Scale source or give link near image, like reddit does.
		if (post.domain === "imgur.com") {
			const img = createImg("", post.thumbnail.url)
			content.appendChild(img)

			const height = scale(post.thumbnail.height, post.thumbnail.width, 400)
			content.style.height = height + "px"
		} else {
			const link = document.createElement("a")
			link.href = post.url
			content.appendChild(link)
		}

	} else if (post.html != null) {
		const textNode = document.createElement("div")
		content.innerHTML += post.html
	}

	return content
}

function createImg(src, placeholder) {
	const img = document.createElement("img")

	img.src = placeholder
	img.className = "lazyload blur-up"
	img.setAttribute("data-src", src)
	img.setAttribute("referrerpolicy", "no-referrer")

	return img
}

function createVideo(src, preview) {
	const video = document.createElement("video-js")
	if (preview) {
		video.setAttribute("poster", preview)
	}

	const source = document.createElement("source")
	source.src = src

	video.appendChild(source)

	videojs(video, { controls: true })

	return video
}

function createAlbum() {
	const album = document.createElement("div")
	const images = document.createElement("div")
	const left = document.createElement("div")
	const right = document.createElement("div")

	album.className = "album"
	images.className = "album-images"
	left.className = "album-control album-left"
	right.className = "album-control album-right"

	album.addImage = (url) => {
		const img = createImg(url)
		images.appendChild(img)
	}

	album.addVideo = (url) => {
		const video = createVideo(url)
		images.appendChild(video)
	}

	let i = 0

	left.onclick = () => {
		if (i > 0) {
			images.style.right = images.children[--i].offsetLeft + "px"
			right.style.display = "block"
			if (i === 0) {
				left.style.display = "none"
			}
		}
	}

	right.onclick = function () {
		if (i + 1 < images.children.length) {
			images.style.right = images.children[++i].offsetLeft + "px"
			left.style.display = "block"
			if (i === images.children.length - 1) {
				right.style.display = "none"
			}
		}
	}

	album.appendChild(images)
	album.appendChild(left)
	album.appendChild(right)

	return album
}

// FIXME:
function getDeviantart(url) {
	const backendURL = "https://backend.deviantart.com/oembed?format=jsonp&callback=?&url="
	const img = createImg()

	fetchJsonp(backendURL + url)
		.then(resp => resp.json())
		.then(json => {
			const height = scale(json.height, json.width, 400)
			img.src = json.thumbnail_url
			img.setAttribute("data-src", json.url)
			img.setAttribute("height", height + "px")

			img.className = "lazyload blur-up"
			brick.pack()
		})

	return img
}

// FIXME:
function getImgur(url) {
	// TODO: ClientID is incorrect and never actually worked
	// const clientID = "1db5a663e63400b"
	// const options = {
	// 	headers: {
	// 		Authorization: `Client-ID ${clientID}`
	// 	}
	// }

	const requestURL = url.replace("imgur.com", "api.imgur.com/3").replace("/a/", "/album/")

	const elem = document.createElement("div")

	const promise = fetch(requestURL)
		.then(resp => resp.json())
		.then(json => {
			if (json.data.images.length === 1) {
				const img = createImg(json.data.images[0].link)
				img.style.width = "100%"
				elem.appendChild(img)
				return
			}

			const album = createAlbum()

			json.data.images.forEach(image => {
				if (image.type.includes("image")) {
					album.addImage(image.link)
				} else if (image.type.includes("video")) {
					album.addVideo(image.link)
				}
			})

			elem.appendChild(album)
		})

	return elem
}

function ago(date) {
	const suffix = (v) => {
		if (v > 1) {
			return "s ago"
		}

		return " ago"
	}

	let n = Math.floor((new Date() - date) / 1000)
	let unit = " monkeys"

	while (true) {
		if (n < 60) {
			unit = " second"
			break
		}

		n = Math.floor(n / 60)
		if (n < 60) {
			unit = " minute"
			break
		}

		n = Math.floor(n / 60)
		if (n < 24) {
			unit = " hour"
			break
		}

		n = Math.floor(n / 24)
		if (n < 365) {
			unit = " day"
			break
		}

		n = Math.floor(n / 365)
		unit = " year"

		break
	}

	return n + unit + suffix(n)
}

function scale(a, b, c) {
	return Math.ceil(c * (a / b))
}

function empty(elem) {
	while (elem.firstChild) {
		elem.removeChild(elem.firstChild)
	}
}

function toggleOverlay() {
	if (overlay.style.display === "none") {
		overlay.style.display   = ""
		full_post.style.display = ""
		document.body.style.overflow = "none"
	} else {
		overlay.style.display   = "none"
		full_post.style.display = "none"
		document.body.style.overflow  = ""
	}
}
