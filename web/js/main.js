var ribbon = document.getElementById("reddit-ribbon");

function addPosts(posts) {
	posts.forEach((item, i) => addToRibbon(item.data));
}

function addToRibbon(post) {
	let div = document.createElement("div");
	div.id = post.name;
	div.className = "reddit-post";

	let h2 = document.createElement("h2");
	// Such posts require innerHTML instead of textContent (reddit.com/r/awwnime/comments/bhew2y/the_rainy_season_hero_froppy_3_boku_no_hero/)
	h2.innerHTML = post.title;
	div.appendChild(h2);

	switch(post.post_hint) {
		case "image":
			let img = document.createElement("img");
			img.setAttribute("data-src", post.url);
			div.appendChild(img);
			break;
		case "rich:video":
			div.innerHTML += decodeHTML(post.media.oembed.html);
			break;
		case "link":
			if (post.url.includes("imgur.com/a/")) {
				div.appendChild(imgur(post.url));
			}
			break;
	}

	ribbon.appendChild(div);
}

function decodeHTML(html) {
	let textarea = document.createElement('textarea');
	textarea.innerHTML = html;
	return textarea.value;
}

function imgur(url) {
	let frame = document.createElement("iframe");
	frame.scrolling = "no";
	frame.frameBorder = 0;
	frame.src = url + "/embed?pub=true";
	frame.className = "imgur";

	return frame;
}

function loadMore(subreddit, after = "", limit = "") {
	let url = "http://www.reddit.com" + subreddit + ".json" + "?after=" + after + "&limit=" + limit;
	fetch(url)
		.then(resp => resp.json())
		.then(resp => {
			addPosts(resp.data.children)
			let images = document.querySelectorAll(".reddit-post > img");
			let observer = lozad(images);
			observer.observe();
		});
}

loadMore("/r/dfo/", ribbon.lastChild.id);

window.onscroll = function() {
    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight) {
	    loadMore("/r/awwnime/", ribbon.lastChild.id);
    }
};
