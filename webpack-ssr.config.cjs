// @ts-check
const path = require("path");
const webpack = require("webpack");

module.exports = /** @type { import("webpack").Configuration } */ {
	entry: "./src/ssr.tsx",
	target: "node",
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				exclude: /node_modules/,
				loader: "babel-loader",
				options: {
					presets: [["solid", { "generate": "ssr", "hydratable": true }], "@babel/preset-typescript"],
				}
			},
			{
				test: /\.css$/i,
				use: ["css-loader"],
			},
		],
	},
	resolve: {
		extensions: [".tsx", ".ts", ".js"],
	},
	output: {
		filename: "ssr.cjs",
		path: path.resolve(__dirname, "out/ssr"),
		library: {
			type: "commonjs-module"
		},
		clean: true,
	},
	plugins: [
		new webpack.DefinePlugin({
			IS_SSR: true
		})
	]
};