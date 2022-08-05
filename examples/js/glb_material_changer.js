var elements = document.getElementsByClassName('override-materials');


function hexToRgbA(hex){
    var c;
    if(/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)){
        c= hex.substring(1).split('');
        if(c.length== 3){
            c= [c[0], c[0], c[1], c[1], c[2], c[2]];
        }
        c= '0x'+c.join('');
        return 'rgba('+[(c>>16)&255, (c>>8)&255, c&255].join(',')+',1)';
    }
    throw new Error('Bad Hex');
}


for (let el of elements)
{
// wait until model is loaded
    el.addEventListener('model-loaded', function (event) {

        let materialNew = el.getAttribute("material");

        el.object3D.traverse(function (object3D) {
            let mat = object3D.material;
            if (mat) {

                mat.color.set( hexToRgbA(materialNew.color));

                if(materialNew.roughness) {
                    mat.roughness = materialNew.roughness;
                }
                if(materialNew.metalness) {
                    mat.metalness = materialNew.metalness;
                }
                if(materialNew.emissive) {
                    mat.emissive.set(hexToRgbA(materialNew.emissive));
                }
                if(materialNew.emissiveIntensity) {
                    mat.emissiveIntensity = materialNew.emissiveIntensity;
                }

                // Video texture
                if(materialNew.src){
                    // var videoDom = Array();
                    // var videoTexture = Array();
                    //
                    // videoDom[name] = document.createElement('video');
                    // videoDom[name].autoplay = true;
                    // videoDom[name].muted = true;
                    // videoDom[name].src = resources3D[name]['videoTextureSrc'];
                    // videoDom[name].load();
                    // videoTexture[name] = new THREE.VideoTexture(videoDom[name]);
                    //
                    // videoTexture[name].wrapS = videoTexture[name].wrapT = THREE.RepeatWrapping;
                    //
                    // var rX = resources3D[name]['videoTextureRepeatX'];
                    // var rY = resources3D[name]['videoTextureRepeatY'];
                    //
                    // videoTexture[name].repeat.set(rX, rY);
                    // videoTexture[name].rotation = resources3D[name]['videoTextureRotation'];
                    //
                    // var cX = resources3D[name]['videoTextureCenterX'];
                    // var cY = resources3D[name]['videoTextureCenterY'];
                    // videoTexture[name].center = new THREE.Vector2(cX, cY);
                    //
                    //
                    // var cHex = "#" + resources3D[name]['color'];
                    //
                    // var movieMaterial = new THREE.MeshBasicMaterial({map: videoTexture[name], side: THREE.DoubleSide, color: cHex});
                }

            }
        })

    });
}
