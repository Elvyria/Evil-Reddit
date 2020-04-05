let reddit = {}

reddit.requestPosts = (subreddit, sort = "hot", after = "", limit = "70") => {
	const url = `http://www.reddit.com${subreddit}/${sort}/.json?after=${after}&limit=${limit}&raw_json=1`;
	return fetch(url)
		.then(resp => resp.json())
		.then(json => json.data.children)
}

reddit.requestAbout = (subreddit) => {
	const url = `https://www.reddit.com${subreddit}/about.json`
	return fetch(url)
		.then(resp => resp.json())
		.then(json => json.data)
}

reddit.search = (query, subreddit = "", sort = "", after = "") => {
	const url = `https://reddit.com${subreddit}/search/.json?q=${query}&restrict_sr=1&jsonp=?`
	return fetchJsonp(url)
		.then(resp => resp.json())
		.then(json => json.data.children)
}

reddit.searchName = (query, exact = false) => {
	const url = `https://reddit.com/api/search_reddit_names.json?query=${query}&exact=${exact}`
	return fetchJsonp(url)
		.then(resp => resp.json())
		.then(json => json.names)
}

reddit.requestPost = (permalink) => {
	const url = `https://reddit.com${permalink}.json?raw_json=1`
	return fetch(url).then(json => json[0].data.children[0].data)
}

export default reddit
