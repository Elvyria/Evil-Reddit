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
	video.loadSource = loadSource

	if (poster) {
		video.dataset.poster = poster
		video.preload = "none"

		video.addEventListener("enterView", loadPoster, { once: true })

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

		video.addEventListener("enterView", () => {
			if (!video.src) {
				video.src = video.dataset.src
				delete video.dataset.src
			}

			video.play()
		})

		observer.observe(video)
	}

	video.addEventListener("play", play)
	video.addEventListener("pause", pause)

	video.addEventListener("exitView", video.pause)

	if (!urls) return video

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
		video.dataset.src = urls.sd

		if (urls.hd)
			video.dataset.source = urls.hd
	}
	else if (urls.hd)
	{
		video.dataset.src = urls.hd
	}

	// TODO: Fallback

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

function loadSource() {
	if (!this.dataset.source)
		return

	if (this.paused)
	{
		this.src = this.dataset.source
		this.currentTime = time
	}
	else
	{
		const preload = this.cloneNode()
		this.parentNode.replaceChild(preload, this)

		this.src = this.dataset.source
		this.addEventListener("canplaythrough", () => {
			preload.parentNode.replaceChild(this, preload)
			this.currentTime = preload.currentTime
			this.play()

			preload.src = ""
		}, { once: true })

		this.load()
	}

	delete this.dataset.source

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
