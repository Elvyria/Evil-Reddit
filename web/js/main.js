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

	let img = document.createElement("img");
	img.setAttribute("data-src", post.url);

	div.appendChild(h2);
	div.appendChild(img);
	ribbon.appendChild(div);
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
