const fetchJsonp = require("fetch-jsonp")

const config = loadConfig("./config.json").then(main)

const searchbar = document.getElementById("searchbar")
const input = document.getElementsByTagName("input")[0]
const time = document.getElementById("time")
const suggestions = document.getElementById("search-suggestions")
const buttons = [].slice.call(document.getElementsByTagName('button'))

function main() {

	buttons.forEach(button => button.onclick = (e) => {
		const searchURL = button.getAttribute("search")

		if (e.shiftKey && searchURL) {

		}

		const query = input.value.trim()

		if (searchURL && query.length > 0) {
			search(query, searchURL)
		} else {
			window.open(button.getAttribute("href"))
		}
	})

	input.addEventListener("input", (e) => {
		gComplete(input.value).then(data => {
			empty(suggestions)
			suggestions.add(data[0])
			suggestions.add(data[1])
			suggestions.add(data[2])
		})
	})

	document.config = config

	input.value = ""
	updateTime(config.UTC)
}

suggestions.add = (s) => {
	const div = document.createElement("div")
	div.textContent = s

	suggestions.appendChild(div)
}

function empty(elem) {
	while (elem.firstChild) {
		elem.removeChild(elem.firstChild)
	}
}

function gComplete(query) {
	const url = "https://www.google.com/complete/search?client=firefox&q=" + query

	return fetchJsonp(url)
		.then(resp => resp.json())
		.then(json => json[1])
}

function search(query, url) {
	window.open(url.replace("%query%", query))
}

function updateTime(utc) {
	const current = new Date()
	if (utc && utc !== 0 ) {
		current.setTime(current.getTime() + config.UTC * 60 * 60 * 1000)
	}
	time.innerText = addZero(current.getHours()) + ':' + addZero(current.getMinutes())
	setTimeout(updateTime, (60 - current.getSeconds()) * 1000)
}

function addZero(n) {
	return n < 10 ? '0' + n : n
}
