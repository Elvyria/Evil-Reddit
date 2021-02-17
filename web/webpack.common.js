const path = require('path');

module.exports = {
	entry: './js/src/reddit.js',
	module: {
		rules: [{
			test: /\.m?js$/,
			exclude: /node_modules/,
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
