import { once } from "./globals.js"
import { observer, lazyload } from "./observe.js"

import Hls from "hls.js"

let hls

const mime = {
	hls: "application/vnd.apple.mpegurl",
	dash: "application/dash+xml",
}

export function video(urls, poster, controls) {
	const video = document.createElement("video")
	video.addSource = addSource
	video.loadSource = loadSource

	if (poster) {
		video.dataset.poster = poster
		video.preload = "none"

		video.addEventListener("enterView", loadPoster, once)

		observer.observe(video)
	}

	// TODO: Custom controls
	if (controls)
	{
		video.controls = true
		addControls(video)
	}
	else
	{
		video.loop = video.muted = true
	}

	video.addEventListener("play", play)
	video.addEventListener("pause", pause)

	video.addEventListener("exitView", video.pause)

	if (!urls) return video

	video.urls = urls
	video.addEventListener("enterView", init, once)

	observer.observe(video)

	return video
}

function init(event) {
	const video = event.target

	if (typeof video.urls === "function")
		video.urls = video.urls()

	Promise.resolve(video.urls).then(urls => {
		if (!urls) return

		if (urls.hls)
		{
			if (Hls.isSupported())
			{
				video.dataset.src = urls.hls
				video.addEventListener("play", initHLS)
			}
			else if (video.canPlayType(mime.hls))
			{
				video.dataset.src = urls.uls
			}
		}
		else if (urls.sd)
		{
			video.src = urls.sd

			if (urls.hd)
				video.dataset.source = urls.hd
		}
		else if (urls.hd)
		{
			video.src = urls.hd
		}

		if (video.loop) {
			video.preload = "auto"
			video.addEventListener("canplaythrough", video.play, once)

			// All videos are paused on exitView, this will resume it
			video.addEventListener("enterView", video.play)
		}
	})
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

function loadSource() {
	if (!this.dataset.source)
		return

	const video = this

	if (video.paused)
	{
		const time = video.currentTime;
		video.src = video.dataset.source
		video.currentTime = time

		delete video.dataset.source
	}
	else
	{
		const preload = document.createElement("video")
		preload.preload = "auto"
		preload.src = video.dataset.source
		preload.addEventListener("canplaythrough", () => {
			const time = video.currentTime;

			video.src = video.dataset.source
			delete video.dataset.source

			video.currentTime = time;
			video.play()
		}, once)
	}
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

function addControls(video) {
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
}
