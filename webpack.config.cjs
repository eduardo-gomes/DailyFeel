// @ts-check
const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = /** @type { import("webpack").Configuration } */ {
	entry: "./src/no_hydration.tsx",
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				exclude: /node_modules/,
				loader: "babel-loader",
				options: {
					presets: ["solid", "@babel/preset-typescript"],
				}
			},
			{
				test: /\.css$/i,
				use: ["style-loader", "css-loader"],
			},
		],
	},
	resolve: {
		extensions: [".tsx", ".ts", ".js"],
	},
	output: {
		filename: "bundle.js",
		path: path.resolve(__dirname, "out/dist"),
		clean: true,
	},
	plugins: [
		new HtmlWebpackPlugin({
			template: "src/index.html",
			scriptLoading: "module"
		})
	]
};