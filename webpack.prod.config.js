module.exports = {
    entry  : './src/index.js',
    output : {
        path     : __dirname,
        filename : './dist/networked-aframe.min.js'
    },
    mode: 'production',
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