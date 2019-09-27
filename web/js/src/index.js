const searchbar = document.getElementById("searchbar")
const input = document.getElementById("search-input")
const time = document.getElementById("time")

// updateTime()


function gComplete(query) {
	const url = "https://www.google.com/complete/search?client=firefox&q=" + query

	return fetch(url)
		.then(resp => resp.json())
		.then(json => json[1])
}

// Update time is broken here, investigation required
// Time zone is not implemented
function updateTime() {
	const current = new Date()
	time.innerText = addZero(current.getHours()) + ':' + addZero(current.getMinutes())
	setInterval(updateTime, (60 - current.getSeconds()) * 1000)
}

function addZero(n) {
	return n < 10 ? '0' + n : n
}
