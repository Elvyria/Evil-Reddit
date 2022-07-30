import "./array.js"
import "./hotkeys.js"
import { ago, once, hide, show, empty } from "./globals.js"
import { observer, lazyload } from "./observe.js"
import { reddit as provider } from "./providers/reddit.js"
import { content } from "./content.js"

import { elements } from "./elements.js"

import Bricks from "bricks.js"

const ribbon   = document.getElementById("reddit-ribbon")
const spinner  = document.getElementById("spinner")

const overlay  = document.getElementById("overlay")
const fullPost = document.getElementById("full-post")
const comments = document.getElementById("comments")
const sortbar  = document.getElementById("sortbar")

const searchInput = document.querySelector("#search input")

const postWidth = 400
let clickDistance = 0

let state = {
	subreddit:    "",
	fullPost:     false,
	search:       "",
	sort:         provider.sort.general[0],
	sortComments: provider.sort.comments[0],
}

const brick = Bricks({

	container: ribbon,
	packed: "bricked",
	sizes: [
		{                           columns: 1, gutter: 10 },
		{ mq: `${postWidth * 2}px`, columns: 2, gutter: 10 },
		{ mq: `${postWidth * 3}px`, columns: 3, gutter: 10 },
		{ mq: `${postWidth * 4}px`, columns: 4, gutter: 10 }
	],
	position: false

}).resize(true).pack()

;(function() {

	window.scrollTo({ top: 0, behavior: 'smooth' })
	searchInput.value = ""

	initListeners()

	state = parseUrl(new URL(document.location))

	const bannerLink = document.getElementById("banner-link")
	bannerLink.href = `/r/${state.subreddit}`

	// Create sort buttons
	Object.entries(provider.sort.general)
		.filter(([key, _]) => key !== "default")
		.map(([_, value]) => elements.sortButton(value.name, value.icon, () => sort(value)))
		.forEach(Node.prototype.appendChild, sortbar)

	provider.requestAbout(state.subreddit).then(updateHeader)

	if (state.fullPost) {
		provider.requestPost(window.location.pathname, state.sortComments).then(data => {
			const post = provider.post(data[0].data.children[0].data)

			const div = elements.post(p.title, content(p), {
				author:   `/u/${post.author}`,
				comments: post.num_comments,
				date:     post.date,
				flair:    post.flair,
				score:    post.score,
			})
			div.name = post.name
			div.link = post.permalink

			const title = div.querySelector(".post-title")
			const content = div.querySelector(".post-content")

			openFullPost(title, content, post.permalink)
		})
	}

	provider.requestPosts(state.subreddit, state.sort).then(posts => {
		hide(spinner)

		//TODO: Create status element
		if (posts.length === 0) return

		const more = posts.length >= 100 ? (after) => provider.requestPosts(state.subreddit, state.sort, after) : null
		addPosts(posts, more)
	})

})()

function initListeners() {
	// Calculates cursor move distance between press and release. Inacurate
	document.addEventListener("mousedown", e => { clickDistance = e.x + e.y })
	document.addEventListener("mouseup",   e => { clickDistance = Math.abs(clickDistance - e.x - e.y) })

	ribbon.addEventListener("click", e => { 
		if (clickDistance < 10)
			clickPost(e)
	})

	searchInput.addEventListener("keydown", e => {
		if (e.key === "Enter") {
			const query = searchInput.value.trim()

			if (query.length !== 0) {
				search(state.subreddit, query)
				searchInput.value = ""
			}
		}
	})

	searchInput.addEventListener("focus", () => {
		searchInput.value = searchInput.dataset.value
		searchInput.placeholder = "Search"
	})

	searchInput.addEventListener("blur", () => {
		searchInput.dataset.value = searchInput.value
		searchInput.placeholder = searchInput.dataset.placeholder
		searchInput.value = ""
	})
	
	fullPost.addEventListener("click", zoom)
}

function updateHeader(about) {
	document.title = about.title

	const favicon = document.getElementById("favicon")
	favicon.href = about.icon

	updateBanner(state.subreddit, about.banner, about.mobile_banner)

	const iconImg = document.getElementById("icon-image")
	iconImg.src = about.icon

	const iconTitle = document.getElementById("icon-title")
	iconTitle.textContent = about.title
}

function updateBanner(branch, image, imageMobile) {
	const banner = document.getElementById("banner")

	if (image) {
		banner.srcset = `${image} 1x`

		if (imageMobile)
			banner.srcset += `,${imageMobile} 2x`

		const bannerLink = document.getElementById("banner-link")
		bannerLink.href = branch

		show(banner)
	}
	else hide(banner)
}

function zoom(event) {
	const content = fullPost.getElementsByClassName("post-content")[0]
	const img = event.target

	if (content.firstChild === img && img.tagName === "IMG" && img.naturalHeight > img.naturalWidth) {
		if (img.classList.contains("zoom-in"))
		{
			content.style.overflowY = ""
			img.classList.remove("zoom-in")
		}
		else
		{
			content.style.overflowY = "scroll"
			img.classList.add("zoom-in")
		}
	}
}

function sort(method) {
	if (state.sort === method)
		return

	state.sort = method

	provider.requestPosts(state.subreddit, state.sort).then(posts => {
		if (posts.length === 0) return

		empty(ribbon)
		window.scrollTo({ top: 0 })

		const more = posts.length >= 100 ? (after) => provider.requestPosts(state.subreddit, state.sort, after) : null
		addPosts(posts, more)
	})

	history.pushState(null, "", `${state.subreddit}/${state.sort.query}`)
}

function addPosts(posts, more) {
	if (posts.length === 0) return

	const frag = document.createDocumentFragment()

	posts.forEach(p => {
		const div = elements.post(p.title, content(p), {
			author:   `/u/${p.author}`,
			comments: p.num_comments,
			date:     p.date,
			flair:    p.flair,
			score:    p.score,
		})

		div.name = p.name
		div.permalink = p.permalink

		frag.appendChild(div)
	})

	if (more) {
		const lastChild = frag.lastChild

		lastChild.addEventListener("enterView", (_) => {
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

	if (post) {
		hide(post)

		const title = post.getElementsByClassName("post-title")[0]
		const content = post.getElementsByClassName("post-content")[0]

		openFullPost(title, content, post.link).then(() => {
			post.append(title, content)

			show(post)
		})
	}
}

function parseUrl(url) {
	const parts = url.pathname.split('/')

	const result = {
		subreddit:    `/r/${parts[2]}`,
		fullPost:     parts[3] === "comments",
		search:       url.searchParams.get("q"),
		sort:      provider.sort.general.default,
		sortComments: provider.sort.comments.default,
	}

	if (result.fullPost) {
		const sort = url.searchParams.get("sort")

		result.sortComments = Object.keys(provider.sort.comments).includes(sort) ?
			provider.sort.comments[sort] : provider.sort.comments.default
	}
	else {
		const sort = parts[3]

		result.sort = Object.keys(provider.sort.general).includes(sort) ?
			provider.sort.general[sort] : provider.sort.general.default
	}

	return result
}

//TODO: Search by content type (video, image, text, links?)
function search(subreddit, query) {
	history.pushState(null, "", `${state.subreddit}/search/?q=${query}`)

	return provider.requestSearch(query, subreddit, "", "", 100).then(posts => {
		empty(ribbon)

		window.scrollTo({ top: 0 })

		const more = posts.length >= 100 ? (after) => provider.requestSearch(query, subreddit, "", after) : null
		addPosts(posts, more)
	})
}

// TODO: Rework without element movements
function openFullPost(title, content, permalink) {
	openOverlay()

	loadSources(content)

	fullPost.insertBefore(content, fullPost.firstChild)
	fullPost.insertBefore(title,   fullPost.firstChild)

	if (comments.loaded !== permalink) {
		empty(comments)

		// TODO: Load more comments, limit levels
		provider.requestPost(permalink).then(json => {
			const frag = document.createDocumentFragment()

			json[1].data.children.forEach(child => {
				if (child.kind !== "more") // TODO
					addComment(frag, child.data)
			})

			comments.appendChild(frag)
			comments.loaded = permalink
		})
	}

	const oldPath = window.location.pathname + window.location.search

	const subTitle = document.title
	document.title = title.textContent

	history.pushState(null, title.textContent, permalink)

	return new Promise(resolve => {
		overlay.onclick = () => {
			closeOverlay()

			document.title = subTitle
			history.pushState(null, subTitle, oldPath)

			fullPost.removeChild(title)
			fullPost.removeChild(content)

			resolve()
		}
	})
}

function loadSources(content) {
	const images = content.getElementsByTagName("img")
	for (const img of images)
	{
		img.addEventListener("load", () => {
			delete img.dataset.src
			img.classList.add("lazyloaded")
		}, once)

		lazyload(img, "source", "src")
	}

	const videos = content.getElementsByTagName("video")
	for (const video of videos)
	{
		video.loadSource()
	}
}

function addComment(fragment, data, level = 0) {
	const comment = elements.comment(data.author, data.body_html, ago(new Date(data.created_utc * 1000)))
	comment.style.paddingLeft = 21 * level + "px"
	fragment.appendChild(comment)
	setTimeout(e => e.style.opacity = 1, 15 * fragment.children.length, comment)

	if (data.replies) {
		data.replies.data.children.forEach(child => { 
			if (child.kind !== "more") // TODO
				addComment(fragment, child.data, level + 1)
		})
	}
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
