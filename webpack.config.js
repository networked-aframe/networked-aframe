module.exports = {
    entry  : './src/index.js',
    output : {
        path     : __dirname,
        filename : './dist/networked-aframe.js'
    },
    mode: 'development',
    module : {
        rules: [
            {
                test: /.js$/,
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
