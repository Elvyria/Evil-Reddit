Object.defineProperty(Array.prototype, "last_or", {
	enumerable: false,
	value: function(n) {
		if (this.length <= n) {
			return this[this.length - 1]
		}

		return this[n]
	}
})

