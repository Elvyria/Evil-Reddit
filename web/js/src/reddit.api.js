export let reddit = {}

reddit.sortMethods = {
	subreddit: ["hot", "new", "top", "rising"],
	comments: ["confidence", "top", "new", "controversial", "old", "qa"]
}

reddit.requestPosts = (subreddit, sort = reddit.sortMethods.subreddit[0], after = "", limit = "100") => {
	const url = `https://www.reddit.com/r/${subreddit}/${sort}/.json?after=${after}&limit=${limit}&raw_json=1`;
	return fetch(url)
		.then(resp => resp.json())
		.then(json => json.data.children)
}

reddit.requestPost = (permalink, sort = reddit.sortMethods.comments[0]) => {
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

reddit.requestSearch = (query, subreddit = "", sort = "", after = "", limit = "100") => {
	const url = `https://www.reddit.com/r/${subreddit}/search/.json?q=${query}&restrict_sr=1&limit=${limit}&raw_json=1`
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
	return {
		name:      data.name,
		permalink: data.permalink,
		title:     data.title,
		hint:      data.post_hint,
		html:      data.selftext_html,
		preview:   data.preview ? data.preview.images[0] : undefined,
		gallery:   data.is_gallery ? Object.values(data.media_metadata) : undefined,
		media:     data.media,
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
}
