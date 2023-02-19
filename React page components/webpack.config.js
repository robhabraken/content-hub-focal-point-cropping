const EsmWebpackPlugin = require("@purtuga/esm-webpack-plugin");
const path = require('path');
const CompressionPlugin = require('compression-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = {
    entry: {
        publicLinkViewer: './src/publicLinkApp.tsx',
        focalPointEditor: './src/focalPointApp.tsx'
    },
    node: {
        fs: 'empty'
    },
    devtool: 'source-map',
    module: {
        rules: [
            {
                test: /\.css$/,
                use: [
                    "style-loader",
                    {
                        loader: "css-loader",
                        options: {
                            importLoaders: 1,
                            modules: true,
                        },
                    },
                ],
                include: /\.module\.css$/,
            },
            {
                test: /\.css$/,
                use: ["style-loader", "css-loader"],
                exclude: /\.module\.css$/,
            },
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
    },
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'dist'),
        library: "EXTERNAL",
        libraryTarget: "var"
    },
    externals: [
        {
            // "react": "React16",
            // "react-dom": "ReactDOM16",
            // "@material-ui/core": "MaterialUiCore4",
            // TODO: sc-contenthub-webclient-sdk needs a single point of import for sharing this dependency to work
            // "@sitecore/sc-contenthub-webclient-sdk/dist/authentication/oauth-password-grant": "ScChWcSdkOAuth",
            // "@sitecore/sc-contenthub-webclient-sdk/dist/clients/content-hub-client": "ScChWcSdkChClient"
        },
    ],
    plugins: [
        // new BundleAnalyzerPlugin({
        //     defaultSizes: "parsed",
        //     analyzerMode: "static",
        // }),
        new EsmWebpackPlugin(),
        new CompressionPlugin({
            algorithm: 'gzip',
        }),
    ]
};