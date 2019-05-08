import scriptRequestPromise from "./modules/XMLRequest.js"
import createImg from './modules/createImg.js'
import getImgur from './modules/API/imgur.js'
import getDeviantart from './modules/API/deviantart.js'



/*>Testing<*/
const testing = document.createElement('div')
const button1 = document.createElement('button')
const button2 = document.createElement('button')
const button3 = document.createElement('button')

button1.innerText = '/r/dfo (videos, text, pictures)'
button1.onclick = function() { loadSubreddit('/r/dfo') }

button2.innerText = '/r/awwnime (pictures with mostly the same size)'
button2.onclick = function() { loadSubreddit('/r/awwnime') }

button3.innerText = '/r/unix (pictures with different sizes and sources)'
button3.onclick = function() { loadSubreddit('/r/unixporn') }


testing.appendChild(button1)
testing.appendChild(button2)
testing.appendChild(button3)

document.body.firstElementChild.appendChild(testing)
/*<Testing>*/



/*__SCRIPT_START__*/

const ribbon = document.querySelector(".reddit-ribbon")
const searchbar = document.querySelector("input")
const flex = new FlexSearch()
// const postWidth = $(".reddit-post").width()
const reddit = {
	subreddit: "",
	sortMethod: "hot",
	lastPostId: '',
	limit: 70,
	time: ""
}

let ribbonIso = null
let enabledAutoload = false
let isLoading = false



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

			requestSubreddit(reddit.subreddit, reddit.sortMethod, reddit.lastPostId, reddit.limit)
				.then(() => isLoading = false)
		}
	}
})

searchbar.addEventListener('keyup', (e) => {

	ribbonIso.arrange({
		filter(elm) {
			const request = searchbar.value
			const result = flex.search(request)

			if (request === '') {
				return true
			}

			return result.includes([...ribbon.children].indexOf(elm))
		}
	})
})



function requestSubreddit(subreddit, sort = "hot", after = "", limit = "") {
	const url = `http://www.reddit.com${subreddit}/${sort}/.json?after=${after}&limit=${limit}`

	return scriptRequestPromise(url)
		.then(json => json.data.children)
		.then(posts => addPosts(posts))
}

function loadSubreddit(subreddit) {

	clearRibbon()

	ribbonIso = new Isotope(ribbon, {
		// transitionDuration: 0,
		percentPosition: true,
		itemSelector: '.reddit-post',
		layoutMode: 'masonry',
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

async function addPosts(posts) {
	for (let i of posts) {
		const div = await createPost(i.data)
		ribbon.appendChild(div)
	}

	ribbonIso.reloadItems()
	ribbonIso.arrange()

	Array.from(ribbon.children).forEach((post, i) => {
		flex.add(i, post.innerText)
	})

	reddit.lastPostId = posts[posts.length - 1].data.name
}



function createPost(post) {
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
			// let previewURL = post.preview.images[0].source.url.replace(/&amp;/g, "&")
			// Killing quality, but saving a bunch of bandwidth.
			const previewURL = post.preview.images[0].resolutions[2].url.replace(/&amp;/g, "&")
			div.appendChild(createImg(previewURL))
			break
		case "rich:video":
			div.innerHTML += decodeHTML(post.media.oembed.html)
			div.querySelector("iframe").className = "lazyload"
			break

		case "link":
			// TODO: Extract to prevent switch ladders.
			switch (post.domain) {
				case "imgur.com":
					div.appendChild(getImgur(post.url))
					break

				case "deviantart.com":
					div.appendChild(getDeviantart(post.url))
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




