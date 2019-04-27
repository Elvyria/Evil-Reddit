var ribbon = document.getElementById("reddit-ribbon");

function addPosts(posts) {
	posts.forEach((item, i) => addToRibbon(item.data));
}

function addToRibbon(post) {
	let div = document.createElement("div");
	div.id = post.name;
	div.className = "reddit-post";

	let h2 = document.createElement("h2");
	h2.textContent = post.title;
	div.appendChild(h2);

	if (isImage(post.url)) {
		let img = document.createElement("img");
		img.setAttribute("data-src", post.url);
		div.appendChild(img);
	} else {
		if (post.url.includes("imgur.com/a/")) {
			frame = imgur(post.url);
			div.appendChild(frame);
		}
	}

	ribbon.appendChild(div);
}

function isImage(url) {
	let result = false;
	let exts = [".jpg", ".png", ".gif"];
	exts.forEach(e => { if (url.endsWith(e)) { result = true; } } );
	return result;
}

function imgur(url) {
	let frame = document.createElement("iframe");
	frame.setAttribute("scrolling", "no");
	frame.setAttribute("frameborder", 0);
	frame.src = url + "/embed?pub=true";

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

loadMore("/r/awwnime/", ribbon.lastChild.id);

window.onscroll = function() {
    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight) {
	    loadMore("/r/awwnime/", ribbon.lastChild.id);
    }
};
