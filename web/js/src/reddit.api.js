let reddit = {}

reddit.requestPosts = (subreddit, sort = "hot", after = "", limit = "70") => {
	const url = `https://www.reddit.com${subreddit}/${sort}/.json?after=${after}&limit=${limit}&raw_json=1`;
	return fetch(url)
		.then(resp => resp.json())
		.then(json => json.data.children)
}

reddit.requestPost = (permalink) => {
	const url = `https://www.reddit.com${permalink}.json?raw_json=1`
	return fetch(url)
		.then(resp => resp.json())
}

reddit.requestAbout = (subreddit) => {
	const url = `https://www.reddit.com${subreddit}/about.json`
	return fetch(url)
		.then(resp => resp.json())
		.then(json => json.data)
}

reddit.requestSearch = (query, subreddit = "", sort = "", after = "") => {
	const url = `https://www.reddit.com${subreddit}/search/.json?q=${query}&restrict_sr=1&raw_json=1`
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

reddit.comment = (data) => {
}


export default reddit
