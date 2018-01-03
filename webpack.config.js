module.exports = {
    entry  : './src/index.js',
    output : {
        path     : __dirname,
        filename : './dist/networked-aframe.js'
    },
    module : {
        loaders: [ {
                test   : /.js$/,
                loader : 'babel-loader'
            }
        ]
    }
};
