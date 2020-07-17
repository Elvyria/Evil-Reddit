const path = require('path');

module.exports = {
	entry: './js/src/reddit.js',
	mode: 'development',
	module: {
		rules: [{
			test: /\.js$/,
			use: {
				loader: 'babel-loader',
				options: {
					presets: ['@babel/preset-env']
				}
			}
		}]
	},
	output: {
		filename: 'reddit.js',
		path: path.resolve(__dirname, 'js')
	}
};
