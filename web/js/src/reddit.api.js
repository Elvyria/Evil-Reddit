export let reddit = {}

reddit.sortMethods = {
	subreddit: ["hot", "new", "top", "rising"],
	time:      ["hour", "day", "week", "month", "year", "all"],
	comments:  ["confidence", "top", "new", "controversial", "old", "qa"],
	search:    ["relevance", "hot", "top", "new", "comments"],
}

reddit.requestPosts = (subreddit, sort, after = "", limit = "100", time = "") => {
	if (!reddit.sortMethods.subreddit.includes(sort))
		sort = reddit.sortMethods.subreddit[0]

	const url = `https://www.reddit.com/r/${subreddit}/${sort}/.json?after=${after}&limit=${limit}&t=${time}&raw_json=1`;

	return fetch(url)
		.then(resp => resp.json())
		.then(json => json.data.children)
}

reddit.requestPost = (permalink, sort) => {
	if (!reddit.sortMethods.comments.includes(sort))
		sort = reddit.sortMethods.comments[0]

	const url = `https://www.reddit.com${permalink}.json?raw_json=1`

	return fetch(url)
		.then(resp => resp.json())
}

reddit.requestAbout = (subreddit) => {
	const url = `https://www.reddit.com/r/${subreddit}/about.json?raw_json=1`
	return fetch(url)
		.then(resp => resp.json())
		.then(json => json.data)
}

reddit.requestSearch = (query, subreddit = "", sort = "", after = "", limit = "100", time = "") => {
	const url = `https://www.reddit.com/r/${subreddit}/search/.json?q=${query}&after=${after}&restrict_sr=1&limit=${limit}&t=${time}&include_over_18=on&raw_json=1`
	return fetch(url)
		.then(resp => resp.json())
		.then(json => json.data.children)
}

reddit.requestSearchNames = (query, exact = false) => {
	const url = `https://www.reddit.com/api/search_reddit_names.json?query=${query}&exact=${exact}`
	return fetch(url)
		.then(resp => resp.json())
		.then(json => json.names)
}

reddit.post = (data) => {
	const post = {
		name:      data.name,
		score:     data.score,
		permalink: data.permalink,
		title:     data.title,
		hint:      data.post_hint,
		html:      data.selftext_html,
		preview:   data.preview ? data.preview.images[0] : undefined,
		gallery:   data.is_gallery ? Object.values(data.media_metadata).filter(entry => entry.status === "valid") : undefined,
		media:     data.media && data.media.reddit_video ? reddit.media(data.media.reddit_video) : data.media,
		url:       data.url,
		thumbnail: {
			url: data.thumbnail,
			height: data.thumbnail_height,
			width: data.thumbnail_width,
		},
		flair: data.link_flair_text === null ? undefined : {
			text: data.link_flair_text,
			fg: data.link_flair_text_color,
			bg: data.link_flair_background_color,
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
