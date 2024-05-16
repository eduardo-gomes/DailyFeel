// @ts-check
const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

const Rendered = /** @type {{app: string, hydration: string}}*/ require("./out/ssr/ssr.cjs").default;

module.exports = /** @type { import("webpack").Configuration } */ {
	entry: "./src/index.tsx",
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				exclude: /node_modules/,
				loader: "babel-loader",
				options: {
					presets: [["solid", { "generate": "dom", "hydratable": true }], "@babel/preset-typescript"],
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
			templateParameters: {
				Rendered
			},
			scriptLoading: "module"
		})
	]
};