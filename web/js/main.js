var ribbon = document.querySelector(".reddit-ribbon");
let observer = lozad(".reddit-post > img", {
	loaded: function(elem) {
		elem.removeAttribute("data-src");
	}
});

function addPosts(posts) {
	posts.forEach((item, i) => addToRibbon(item.data));
}

function addToRibbon(post) {
	let div = document.createElement("div");
	div.id = post.name;
	div.className = "reddit-post";

	let h2 = document.createElement("h2");
	// Such posts require innerHTML instead of textContent
	// (reddit.com/r/awwnime/comments/bhew2y/the_rainy_season_hero_froppy_3_boku_no_hero/)
	h2.innerText = post.title;
	div.appendChild(h2);

	// TODO: Simplify
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
			// TODO: Extract to prevent switch ladders.
			switch (post.domain) {
				case "imgur.com":
					div.appendChild(imgur(post.url));
					break;
				case "deviantart.com":
					div.appendChild(deviantart(post.url));
					break;
			}
			break;
		default:
			let textNode = document.createElement("div");
			div.innerHTML += decodeHTML(post.selftext_html);
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

function deviantart(url) {
	let backendURL = "https://backend.deviantart.com/oembed?format=jsonp&callback=?&url=";
	let img = document.createElement("img");
	// TODO: Handle not json responses.
	// Why we can't do it without jquery or any 3rd party lib
	// https://stackoverflow.com/questions/43471288/how-to-use-jsonp-on-fetch-axios-cross-site-requests/43474806#43474806
	$.getJSON(backendURL + url, json => { img.setAttribute("data-src", json.url); img.setAttribute("data-loaded", false); observer.observe(); } );
	return img;
}

function loadMore(subreddit, after = "", limit = "") {
	let url = "http://www.reddit.com" + subreddit + ".json" + "?after=" + after + "&limit=" + limit;
	// TODO: Handle not json responses.
	fetch(url)
		.then(resp => resp.json())
		.then(json => {
			addPosts(json.data.children)
			observer.observe();
		});
}

loadMore("/r/dfo/", ribbon.lastChild.id);

// TODO: Should start loading not at the bottom, but somewhere close to it.
window.onscroll = function() {
    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight) {
	    loadMore("/r/dfo/", ribbon.lastChild.id);
    }
};
