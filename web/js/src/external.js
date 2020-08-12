export function gfycat(url) {
	const base = url.substring(0, url.lastIndexOf('.')).replace("thumbs.", "").replace("giant.", "").replace("-mobile", "").replace("-size_restricted", "")

	const sd = base.replace("gfycat", "thumbs.gfycat") + "-mobile" + ".mp4"
	const hd = base.replace("gfycat", "giant.gfycat") + ".mp4"

	return { hd: hd, sd: sd }
}

export function redgifs(url) {
	const id = url.substring(url.lastIndexOf('/'))

	return fetch(`https://api.redgifs.com/v1/gfycats/${id}`)
		.then(resp => resp.json())
		.then(json => { return { hd: json.gfyItem.mp4Url, sd: json.gfyItem.miniUrl } })
}
