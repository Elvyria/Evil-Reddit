const $ribbon = $(".reddit-ribbon");
const $searchbar = $("input");

const flex = new FlexSearch();

let lastpost = "";

var reddit = { 
	subreddit: "",
	sortmethod: "hot",
	time: "",
	limit: 75,
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

	loadPosts(subreddit, "hot", "", reddit.limit)

	reddit.subreddit = subreddit;

	let loading = false;
	window.addEventListener("scroll", function() {
		if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 1000) {
			// TODO: Searchbar shouldn't work this way
			if (!loading && $searchbar.val() == "") {
				loading = true;
				loadPosts(subreddit, reddit.sortmethod, lastpost, reddit.limit)
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

function createImg(url) {
	const img = document.createElement("img");
	img.className = "lazyload";
	img.setAttribute("data-src", url);
	return img;
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
			// let previewURL = post.preview.images[0].source.url.replace(/&amp;/g, "&");
			// Killing quality, but saving a bunch of bandwidth.
			const previewURL = post.preview.images[0].resolutions[2].url.replace(/&amp;/g, "&");
			div.appendChild(createImg(previewURL));
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

function imgur(url) {
	const clientID = "1db5a663e63400b";
	const requestURL = url.replace("imgur.com", "api.imgur.com/3").replace("/a/", "/album/");
	const options = {
		headers: {
			Authorization: `Client-ID ${clientID}`
		}
	};

	const elem = document.createElement("div");

	const promise = fetch(requestURL, options)
		.then(resp => resp.json())
		.then(json => {
			json = json.data;

			if (json.images.length == 1) {
				const img = createImg(json.images[0].link);
				img.style.width = "100%";
				elem.appendChild(img);
				return;
			};

			const album = createAlbum();

			json.images.forEach(image => {
				album.addImage(image.link);
			});

			elem.appendChild(album);
		});

	return elem;
}

function createAlbum() {
	const album = document.createElement("div");
	const images = document.createElement("div");
	const left = document.createElement("div");
	const right = document.createElement("div");

	album.className = "album";
	images.className = "album-images";
	left.className = "album-control album-left";
	right.className = "album-control album-right";

	album.addImage = function(url) {
		const img = createImg(url);
		images.appendChild(img);
	}

	let i = 0;

	left.onclick = function() {
		if (i > 0) {
			images.style.right = images.children[--i].offsetLeft + "px";
			right.style.display = "block";
			if (i == 0) {
				left.style.display = "none";
			}
		}
	}

	right.onclick = function() {
		if (i + 1 < images.children.length) {
			images.style.right = images.children[++i].offsetLeft + "px";
			left.style.display = "block";
			if (i == images.children.length - 1) {
				right.style.display = "none";
			}
		}
	}

	album.appendChild(images);
	album.appendChild(left);
	album.appendChild(right);

	return album;
}

function deviantart(url) {
	let backendURL = "https://backend.deviantart.com/oembed?format=jsonp&callback=?&url=";
	let img = createImg();

	$.getJSON(backendURL + url, json => {
		img.setAttribute("data-src", json.url);
		img.setAttribute("data-loaded", false);
	});

	return img;
}
