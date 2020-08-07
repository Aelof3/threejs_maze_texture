import * as THREE from 'three';
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import MazeGen from './classes/MazeGen';
import { GUI } from 'three/examples/jsm/libs/dat.gui.module.js';

///////////////////////////////////////////////////////////////
//             MAZE
//////////////////////////////////////////////////////////////
// Global variables

// generate a random maze image dataURI with the maze.draw function
var scene, renderer, camera, controls;
var paramList;
var mazeSphere;

var params = function() {
    this.pathWidth = 15;
    this.width = 10;
    this.height = 10;
    this.wall = 15;
    this.wallColor = '#ffffff';
    this.pathColor = '#000000';
    this.objColor = '#460a50';
    this.outerWall = 5;
    this.seed = '1';
}

function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

function paramHandler(){
    let uri = initMaze(paramList);
    let h = hexToRgb(paramList.objColor);
    loadHeightMap(uri,(mat)=>{
        mazeSphere.material = mat;
    });
}

function initMaze(plist) {
    return new MazeGen(plist).getDataURL();
}

function loadHeightMap(uri,cb) {
    let loader = new THREE.TextureLoader();

    // use the dataURI to generate the height map
    loader.load(uri, function ( texture ) {
        let customMaterial = createMat( { texture: texture } );
        
        if (typeof cb === "function") cb(customMaterial);
    });
}



function createMat( data ){
        let texture = data.texture;
        let color = hexToRgb(paramList.objColor);
        let zScale = 1;
        
        // fake a lookup table
        let lut = [];
        for ( let n=0; n<256; n++ ) {
            lut.push(new THREE.Vector3(0.5, 0.4, 0.3));
        }
        
        // use "const" to create global object
        var customUniforms = {
            zTexture:	{ type: "t", value: texture },
            zScale:	    { type: "f", value: zScale },
            zLut:       { type: "v3v", value: lut }
        };

        var customMaterial = new THREE.ShaderMaterial({
            uniforms: customUniforms,
            vertexShader:   `uniform sampler2D   zTexture;
                            uniform float       zScale;
                            uniform vec3        zLut[ 256 ];

                            varying float vAmount;

                            void main() {
                                vec4 heightData = texture2D( zTexture, uv );

                                vAmount = heightData.r * 6.; 

                                // move the position along the normal
                                vec3 newPosition = position + normal * zScale * vAmount;

                                gl_Position = projectionMatrix * modelViewMatrix * vec4( newPosition, 0.5 );
                            }`,
            fragmentShader: `uniform vec3 zLut[ 256 ];

                            varying float vAmount;

                            void main() {
                                int index = int(vAmount) * 255;
                                float brightness = 9.;
                                vec3 vColor = vec3(vAmount/brightness, vAmount/brightness, vAmount/brightness);
                                //gl_FragColor = vec4(zLut[32], 1.0);
                                vec3 col2 = vec3 ((${color.r}.0 / 255.0), (${color.g}.0 / 255.0), (${color.b}.0 / 255.0));
                                gl_FragColor = vec4(mix(vColor,col2,0.5), 1.0);
                            }`,
            side: THREE.DoubleSide,
            flatshading: true
        });

        return customMaterial;

}

function init() {
    renderer = new THREE.WebGLRenderer( {antialias:true} );
    let width = window.innerWidth;
    let height = window.innerHeight;
    renderer.setSize (width, height);
    document.body.appendChild (renderer.domElement);

    scene = new THREE.Scene();

    //var axesHelper = new THREE.AxesHelper( 500 );
    //scene.add( axesHelper );
    
    camera = new THREE.PerspectiveCamera (45, width/height, 1, 10000);
    camera.position.y = 25;
    camera.position.z = -275;
    camera.lookAt (new THREE.Vector3(0,0,0));

    controls = new OrbitControls( camera, renderer.domElement );
    controls.update();

    let pointLight = new THREE.PointLight (0xffffff);
    pointLight.position.set (0,10,20);
    scene.add (pointLight);
    
    let ambLight = new THREE.AmbientLight(0x808080);
    scene.add( ambLight );
        
    let dirLight = new THREE.DirectionalLight(0xc0c0c0);
    dirLight.position.set(5, 20, 12);
    scene.add( dirLight );

    window.addEventListener ('resize', onWindowResize, false);
}


function onWindowResize () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize (window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame ( animate );
    

    render();
}

function render(){

    renderer.render( scene, camera );	
}


paramList = new params();
var gui = new GUI({width:650});
gui.add( paramList, 'pathWidth' ).name( 'Width of the Maze Path' ).onChange(paramHandler);
gui.add( paramList, 'width' ).name( 'Number paths fitted horisontally' ).onChange(paramHandler);
gui.add( paramList, 'height' ).name( 'Number paths fitted vertically' ).onChange(paramHandler);
gui.add( paramList, 'wall' ).name( 'Width of the Walls between Paths' ).onChange(paramHandler);
gui.add( paramList, 'outerWall' ).name( 'Width of the Outer most wall' ).onChange(paramHandler);
gui.addColor( paramList, 'wallColor' ).name( 'Heightmap Wall Color Differential' ).onChange(paramHandler);
gui.addColor( paramList, 'pathColor' ).name( 'Heightmap Path Color Differential' ).onChange(paramHandler);
gui.addColor( paramList, 'objColor' ).name( 'Sphere Base Color' ).onChange(paramHandler);
gui.add( paramList, 'seed' ).name( 'Seed for the Random Number Generator' ).onChange(paramHandler);

let dataURI = initMaze(paramList);

init();
loadHeightMap(dataURI,(mat)=>{
    let sphereGeo = new THREE.SphereGeometry( 25, 100, 100 );
    mazeSphere = new THREE.Mesh( sphereGeo, mat );

    mazeSphere.rotation.x = -Math.PI / 2;
    mazeSphere.position.y = 0;
    
    scene.add(mazeSphere);
});
animate();




///////////////////////////////////////////////////////////////
//             
//////////////////////////////////////////////////////////////