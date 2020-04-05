const path = require('path');

module.exports = {
	entry: {
		index: './js/src/index.js',
		reddit: './js/src/reddit.js',
		redditapi: './js/src/reddit.api.js'
	},
	mode: 'development',
	output: {
		filename: '[name].bundle.js',
		path: path.resolve(__dirname, 'js')
	}
};
