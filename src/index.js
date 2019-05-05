import FlexSearch from 'flexsearch'
import Isotope from 'isotope-layout'
import {} from 'lazysizes'



const ribbon = document.querySelector(".reddit-ribbon")
const searchbar = document.querySelector("input")
const flex = new FlexSearch()
// const postWidth = $(".reddit-post").width()
const reddit = {
	subreddit: "",
	sortMethod: "hot",
	time: "",
}

let ribbonIso = new Isotope(ribbon)
let lastPostId = ""
let isLoading = false
let enabledAutoload = false



loadSubreddit("/r/awwnime")



document.addEventListener("lazyloaded", () => {
	ribbonIso.layout()
})

window.addEventListener("scroll", function () {
	if (!enabledAutoload) { return }
	if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 1000) {

		// TODO: Searchbar shouldn't work this way
		if (!isLoading && searchbar.value == "") {
			isLoading = true

			loadReddit(reddit.subreddit, reddit.sortMethod, lastPostId)
				.then(() => isLoading = false)
		}
	}
})

searchbar.addEventListener('keyup', (e) => {

	ribbonIso.arrange({
		filter(elm) {
			const request = searchbar.value

			if (request === '') {
				return true
			}

			const result = flex.search(request)

			return result.includes([...elm.parentNode.children].indexOf(elm))
		}
	})
})



function loadSubreddit(subreddit) {

	clearRibbon()

	ribbonIso = new Isotope(ribbon, {
		percentPosition: true,
		itemSelector: '.reddit-post',
		layoutMode: 'masonry',
		masonry: {
			fitWidth: true,
			gutter: 10
		}
	})


	loadReddit(subreddit, reddit.sortMethod)

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



function loadReddit(subreddit, sort = "hot", after = "", limit = "") {
	const url = `http://www.reddit.com${subreddit}/${sort}/.json?after=${after}&limit=${limit}`;

	console.log(url)

	return scriptRequestPromise(url)
		  .then(json => json.data.children)
		  .then(posts => addPosts(posts));
}



async function addPosts(posts) {
	for (let i of posts) {
		const div = await createPost(i.data)
		ribbon.appendChild(div)
	}

	ribbonIso.reloadItems()
	ribbonIso.arrange()

	console.log(flex)

	Array.from(ribbon.children).forEach( (post, i) => {
		console.log(i)
		console.log(post.innerText)

		flex.add(i, post.innerText)
	});


	lastPostId = posts[posts.length - 1].data.name
}



async function createPost(post) {
	const div = document.createElement("div")
	div.id = post.name
	div.className = "reddit-post"

	const h2 = document.createElement("h2")
	// Such posts require innerHTML instead of textContent
	// (reddit.com/r/awwnime/comments/bhew2y/the_rainy_season_hero_froppy_3_boku_no_hero/)
	h2.innerHTML = post.title
	div.appendChild(h2)

	const a = document.createElement("a")
	a.href = post.url
	a.textContent = post.url.replace("https://", "").replace("www.", "")

	// TODO: Simplify
	switch (post.post_hint) {

		case "image":
			const img = document.createElement("img")
			const previewURL = post.preview.images[0].source.url.replace(/&amp;/g, "&")
			// Killing quality, but saving a bunch of bandwidth.
			// Probably should do speed test before loading subreddit.
			// post.preview.images[0].resolutions[2].url.replace(/&amp/g, "&")
			img.className = "lazyload"
			img.setAttribute("data-src", previewURL)
			div.appendChild(img)
			break

		case "rich:video":
			div.innerHTML += decodeHTML(post.media.oembed.html)
			div.querySelector("iframe").className = "lazyload"
			break

		case "link":
			// TODO: Extract to prevent switch ladders.
			switch (post.domain) {
				case "imgur.com":
					div.appendChild(getHtmlImg(imgur(post.url)))
					break

				case "deviantart.com":
					div.appendChild(getHtmlImg(deviantart(post.url)))
					break
			}
			break

		default:
			const textNode = document.createElement("div")
			div.innerHTML += decodeHTML(post.selftext_html)
	}

	div.appendChild(a)

	return div
}



function searchSubreddit(query, subreddit = "", sort = "", after = "") {
	const url = `https://reddit.com${subreddit}/search/.json?q=${query}&restrict_sr=1&jsonp=?`
	return scriptRequestPromise(url).then(json => json.data.children)
}



function decodeHTML(html) {
	const textarea = document.createElement('textarea')
	textarea.innerHTML = html
	return textarea.value
}



async function imgur(url) {

	const clientId = '1db5a663e63400b'


	return init()

	async function init() {
		const parsedUrl = url.replace('https://imgur.com', '').replace('/a/', '/album/')


		const result = fetch(`https://api.imgur.com/3/${parsedUrl}`, {
			headers: {
				Authorization: `Client-ID ${clientId}`
			}
		})


		return (await (await result).json()).data
	}
}



async function deviantart(url) {
	const backendURL = "https://backend.deviantart.com/oembed?format=jsonp&callback=?&url="

	return (await scriptRequestPromise(backendURL + url)).url
}



function getHtmlImg(promise) {

	const img = document.createElement("img")
	img.className = "lazyLoad"

	promise.then( (data) => {
		img.setAttribute("data-src", data.url)
		img.setAttribute("data-loaded", false)
	})

	return img
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



function scriptRequest(path, success, error)
{
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function()
    {
        if (xhr.readyState === XMLHttpRequest.DONE) {
            if (xhr.status === 200) {
                if (success)
                    success(JSON.parse(xhr.responseText));
            } else {
                if (error)
                    error(xhr);
            }
        }
    };
    xhr.open("GET", path, true);
    xhr.send();
}