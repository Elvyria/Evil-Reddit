export function imgur(url) {
	// s =   90 × 90
	// b =  160 × 160
	// t =  160 × 160
	// m =  320 × 320
	// l =  640 × 640
	// h = 1024 × 1024
}

export function gfycat(url) {
	const base = url.substring(0, url.lastIndexOf('.')).replace("thumbs.", "").replace("giant.", "").replace("-mobile", "").replace("-size_restricted", "")

	const sd = base.replace("gfycat", "thumbs.gfycat") + "-mobile" + ".mp4"
	const hd = base.replace("gfycat", "giant.gfycat") + ".mp4"

	return { hd: hd, sd: sd }
}

export function redgifs(url) {
	url = url.endsWith('/') ? url.slice(0, -1) : url

	const id = url.substring(url.lastIndexOf('/'))

	return fetch(`https://api.redgifs.com/v1/gfycats${id}`)
		.then(resp => resp.json())
		.then(json => {
			if (json.errorMessage.code === "NotFound") {
				return null
			}

			return { hd: json.gfyItem.mp4Url, sd: json.gfyItem.miniUrl }
		})
}
