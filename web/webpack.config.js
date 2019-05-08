const path = require('path');

module.exports = {
	entry: './js/src/reddit.js',
	mode: 'development',
	output: {
		filename: 'reddit.bundle.js',
		path: path.resolve(__dirname, 'js')
	}
};
