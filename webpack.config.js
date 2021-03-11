const path = require('path');

const HtmlWebpackPlugin = require('html-webpack-plugin');
const WorkboxPlugin = require('workbox-webpack-plugin');
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
    devtool: 'eval',
    entry: './src/index.js',
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'dist'),
    },
    module: {
        rules: [
            {
                test: /\.css$/i,
                use: ['style-loader', 'css-loader'],
            }
        ],

    },
    plugins: [
        new HtmlWebpackPlugin({
            template: 'src/index.html'
        }),
        new WorkboxPlugin.GenerateSW({
            // these options encourage the ServiceWorkers to get in there fast
            // and not allow any straggling "old" SWs to hang around
            clientsClaim: true,
            skipWaiting: true,
            runtimeCaching: [
                {
                    // You can use a RegExp as the pattern:
                    urlPattern: /\.mp3$/,
                    handler: 'CacheFirst',
                },
            ]
        }),
        new CopyPlugin({
            patterns: [
                { from: "audio", to: "audio" }
            ],
        })
    ],
    devServer: {
        https: false,
        host: '0.0.0.0'
    },
};
