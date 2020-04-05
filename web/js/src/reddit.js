import "lazysizes"
import Bricks from 'bricks.js'
import videojs from "video.js"
import reddit from './reddit.api.js'

const fetchJsonp = require("fetch-jsonp")

const favicon = document.getElementById("icon")
const ribbon = document.querySelector(".reddit-ribbon")
const searchbar = document.querySelector("input")

loadConfig("../config.json").then(main)

function main(config) {
	let isLoading = false

	const brick = Bricks({
		container: ribbon,
		packed: 'data-packed',
		sizes: [{ columns: config.reddit.columns, gutter: config.reddit.gutter }],
		position: false
	}).resize(true)

	videojs.log.level('off');

	const subreddit = window.location.pathname

	window.addEventListener("scroll", () => {
		if (!isLoading && ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 1000)) {
			isLoading = true

			reddit.requestPosts(subreddit, "hot", ribbon.lastChild.name, "70").then(ribbon.addPosts).then(() => {
				isLoading = false
				brick.update()
			})
		}
	})


	reddit.requestPosts(subreddit, "hot", "", 70).then(ribbon.addPosts).then(brick.pack)
	reddit.requestAbout(subreddit).then(data => { 
		document.title = data.title
		favicon.href = url
	})
}

ribbon.addPosts = (data) => {
	data.forEach(child => {
		const post = createPost(child.data)
		ribbon.appendChild(post)
	})
}

function loadConfig(path) {
	return fetch(path).then(resp => resp.json())
}

function openPost(url) {
	// const data = reddit.requestPost(url)
	// const div = document.getElementById()
	// div.style.display = "block"
}

function createPost(post) {
	const div = document.createElement("div")
	div.name = post.name
	div.className = "reddit-post"
	div.permalink = post.permalink
	div.onclick = () => { openPost(div.permalink) }

	const title = document.createElement("div")
	title.className = "post-title"

	if (post.link_flair_text != null) {
		const flair = createFlair(post.link_flair_text, post.link_flair_text_color, post.link_flair_background_color)
		title.appendChild(flair)
	}

	title.innerHTML += post.title

	div.appendChild(title)

	const content = createContent(post)

	div.appendChild(content)

	return div
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

	if (post.post_hint === "image") {
		const previewURL = (post.preview.images[0].resolutions.length >= 4) ? post.preview.images[0].resolutions[3].url : post.preview.images[0].resolutions[length - 1].url
		const placeholderURL = post.preview.images[0].resolutions[0].url
		const height = scale(post.preview.images[0].source.height, post.preview.images[0].source.width, 400)

		const img = createImg(previewURL, placeholderURL, height)
		content.appendChild(img)

	} else if (post.post_hint === "hosted:video") {
		const height = scale(post.media.reddit_video.height, post.media.reddit_video.width, 400)
		const video = createVideo(post.media.reddit_video.hls_url, post.thumbnail, height)
		content.appendChild(video)

	} else if (post.post_hint === "rich:video") {
		content.innerHTML += post.media.oembed.html
		content.querySelector("iframe").className = "lazyload"

	} else if (post.post_hint === "link") {
		if (post.domain === "imgur.com") {
			const height = scale(post.thumbnail_height, post.thumbnail_width, 400)
			const img = createImg("", post.thumbnail, height)
			content.appendChild(img)
		} else {
			const link = document.createElement("a")
			link.href = post.url
			content.appendChild(link)
		}

	} else if (post.selftext_html != null) {
		const textNode = document.createElement("div")
		content.innerHTML += post.selftext_html
	}

	return content
}

function createImg(src, placeholder, height) {
	const img = document.createElement("img")

	img.src = placeholder
	img.className = "lazyload blur-up"
	img.setAttribute("data-src", src)
	img.setAttribute("referrerpolicy", "no-referrer")

	if (height) {
		img.setAttribute("height", height + "px")
	}

	return img
}

function createVideo(src, preview, height) {
	const video = document.createElement("video-js")
	video.setAttribute("poster", preview)
	if (height) {
		video.setAttribute("height", height + "px")
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

function scale(a, b, c) {
	return Math.ceil(c * (a / b))
}

function empty(elem) {
	while (elem.firstChild) {
		elem.removeChild(elem.firstChild)
	}
}
