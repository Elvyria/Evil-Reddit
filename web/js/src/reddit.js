import "lazysizes";

var Isotope = require("isotope-layout")
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

let ribbonIso = null
let enabledAutoload = false
let isLoading = false


init()
loadSubreddit("/r/unixporn")


function init() {
	document.addEventListener("lazyloaded", () => {
		ribbonIso.layout()
	})

	window.addEventListener("scroll", function () {
		if (!enabledAutoload) { return }
		if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 1000) {

			// TODO: Searchbar shouldn't work this way
			if (!isLoading && searchbar.value === "") {
				isLoading = true

				requestSubreddit(reddit.subreddit, reddit.sortMethod, reddit.lastPostId, reddit.limit)
					.then(() => isLoading = false)
			}
		}
	})

	searchbar.addEventListener("keyup", (e) => {
		if (searchbar.value !== "") {
			ribbonIso.arrange({
				filter(elm) {
					const request = searchbar.value
					const result = flex.search(request)

					return result.includes([...ribbon.children].indexOf(elm))
				}
			})
		}
	})
}

function loadSubreddit(subreddit) {
	clearRibbon()

	ribbonIso = new Isotope(ribbon, {
		// transitionDuration: 0,
		percentPosition: true,
		itemSelector: ".reddit-post",
		layoutMode: "masonry",
		masonry: {
			fitWidth: true,
			gutter: 10
		}
	})

	requestSubreddit(subreddit, reddit.sortMethod)

	reddit.subreddit = subreddit
	enabledAutoload = true
}

function clearRibbon() {
	while (ribbon.children[0]) {
		ribbon.removeChild(ribbon.firstChild)
	}

	flex.clear()

	if (Isotope.data(ribbon)) {
		ribbonIso.destroy()
	}
}

function requestSubreddit(subreddit, sort = "hot", after = "", limit = "") {
	const url = `http://www.reddit.com${subreddit}/${sort}/.json?after=${after}&limit=${limit}&raw_json=1`;

	return scriptRequestPromise(url)
		  .then(json => json.data.children)
		  .then(posts => addPosts(posts));
}
    
function addPosts(posts) {
	let i = ribbon.children.length

	posts.forEach(post => {
		const div = createPost(post.data)
		ribbon.appendChild(div)
	})

	ribbonIso.reloadItems()
	ribbonIso.arrange()

	for (; i < ribbon.children.length; i++) {
		flex.add(i, ribbon.children[i].innerText)
	}

	reddit.lastPostId = posts[posts.length - 1].data.name
}

function createImg(url) {
	const img = document.createElement("img")
	img.className = "lazyload"
	img.setAttribute("data-src", url)
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

	const a = document.createElement("a")
	a.href = post.url
	a.textContent = post.url.replace("https://", "").replace("www.", "")

	// TODO: Simplify
	const content = document.createElement("div")
	content.className = "post-content"
	switch (post.post_hint) {
		case "image":
			// let previewURL = post.preview.images[0].source.url.replace(/&amp;/g, "&")
			// Killing quality, but saving a bunch of bandwidth.
			const previewURL = post.preview.images[0].resolutions[2].url.replace(/&amp;/g, "&")
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
			const textNode = document.createElement("div")
			content.innerHTML += post.selftext_html
	}

	div.appendChild(content)
	div.appendChild(a)

	return div
}

function getPost(id) {
	const url = `https://reddit.com/${permalink}.json?raw_json=1`
	return scriptRequestPromise(url).then(json => json[0].data.children[0].data)
}

function openPost(id) {
	const data = getPost(id)
	const div = document.getElementById()
	div.style.display = "block"
}

function searchSubreddit(query, subreddit = "", sort = "", after = "") {
	const url = `https://reddit.com${subreddit}/search/.json?q=${query}&restrict_sr=1&jsonp=?`
	return scriptRequestPromise(url).then(json => json.data.children)
}

function getDeviantart(url) {
	const backendURL = "https://backend.deviantart.com/oembed?format=jsonp&callback=?&url="
	const img = createImg()

	scriptRequestPromise(backendURL + url)
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

function scriptRequestPromise(jsonpUrl) {
	let resolves = null
	let rejects = null

	const returnValue = new Promise((resolve, reject) => {
		resolves = resolve
		rejects = reject
	})

	scriptRequest(jsonpUrl, resolves, rejects)

	return returnValue
}

function scriptRequest(path, success, error) {
	var xhr = new XMLHttpRequest()
	xhr.onreadystatechange = function () {
		if (xhr.readyState === XMLHttpRequest.DONE) {
			if (xhr.status === 200) {
				if (success)
					success(JSON.parse(xhr.responseText))
			} else {
				if (error)
					error(xhr)
			}
		}
	}
	xhr.open("GET", path, true)
	xhr.send()
}
