import { observer, lazyload } from "./observe.js"

import Hls from "hls.js"

let hls

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

		video.addEventListener("enterView", loadPoster, { once: true })

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

		video.addEventListener("enterView", video.play)

		observer.observe(video)
	}

	video.addEventListener("play", play)
	video.addEventListener("pause", pause)

	video.addEventListener("exitView", video.pause)

	if (!urls) return video

	if (urls.hls) {
		if (Hls.isSupported())
		{
			video.dataset.src = urls.hls
			video.addEventListener("play", initHLS)
		}
		else if (video.canPlayType(mime.hls))
		{
			video.addSource(urls.hls, mime.hls)
		}
	}

	// if (urls.fallback)
		// video.addSource(urls.fallback)

	if (urls.sd)
		video.addSource(urls.sd)

	if (urls.hd)
		video.addSource(urls.hd)

	return video
}

function play() {
	observer.observe(this)
}

function pause() {
	if (!this.loop)
		observer.unobserve(this)
}

function loadPoster() {
	lazyload(this, "poster")
}

function addSource(src, type) {
	const source = document.createElement("source")
	source.src = src

	if (type)
		source.type = type

	this.appendChild(source)
}

function initHLS() {
	if (!hls) hls = new Hls()

	if (hls.media === this) return;

	if (hls.media) {
		hls.media.pause()
		hls.media.src = null
		hls.destroy()

		hls = new Hls()
	}

	hls.attachMedia(this)
	hls.on(Hls.Events.MEDIA_ATTACHED, () => {
		hls.loadSource(hls.media.dataset.src)
		hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
			hls.currentLevel = data.levels.length - 1
			hls.media.play()
		})
	})
}

// function maximizeQuality(event, data) {
	// hls data.levels.
// }
