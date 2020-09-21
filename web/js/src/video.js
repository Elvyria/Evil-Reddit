import { observer, lazyload } from "./observe.js"

const mime = {
	hls: "application/vnd.apple.mpegurl",
	dash: "application/dash+xml",
}

export function createVideo(urls, poster, controls) {
	const video = document.createElement("video")
	video.addSource = addSource

	if (poster) {
		video.dataset.poster = poster
		video.preload = "none"
		video.observe = true

		video.addEventListener("enterView", enterView, { once: true })

		observer.observe(video)
	}

	// TODO: Custom controls
	if (controls) {
		video.controls = true

		// const controls = document.createElement("div")

		// const playpause = document.createElement("div")
		// playpause.addEventListener('click', () => {
		// if (video.paused || video.ended) {
		// video.play()
		// } else {
		// video.pause()
		// }
		// });

		// const progress = document.createElement("progress")
		// video.addEventListener('loadedmetadata', () => {
		// progress.setAttribute('max', video.duration);
		// });

		// const volume = document.createElement("div")
		// const fullscreen = document.createElement("div")

	} else {
		video.loop = video.autoplay = video.muted = true
	}

	video.addEventListener("play", play)
	video.addEventListener("pause", pause)

	video.addEventListener("exitView", video.pause)

	if (!urls) return video

	if (urls.hls) {
		// if (Hls.isSupported())
		// {
			// video.source = urls.hls
			// video.addEventListener("play", initHLS)
		// }
		// else if (video.canPlayType(mime.hls))
		// {
			// video.addSource(urls.hls, mime.hls)
		// }
	}

	if (urls.fallback)
		video.addSource(urls.fallback)

	if (urls.sd)
		video.addSource(urls.sd)

	if (urls.hd)
		video.addSource(urls.hd)

	return video
}

function play(event) {
	if (event.target !== this)
		return

	this.observe = true;
	observer.observe(this)
}

function pause(event) {
	if (event.target !== this)
		return

	delete this.observe;
	observer.unobserve(this)
}

function enterView(event) {
	event.target.poster = event.target.dataset.poster
	if (!event.target.loop)
		event.target.observe = false
}

function addSource(src, type) {
	const source = document.createElement("source")
	source.src = src

	if (type)
		source.type = type

	this.appendChild(source)
}

function initHLS(event) {
	if (!hls) hls = new Hls()

	if (hls.media === event.target) return;

	if (hls.media) {
		hls.media.pause()
		hls.media.src = null
		hls.destroy()
	}

	hls = new Hls()
	const url = event.target.source
	hls.attachMedia(event.target)
	hls.loadSource(url)
	hls.media.play()
	// hls.on(Hls.Events.MANIFEST_PARSED, maximizeQuality)
}

// function maximizeQuality(event, data) {
	// hls data.levels.
// }
