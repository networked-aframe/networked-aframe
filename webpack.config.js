const path = require("path");

module.exports = {
    entry  : './src/index.js',
    output : {
        path     : path.resolve(__dirname, 'dist'),
        publicPath: '/dist/',
        filename : 'networked-aframe.js'
    },
    mode: 'development',
    module : {
        rules: [
            {
                test: /\.js$/,
                use: {
                    loader: 'babel-loader',
                    options: {
                      presets: ['@babel/preset-env']
                    }
                }
            }
        ]
    }
};
