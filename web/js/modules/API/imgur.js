import createImg from '../createImg.js'



const clientID = "1db5a663e63400b"



function createAlbum() {
	const album = document.createElement("div")
	const images = document.createElement("div")
	const left = document.createElement("div")
	const right = document.createElement("div")

	album.className = "album"
	images.className = "album-images"
	left.className = "album-control album-left"
	right.className = "album-control album-right"

	album.addImage = function (url) {
		const img = createImg(url)
		images.appendChild(img)
	}

	let i = 0

	left.onclick = function () {
		if (i > 0) {
			images.style.right = images.children[--i].offsetLeft + "px"
			right.style.display = "block"
			if (i === 0) {
				left.style.display = "none"
			}
		}
	}

	right.onclick = function () {
		if (i + 1 < images.children.length) {
			images.style.right = images.children[++i].offsetLeft + "px"
			left.style.display = "block"
			if (i === images.children.length - 1) {
				right.style.display = "none"
			}
		}
	}

	album.appendChild(images)
	album.appendChild(left)
	album.appendChild(right)

	return album
}



function getImgur(url) {
	const requestURL = url.replace("imgur.com", "api.imgur.com/3").replace("/a/", "/album/")
	const options = {
		headers: {
			Authorization: `Client-ID ${clientID}`
		}
	}

	const elem = document.createElement("div")

	const promise = fetch(requestURL, options)
		.then(resp => resp.json())
		.then(json => {
			const data = json.data

			if (data.images.length == 1) {
				const img = createImg(data.images[0].link)

				// GE: Why needed?
				img.style.width = "100%"

				elem.appendChild(img)
				return
			}

			const album = createAlbum()

			data.images.forEach(image => {
				album.addImage(image.link)
			})

			elem.appendChild(album)
		})

	return elem
}



export default getImgur