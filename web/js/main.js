var $ribbon = $(".reddit-ribbon");
var $searchbar = $("input");

let flex = new FlexSearch();

let postWidth = $(".reddit-post").width();
let lastpost = "";

var reddit = { 
	subreddit: "",
	sortmethod: "hot",
	time: "",
};

document.addEventListener("lazyloaded", function(e) {
	$ribbon.isotope("layout");
});

$searchbar.keyup((e) => {
	// Global Subreddit search through API
	if (e.keyCode == 13) {
		request = searchSubreddit($searchbar.val(), reddit.subreddit, reddit.sortmethod);
		request.then(posts => {
		});
	}

	$ribbon.isotope();
	$ribbon.isotope('layout');
});

loadSubreddit("/r/awwnime");

function loadSubreddit(subreddit) {
	clearRibbon();

	$ribbon.isotope({
		percentPosition: true,
		itemSelector: '.reddit-post',
		layoutMode: 'masonry',
		masonry: {
			fitWidth: true,
			gutter: 10
		},
		filter: function() {
			let request = $searchbar.val();
			if (request == "") {
				return true;
			}
			let result = flex.search(request);

			return result.includes($(this).index());
		}
	});

	loadPosts(subreddit, "hot")

	reddit.subreddit = subreddit;

	let loading = false;
	window.addEventListener("scroll", function() {
		if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 1000) {
			// TODO: Searchbar shouldn't work this way
			if (!loading && $searchbar.val() == "") {
				loading = true;
				loadPosts(subreddit, reddit.sortmethod, lastpost)
					.then(() => loading = false);
			}
		}
	});
}

function clearRibbon() {
	$(".reddit-ribbon").empty();
	flex.clear();
	if (Isotope.data($ribbon[0])) {
		$ribbon.isotope('destroy');
	}
}

function loadPosts(subreddit, sort = "hot", after = "", limit = "") {
	let url = `http://www.reddit.com${subreddit}/${sort}/.json?after=${after}&limit=${limit}`;

	return $.getJSON(url)
		  .then(json => json.data.children)
		  .then(posts => addPosts(posts));
}

function addPosts(posts) {
	posts.forEach(post => {
		div = createPost(post.data);
		$ribbon.append(div);
	});

	$ribbon.isotope('reloadItems');
	$ribbon.isotope();

	// Add text in posts to flex for indexing
	$ribbon.children().each(function(i, post) { flex.add(i, $(post).text()) });

	lastpost = posts[posts.length - 1].data.name;
}

function createPost(post) {
	let div = document.createElement("div");
	div.id = post.name;
	div.className = "reddit-post";

	let h2 = document.createElement("h2");
	// Such posts require innerHTML instead of textContent
	// (reddit.com/r/awwnime/comments/bhew2y/the_rainy_season_hero_froppy_3_boku_no_hero/)
	h2.innerHTML = post.title;
	div.appendChild(h2);

	let a = document.createElement("a");
	a.href = post.url;
	a.textContent = post.url.replace("https://", "").replace("www.", "");

	// TODO: Simplify
	switch(post.post_hint) {
		case "image":
			let img = document.createElement("img");
			let previewURL = post.preview.images[0].source.url.replace(/&amp;/g, "&");
			// Killing quality, but saving a bunch of bandwidth.
			// Probably should do speed test before loading subreddit.
			// post.preview.images[0].resolutions[2].url.replace(/&amp;/g, "&");
			img.className = "lazyload"
			img.setAttribute("data-src", previewURL);
			div.appendChild(img);
			break;
		case "rich:video":
			div.innerHTML += decodeHTML(post.media.oembed.html);
			div.querySelector("iframe").className = "lazyload";
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

	div.appendChild(a);

	return div
}

function searchSubreddit(query, subreddit = "", sort = "", after = "") {
	let url = `https://reddit.com${subreddit}/search/.json?q=${query}&restrict_sr=1&jsonp=?`
	return $.getJSON(url).then(json => json.data.children);
}

function decodeHTML(html) {
	let textarea = document.createElement('textarea');
	textarea.innerHTML = html;
	return textarea.value;
}

// TODO: Imgur sizes still suck, fix me pls
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
	img.className = "lazyload";

	$.getJSON(backendURL + url, json => {
		img.setAttribute("data-src", json.url);
		img.setAttribute("data-loaded", false);
	});

	return img;
}
