export const reddit = {}

const host = "https://www.reddit.com"
const api = ".json?raw_json=1"

reddit.sort = {
	general: {
		hot:           { query: "hot",           name: "Hot",           icon: ""  },
		new:           { query: "new",           name: "New",           icon: ""  },
		top:           { query: "top",           name: "Top",           icon: ""  },
		rising:        { query: "rising",        name: "Rising",        icon: "勤" },
	},
	comments: {
		confidence:    { query: "confidence",    name: "",              icon: ""   },
		top:           { query: "top",           name: "Top",           icon: ""   },
		new:           { query: "new",           name: "New",           icon: ""   },
		controversial: { query: "controversial", name: "Controversial", icon: ""   },
		old:           { query: "old",           name: "Old",           icon: ""   },
		qa:            { query: "qa",            name: "",              icon: ""   }
	},
	search: {
        relevance:     { query: "relevance",     name: "Relevance",     icon: ""   },
        hot:           { query: "hot",           name: "Hot",           icon: ""   },
        top:           { query: "top",           name: "Top",           icon: ""   },
        new:           { query: "new",           name: "New",           icon: ""   },
        comments:      { query: "comments",      name: "Most Comments", icon: ""   }
	},
}

reddit.sort.general.default  = reddit.sort.general.hot,
reddit.sort.comments.default = reddit.sort.comments.new,
reddit.sort.search.default   = reddit.sort.search.relevance,

reddit.requestPosts = (subreddit, sort = reddit.sort.general.default, after = "", limit = "100", time = "") => {
	if (!(sort.query in reddit.sort.general)) {
		console.error("Unexpected sort parameter: ", sort)
		return
	}

	const url = new URL(`${subreddit}/${sort.query}/${api}`, host)

	url.searchParams.set("after", after)
	url.searchParams.set("limit", limit)
	url.searchParams.set("t",     time)

	return fetch(url)
		.then(resp => resp.json())
		.then(json => json.data.children.map(child => reddit.post(child.data)))
}

reddit.requestPost = (permalink, sort = reddit.sort.comments.default) => {
	if (!(sort.query in reddit.sort.comments)) {
		console.error("Unexpected sort parameter: ", sort)
		return
	}

	const url = new URL(`${permalink}/${api}`, host)
	url.searchParams.set("sort", sort.query)

	return fetch(url)
		.then(resp => resp.json())
}

reddit.requestAbout = (subreddit) => {
	const url = new URL(`${subreddit}/about/${api}`, host)

	return fetch(url)
		.then(resp => resp.json())
		.then(json => reddit.about(json.data))
}

reddit.requestSearch = (query, subreddit = "", sort = reddit.sort.search.default, after = "", limit = "100", time = "") => {
	const url = new URL(`${subreddit}/search/${api}`, host)

	url.searchParams.set("q",     query)
	url.searchParams.set("t",     time)
	url.searchParams.set("after", after)
	url.searchParams.set("limit", limit)
	url.searchParams.set("restrict_sr", 1)
	url.searchParams.set("include_over_18", "on")

	return fetch(url)
		.then(resp => resp.json())
		.then(json => json.data.children.map(child => reddit.post(child.data)))
}

reddit.requestSearchNames = (query, exact = false) => {
	const url = new URL(`/api/search_reddit_names/${api}`, host)
	url.searchParams.set("query", query)
	url.searchParams.set("exact", exact)

	return fetch(url)
		.then(resp => resp.json())
		.then(json => json.names)
}

reddit.about = (data) => {
	return {
		title:         data.title,
		icon:          data.icon_img !== "" ? data.icon_img : data.community_icon,
		banner:        data.banner_background_image,
		mobile_banner: data.mobile_banner_image,
	}
}

reddit.post = (data) => {
	const post = {
		author:       data.author,
		date:         new Date(data.created_utc * 1000),
		name:         data.name,
		score:        data.score,
		permalink:    data.permalink,
		title:        data.title,
		hint:         data.post_hint,
		html:         data.selftext_html,
		preview:      data.preview ? data.preview.images[0] : undefined,
		gallery:      data.is_gallery && data.media_metadata ? Object.values(data.media_metadata).filter(entry => entry.status === "valid") : undefined,
		media:        data.media && data.media.reddit_video ? reddit.media(data.media.reddit_video) : data.media,
		num_comments: data.num_comments,
		url:          data.url,
		thumbnail: {
			url:    data.thumbnail,
			height: data.thumbnail_height,
			width:  data.thumbnail_width,
		},
		flair: data.link_flair_text === null ? undefined : {
			text: data.link_flair_text,
			fg:   data.link_flair_text_color,
			bg:   data.link_flair_background_color,
		},
	}

	post.hint = reddit.hint(post)

	return post
}

reddit.hint = (post) => {
	if (post.hint === "image")
	{
		return post.preview.variants.mp4 ? "gif" : "image"
	}
	else if (post.hint === "hosted:video")
	{
		return "video"
	}
	else if (post.hint === "rich:video")
	{
		switch (post.media.type) {
			case "gfycat.com":
				return "iframe:gfycat"
			case "redgifs.com":
				return "iframe:redgifs"
			default:
				return "iframe"
		}
	}
	else if (post.hint === "link")
	{
		return "link"
	}
	else if (post.gallery)
	{
		return "gallery"
	}
	else if (post.html)
	{
		return "html"
	}
	else if (!post.url.includes(post.permalink))
	{
		return "link"
	}

	return "unknown"
}

reddit.media = (redditVideo) => {
	return {
		hls: redditVideo.hls_url,
		dash: redditVideo.dash_url,
		fallback: redditVideo.fallback_url,
		height: redditVideo.height,
		width: redditVideo.width,
	}
}
