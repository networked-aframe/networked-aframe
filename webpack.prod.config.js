module.exports = {
    entry  : './src/index.js',
    output : {
        path     : __dirname,
        filename : './dist/networked-aframe.min.js'
    },
    module : {
        loaders: [ {
                test   : /.js$/,
                loader : 'babel-loader'
            }
        ]
    }
};