import "lazysizes"
import Bricks from 'bricks.js'

var fetchJsonp = require("fetch-jsonp")
var FlexSearch = require("flexsearch")

const ribbon = document.querySelector(".reddit-ribbon")
const searchbar = document.querySelector("input")
const flex = new FlexSearch()

const reddit = {
	subreddit: "",
	sortMethod: "hot",
	lastPostId: "",
	limit: 70,
	time: ""
}

let enabledAutoload = false
let isLoading = false

const instance = Bricks({
	container: ribbon,
	packed: 'data-packed',
	sizes: [{ columns: 4, gutter: 10 }],
	position: false
})

instance.resize(true)

init()
loadSubreddit(window.location.pathname)

function init() {
	document.addEventListener("lazyloaded", () => {
		instance.pack()
		instance.update()
	})

	window.addEventListener("scroll", function () {
		if (!enabledAutoload) { return }
		if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 1000) {
			if (!isLoading && searchbar.value === "") {
				isLoading = true

				requestSubreddit(reddit.subreddit, reddit.sortMethod, reddit.lastPostId, reddit.limit)
					.then(() => isLoading = false)
			}
		}
	})
}

function loadSubreddit(subreddit) {
	clearRibbon()

	requestSubreddit(subreddit, reddit.sortMethod)

	reddit.subreddit = subreddit
	enabledAutoload = true
}

function clearRibbon() {
	while (ribbon.children[0]) {
		ribbon.removeChild(ribbon.firstChild)
	}

	flex.clear()
}

function requestSubreddit(subreddit, sort = "hot", after = "", limit = "") {
	const url = `http://www.reddit.com${subreddit}/${sort}/.json?after=${after}&limit=${limit}&raw_json=1`;

	return fetch(url)
		.then(resp => resp.json())
		.then(json => addPosts(json.data.children));
}
    
function addPosts(posts) {
	let i = ribbon.children.length

	posts.forEach(post => {
		const div = createPost(post.data)
		ribbon.appendChild(div)
	})

	instance.pack()

	for (; i < ribbon.children.length; i++) {
		flex.add(i, ribbon.children[i].innerText)
	}

	reddit.lastPostId = posts[posts.length - 1].data.name
}

function createImg(url) {
	const img = document.createElement("img")
	img.className = "lazyload"
	img.setAttribute("data-src", url)
	img.setAttribute("referrerpolicy", "no-referrer")
	return img
}

function createVideo(url) {
	const video = document.createElement("video")
	video.setAttribute("controls", true)
	const source = document.createElement("source")
	source.src = url
	video.appendChild(source)
	return video
}

function createPost(post) {
	const div = document.createElement("div")
	div.id = post.id
	div.className = "reddit-post"

	const title = document.createElement("h2")
	// Such posts require innerHTML instead of textContent
	// (reddit.com/r/awwnime/comments/bhew2y/the_rainy_season_hero_froppy_3_boku_no_hero/)
	title.innerHTML = post.title
	title.className = "post-title"
	div.appendChild(title)

	// TODO: Simplify
	const content = document.createElement("div")
	content.className = "post-content"
	switch (post.post_hint) {
		case "image":
			const previewURL = post.preview.images[0].source.url
			if (post.preview.images[0].resolutions.length > 2) {
				const previewURL = post.preview.images[0].resolutions[2].url
			}
			content.appendChild(createImg(previewURL))
			break
		case "hosted:video":
			const video = createVideo(post.media.reddit_video.fallback_url)
			content.appendChild(video)
			break
		case "rich:video":
			content.innerHTML += post.media.oembed.html
			content.querySelector("iframe").className = "lazyload"
			break
		case "link":
			// TODO: Extract to prevent switch ladders.
			switch (post.domain) {
				case "imgur.com":
					content.appendChild(getImgur(post.url))
					break

				case "deviantart.com":
					content.appendChild(getDeviantart(post.url))
					break
			}
			break
		default:
			if (post.selftext_html != null) {
				const textNode = document.createElement("div")
				content.innerHTML += post.selftext_html
			}
	}

	div.appendChild(content)

	return div
}

function getPost(id) {
	const url = `https://reddit.com/${permalink}.json?raw_json=1`
	return fetch(url).then(json => json[0].data.children[0].data)
}

function openPost(id) {
	const data = getPost(id)
	const div = document.getElementById()
	div.style.display = "block"
}

function searchSubredditName(query, exact = false) {
	const url = `https://reddit.com/api/search_reddit_names.json?query=${query}&exact=${exact}`
	return fetchJsonp(url)
		.then(resp => resp.json())
		.then(json => json.names)
}

function searchSubreddit(query, subreddit = "", sort = "", after = "") {
	const url = `https://reddit.com${subreddit}/search/.json?q=${query}&restrict_sr=1&jsonp=?`
	return fetchJsonp(url)
		.then(resp => resp.json())
		.then(json => json.data.children)
}

function getDeviantart(url) {
	const backendURL = "https://backend.deviantart.com/oembed?format=jsonp&callback=?&url="
	const img = createImg()

	fetchJsonp(backendURL + url)
		.then(resp => resp.json())
		.then(json => img.setAttribute("data-src", json.url))

	return img
}

function getImgur(url) {
	const clientID = "1db5a663e63400b"
	const requestURL = url.replace("imgur.com", "api.imgur.com/3").replace("/a/", "/album/")
	const options = {
		headers: {
			Authorization: `Client-ID ${clientID}`
		}
	}

	const elem = document.createElement("div")

	const promise = fetch(requestURL, options)
		.then(resp => resp.json())
		.then(json => {
			json = json.data

			if (json.images.length === 1) {
				const img = createImg(json.images[0].link)
				img.style.width = "100%"
				elem.appendChild(img)
				return
			}

			const album = createAlbum()

			json.images.forEach(image => {
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

function createAlbum() {
	const album = document.createElement("div")
	const images = document.createElement("div")
	const left = document.createElement("div")
	const right = document.createElement("div")

	album.className = "album"
	images.className = "album-images"
	left.className = "album-control album-left"
	right.className = "album-control album-right"

	album.addImage = function (url) {
		const img = createImg(url)
		images.appendChild(img)
	}

	album.addVideo = function (url) {
		const video = createVideo(url)
		images.appendChild(video)
	}

	let i = 0

	left.onclick = function () {
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
