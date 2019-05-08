import createImg from '../createImg.js'



const clientID = "1db5a663e63400b"



class Album {
	div = document.createElement("div")
	images = document.createElement("div")
	left = document.createElement("div")
	right = document.createElement("div")

	counter = 0

	constructor() {
		this.div.className = "album"
		this.images.className = "album-images"
		this.left.className = "album-control album-left"
		this.right.className = "album-control album-right"


		this.div.appendChild(this.images)
		this.div.appendChild(this.left)
		this.div.appendChild(this.right)


		this.left.onclick = () => {
			if (this.counter > 0) {
				this.images.style.right = this.images.children[--this.counter].offsetLeft + "px"
				this.right.style.display = "block"

				if (this.counter === 0) {
					this.left.style.display = "none"
				}
			}
		}

		this.right.onclick = () => {
			if (this.counter + 1 < this.images.children.length) {
				this.images.style.right = this.images.children[++this.counter].offsetLeft + "px"
				this.left.style.display = "block"
				if (this.counter === this.images.children.length - 1) {
					this.right.style.display = "none"
				}
			}
		}
	}


	addImage(url) {
		const img = createImg(url)
		this.images.appendChild(img)
	}
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

			const album = new Album()

			data.images.forEach(image => {
				album.addImage(image.link)
			})

			elem.appendChild(album.div)
		})

	return elem
}



export default getImgur