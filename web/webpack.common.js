const path = require('path');

module.exports = {
	entry: './js/src/reddit.js',
	output: {
		filename: 'reddit.js',
		path: path.resolve(__dirname, 'js')
	}
};
