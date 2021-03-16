import { hide, show } from "./globals.js"

const searchInput = document.querySelector("input")

const keys = {
	"/": { 
		"action": (event) => {
			if (document.activeElement !== searchInput) {
				searchInput.focus()
				event.preventDefault()
			}
		},
		"description": "Focus search box"
	},
	"Enter": {
		"action": (event) => {
			if (document.activeElement === searchInput)
				searchInput.blur()
		},
	},
	"Escape": {
		"name": "Esc",
		"action": (event) => {
			if (document.activeElement === searchInput)
				searchInput.blur()
		},
	},
	"?": {
		"action": () => {
			// Something something show(help)
		},
		"description": "Show help window"
	}
}

document.addEventListener("keydown", e => {
	const hotkey = keys[e.key]

	if (hotkey)
		hotkey.action(e)
})
