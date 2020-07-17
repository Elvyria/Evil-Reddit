export function gfycat(url) {
	const base = url.substring(0, url.lastIndexOf('.')).replace("thumbs.", "").replace("giant.", "").replace("-mobile", "").replace("-size_restricted", "")

	const sd = base.replace("gfycat", "thumbs.gfycat") + "-mobile"
	const hd = base.replace("gfycat", "giant.gfycat")

	return { hd: hd, sd: sd }

}
