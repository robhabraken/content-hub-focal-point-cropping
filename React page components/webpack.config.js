const path = require('path');
const NodePolyfillPlugin = require("node-polyfill-webpack-plugin");
const webpack = require("webpack");

module.exports = {
    entry: {
        publicLinkViewer: './src/publicLinkApp.tsx',
        focalPointEditor: './src/focalPointApp.tsx'
    },
    target: ["web", "es2020"],
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
        fallback: {
            fs: false,
            https: false,
        },        
    },
    devtool: "source-map",
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'dist'),
        library: {
            type: "module",
        },
    },
    experiments: { outputModule: true, backCompat: false },
    optimization: {
        minimize: false,
    },
    plugins: [
        new NodePolyfillPlugin(),
        new webpack.ProvidePlugin({
            process: "process/browser",
        }),
    ]
};