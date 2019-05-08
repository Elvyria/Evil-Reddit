function scriptRequest(path, success, error) {
	var xhr = new XMLHttpRequest()
	xhr.onreadystatechange = function () {
		if (xhr.readyState === XMLHttpRequest.DONE) {
			if (xhr.status === 200) {
				if (success)
					success(JSON.parse(xhr.responseText))
			} else {
				if (error)
					error(xhr)
			}
		}
	}
	xhr.open("GET", path, true)
	xhr.send()
}

function scriptRequestPromise(jsonpUrl) {
	let resolves = null
	let rejects = null

	const returnValue = new Promise((resolve, reject) => {
		resolves = resolve
		rejects = reject
	})

	scriptRequest(jsonpUrl, resolves, rejects)

	return returnValue
}

export default scriptRequestPromise