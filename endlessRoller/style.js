import * as THREE from 'three';

var sceneWidth;
var sceneHeight;
var camera;
var scene;
var renderer;
var dom;
var sun;
var ground;
//var orbitControl;
var rollingGroundSphere;
var heroSphere;
var baseSpeed = 0.008; // Store the base speed
var rollingSpeed = baseSpeed;
var speedMultiplier = 1; // Track speed increases
var heroRollingSpeed;
var worldRadius=26;
var heroRadius=0.2;
var sphericalHelper;
var pathAngleValues;
var heroBaseY=1.8;
var bounceValue=0.1;
var gravity=0.005;
var leftLane=-1;
var rightLane=1;
var middleLane=0;
var currentLane;
var clock;
var jumping;
var treeReleaseInterval=0.5;
var lastTreeReleaseTime=0;
var treesInPath;
var treesPool;
var particleGeometry;
var particleCount=20;
var explosionPower =1.06;
var particles;
//var stats;
var scoreText;
var score;
var hasCollided;
var highScore = 0; // Add high score tracking
var jumpSound, collisionSound, bgMusic; // Add sound variables
var initialHighScore = localStorage.getItem('endlessHighscore') || 0; // Load high score from localStorage
highScore = parseInt(initialHighScore);
var speedIncrementFactor = 0.2;
var speedIncrementInterval = 30;

init();

function init() {
	// set up the scene
	createScene();

	//call game loop
	update();
}

function createScene(){
	hasCollided=false;
	score=0;
	treesInPath=[];
	treesPool=[];
	clock=new THREE.Clock();
	clock.start();
	speedMultiplier = 1;
	rollingSpeed = baseSpeed;
	heroRollingSpeed=(rollingSpeed*worldRadius/heroRadius)/5;
	sphericalHelper = new THREE.Spherical();
	pathAngleValues=[1.52,1.57,1.62];
    sceneWidth=window.innerWidth;
    sceneHeight=window.innerHeight;
    scene = new THREE.Scene();//the 3d scene
    scene.fog = new THREE.FogExp2( 0xf0fff0, 0.14 );
    camera = new THREE.PerspectiveCamera( 60, sceneWidth / sceneHeight, 0.1, 1000 );//perspective camera
    renderer = new THREE.WebGLRenderer({alpha:true});//renderer with transparent backdrop
    renderer.setClearColor(0xfffafa, 1); 
    renderer.shadowMap.enabled = true;//enable shadow
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize( sceneWidth, sceneHeight );
    dom = document.getElementById('TutContainer');
	dom.appendChild(renderer.domElement);
	//stats = new Stats();
	//dom.appendChild(stats.dom);
	createTreesPool();
	addWorld();
	addHero();
	addLight();
	addExplosion();
	
	camera.position.z = 6.5;
	camera.position.y = 2.5;
	/*orbitControl = new THREE.OrbitControls( camera, renderer.domElement );//helper to rotate around in scene
	orbitControl.addEventListener( 'change', render );
	orbitControl.noKeys = true;
	orbitControl.noPan = true;
	orbitControl.enableZoom = false;
	orbitControl.minPolarAngle = 1.1;
	orbitControl.maxPolarAngle = 1.1;
	orbitControl.minAzimuthAngle = -0.2;
	orbitControl.maxAzimuthAngle = 0.2;
	*/
	window.addEventListener('resize', onWindowResize, false);//resize callback

	document.onkeydown = handleKeyDown;
	
	scoreText = document.createElement('div');
	scoreText.style.position = 'absolute';
	//text2.style.zIndex = 1;    // if you still don't see the label, try uncommenting this
	scoreText.style.width = 100;
	scoreText.style.height = 100;
	//scoreText.style.backgroundColor = "blue";
	scoreText.innerHTML = "0";
	scoreText.style.top = 50 + 'px';
	scoreText.style.left = 10 + 'px';
	document.body.appendChild(scoreText);
  
  var infoText = document.createElement('div');
	infoText.style.position = 'absolute';
	infoText.style.width = 100;
	infoText.style.height = 100;
	infoText.style.backgroundColor = "yellow";
	infoText.innerHTML = "UP - Jump, Left/Right - Move";
	infoText.style.top = 10 + 'px';
	infoText.style.left = 10 + 'px';
	document.body.appendChild(infoText);

	// Initialize audio
	const listener = new THREE.AudioListener();
	camera.add(listener);
	
	// Background music
	bgMusic = new THREE.Audio(listener);
	const audioLoader = new THREE.AudioLoader();
	audioLoader.load('https://raw.githubusercontent.com/amazingPripravi/game-music/main/background.mp3', function(buffer) {
		bgMusic.setBuffer(buffer);
		bgMusic.setLoop(true);
		bgMusic.setVolume(0.5);
	});
	
	// Jump sound
	jumpSound = new THREE.Audio(listener);
	audioLoader.load('https://raw.githubusercontent.com/amazingPripravi/game-sounds/main/jump.mp3', function(buffer) {
		jumpSound.setBuffer(buffer);
		jumpSound.setVolume(0.5);
	});
	
	// Collision sound
	collisionSound = new THREE.Audio(listener);
	audioLoader.load('https://raw.githubusercontent.com/amazingPripravi/game-sounds/main/explosion.mp3', function(buffer) {
		collisionSound.setBuffer(buffer);
		collisionSound.setVolume(0.6);
	});

	// Update high score display from localStorage
	document.getElementById('highScore').textContent = highScore.toString();
}
function addExplosion(){
    particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = 0;
        positions[i * 3 + 1] = 0;
        positions[i * 3 + 2] = 0;
    }
    
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    var pMaterial = new THREE.PointsMaterial({
        color: 0xfffafa,
        size: 0.2
    });
    
    particles = new THREE.Points(particleGeometry, pMaterial);
    scene.add(particles);
    particles.visible = false;
}
function createTreesPool(){
	var maxTreesInPool=10;
	var newTree;
	for(var i=0; i<maxTreesInPool;i++){
		newTree=createTree();
		treesPool.push(newTree);
	}
}
function handleKeyDown(keyEvent){
	if(jumping)return;
	var validMove=true;
	if ( keyEvent.keyCode === 37) {//left
		if(currentLane==middleLane){
			currentLane=leftLane;
		}else if(currentLane==rightLane){
			currentLane=middleLane;
		}else{
			validMove=false;	
		}
	} else if ( keyEvent.keyCode === 39) {//right
		if(currentLane==middleLane){
			currentLane=rightLane;
		}else if(currentLane==leftLane){
			currentLane=middleLane;
		}else{
			validMove=false;	
		}
	}else{
		if ( keyEvent.keyCode === 38){//up, jump
			bounceValue=0.1;
			jumping=true;
			if (jumpSound.isPlaying) jumpSound.stop();
			jumpSound.play();
		}
		validMove=false;
	}
	//heroSphere.position.x=currentLane;
	if(validMove){
		jumping=true;
		bounceValue=0.06;
	}
}
function addHero(){
	var sphereGeometry = new THREE.DodecahedronGeometry( heroRadius, 1);
	var sphereMaterial = new THREE.MeshStandardMaterial( { color: 0xe5f2f2, flatShading: true } )
	jumping=false;
	heroSphere = new THREE.Mesh( sphereGeometry, sphereMaterial );
	heroSphere.receiveShadow = true;
	heroSphere.castShadow=true;
	scene.add( heroSphere );
	heroSphere.position.y=heroBaseY;
	heroSphere.position.z=4.8;
	currentLane=middleLane;
	heroSphere.position.x=currentLane;
}
function addWorld(){
    var sides = 40;
    var tiers = 40;
    var sphereGeometry = new THREE.SphereGeometry(worldRadius, sides, tiers);
    var sphereMaterial = new THREE.MeshStandardMaterial({ color: 0xfffafa, flatShading: true });
    
    // Convert geometry to BufferGeometry and get position attribute
    if (!(sphereGeometry instanceof THREE.BufferGeometry)) {
        sphereGeometry = new THREE.BufferGeometry().fromGeometry(sphereGeometry);
    }
    
    rollingGroundSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    rollingGroundSphere.receiveShadow = true;
    rollingGroundSphere.castShadow = false;
    rollingGroundSphere.rotation.z = -Math.PI/2;
    scene.add(rollingGroundSphere);
    rollingGroundSphere.position.y = -24;
    rollingGroundSphere.position.z = 2;
    addWorldTrees();
}
function addLight(){
	var hemisphereLight = new THREE.HemisphereLight(0xfffafa,0x000000, .9)
	scene.add(hemisphereLight);
	sun = new THREE.DirectionalLight( 0xcdc1c5, 0.9);
	sun.position.set( 12,6,-7 );
	sun.castShadow = true;
	scene.add(sun);
	//Set up shadow properties for the sun light
	sun.shadow.mapSize.width = 256;
	sun.shadow.mapSize.height = 256;
	sun.shadow.camera.near = 0.5;
	sun.shadow.camera.far = 50 ;
}
function addPathTree() {
    var options = [0, 1, 2];
    var lane = Math.floor(Math.random() * 3);
    addTree(true, lane);
    options.splice(lane, 1);
    
    var chanceForSecondTree = 0.5 - (speedMultiplier * 0.03);
    chanceForSecondTree = Math.max(0.2, chanceForSecondTree);
    
    if (Math.random() > chanceForSecondTree) {
        lane = Math.floor(Math.random() * 2);
        addTree(true, options[lane]);
    }
}
function addWorldTrees(){
	var numTrees=36;
	var gap=6.28/36;
	for(var i=0;i<numTrees;i++){
		addTree(false,i*gap, true);
		addTree(false,i*gap, false);
	}
}
function addTree(inPath, row, isLeft){
	var newTree;
	if(inPath){
		if(treesPool.length==0)return;
		newTree=treesPool.pop();
		newTree.visible=true;
		//console.log("add tree");
		treesInPath.push(newTree);
		sphericalHelper.set( worldRadius-0.3, pathAngleValues[row], -rollingGroundSphere.rotation.x+4 );
	}else{
		newTree=createTree();
		var forestAreaAngle=0;//[1.52,1.57,1.62];
		if(isLeft){
			forestAreaAngle=1.68+Math.random()*0.1;
		}else{
			forestAreaAngle=1.46-Math.random()*0.1;
		}
		sphericalHelper.set( worldRadius-0.3, forestAreaAngle, row );
	}
	newTree.position.setFromSpherical( sphericalHelper );
	var rollingGroundVector=rollingGroundSphere.position.clone().normalize();
	var treeVector=newTree.position.clone().normalize();
	newTree.quaternion.setFromUnitVectors(treeVector,rollingGroundVector);
	newTree.rotation.x+=(Math.random()*(2*Math.PI/10))+-Math.PI/10;
	
	rollingGroundSphere.add(newTree);
}
function createTree(){
    var sides = 8;
    var tiers = 6;
    var scalarMultiplier = (Math.random() * (0.25-0.1)) + 0.05;
    var treeGeometry = new THREE.ConeGeometry(0.5, 1, sides, tiers);
    var treeMaterial = new THREE.MeshStandardMaterial({ color: 0x33ff33, flatShading: true });
    
    // Convert geometry to BufferGeometry if it isn't already
    if (!(treeGeometry instanceof THREE.BufferGeometry)) {
        treeGeometry = new THREE.BufferGeometry().fromGeometry(treeGeometry);
    }
    
    var treeTop = new THREE.Mesh(treeGeometry, treeMaterial);
    treeTop.castShadow = true;
    treeTop.receiveShadow = false;
    treeTop.position.y = 0.9;
    treeTop.rotation.y = (Math.random() * Math.PI);
    
    var treeTrunkGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.5);
    var trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x886633, flatShading: true });
    var treeTrunk = new THREE.Mesh(treeTrunkGeometry, trunkMaterial);
    treeTrunk.position.y = 0.25;
    
    var tree = new THREE.Object3D();
    tree.add(treeTrunk);
    tree.add(treeTop);
    
    return tree;
}
function blowUpTree(vertices,sides,currentTier,scalarMultiplier,odd){
	var vertexIndex;
	var vertexVector= new THREE.Vector3();
	var midPointVector=vertices[0].clone();
	var offset;
	for(var i=0;i<sides;i++){
		vertexIndex=(currentTier*sides)+1;
		vertexVector=vertices[i+vertexIndex].clone();
		midPointVector.y=vertexVector.y;
		offset=vertexVector.sub(midPointVector);
		if(odd){
			if(i%2===0){
				offset.normalize().multiplyScalar(scalarMultiplier/6);
				vertices[i+vertexIndex].add(offset);
			}else{
				offset.normalize().multiplyScalar(scalarMultiplier);
				vertices[i+vertexIndex].add(offset);
				vertices[i+vertexIndex].y=vertices[i+vertexIndex+sides].y+0.05;
			}
		}else{
			if(i%2!==0){
				offset.normalize().multiplyScalar(scalarMultiplier/6);
				vertices[i+vertexIndex].add(offset);
			}else{
				offset.normalize().multiplyScalar(scalarMultiplier);
				vertices[i+vertexIndex].add(offset);
				vertices[i+vertexIndex].y=vertices[i+vertexIndex+sides].y+0.05;
			}
		}
	}
}
function tightenTree(vertices,sides,currentTier){
	var vertexIndex;
	var vertexVector= new THREE.Vector3();
	var midPointVector=vertices[0].clone();
	var offset;
	for(var i=0;i<sides;i++){
		vertexIndex=(currentTier*sides)+1;
		vertexVector=vertices[i+vertexIndex].clone();
		midPointVector.y=vertexVector.y;
		offset=vertexVector.sub(midPointVector);
		offset.normalize().multiplyScalar(0.06);
		vertices[i+vertexIndex].sub(offset);
	}
}

function update() {
    if (hasCollided) {
        doExplosionLogic();
        render();
        requestAnimationFrame(update);
        return;
    }
    
    const deltaTime = clock.getDelta();
    const timeScale = deltaTime * 60;
    
    rollingGroundSphere.rotation.x += rollingSpeed * timeScale;
    heroSphere.rotation.x -= heroRollingSpeed * timeScale;
    
    if (heroSphere.position.y <= heroBaseY) {
        jumping = false;
        bounceValue = (Math.random() * 0.04) + 0.005;
    }
    
    heroSphere.position.y += bounceValue * timeScale;
    heroSphere.position.x = THREE.MathUtils.lerp(
        heroSphere.position.x, 
        currentLane, 
        Math.min(9.0 * deltaTime, 1.0)
    );
    
    bounceValue -= gravity * timeScale;
    
    if (clock.getElapsedTime() > treeReleaseInterval) {
        const adjustedInterval = treeReleaseInterval * (1 / speedMultiplier);
        
        clock.start();
        addPathTree();
        
        if (!hasCollided) {
            score += 1;
            scoreText.innerHTML = score.toString();
            
            if (score % 20 === 0) {
                flashScoreText();
            }
            
            if (score % speedIncrementInterval === 0 && score > 0) {
                increaseSpeed();
            }
        }
    }
    
    doTreeLogic();
    doExplosionLogic();
    render();
    requestAnimationFrame(update);
}

function increaseSpeed() {
    const targetMultiplier = speedMultiplier + speedIncrementFactor;
    const duration = 1.0;
    const startTime = performance.now();
    const startMultiplier = speedMultiplier;
    
    function animateSpeedChange() {
        const elapsed = (performance.now() - startTime) / 1000;
        const progress = Math.min(elapsed / duration, 1.0);
        
        const easeProgress = progress < 0.5 
            ? 2 * progress * progress 
            : -1 + (4 - 2 * progress) * progress;
            
        speedMultiplier = startMultiplier + (targetMultiplier - startMultiplier) * easeProgress;
        rollingSpeed = baseSpeed * speedMultiplier;
        heroRollingSpeed = (rollingSpeed * worldRadius / heroRadius) / 5;
        
        if (progress < 1.0) {
            requestAnimationFrame(animateSpeedChange);
        } else {
            speedMultiplier = targetMultiplier;
            rollingSpeed = baseSpeed * speedMultiplier;
            heroRollingSpeed = (rollingSpeed * worldRadius / heroRadius) / 5;
            console.log("Speed increased! New multiplier: " + speedMultiplier);
        }
    }
    
    animateSpeedChange();
}

function flashScoreText() {
    const originalColor = scoreText.style.color;
    const originalSize = scoreText.style.fontSize;
    
    scoreText.style.color = "#ff0000";
    scoreText.style.fontSize = "32px";
    
    setTimeout(() => {
        scoreText.style.color = originalColor;
        scoreText.style.fontSize = originalSize;
    }, 500);
}

function doTreeLogic(){
	var oneTree;
	var treePos = new THREE.Vector3();
	var treesToRemove=[];
	treesInPath.forEach( function ( element, index ) {
		oneTree=treesInPath[ index ];
		treePos.setFromMatrixPosition( oneTree.matrixWorld );
		if(treePos.z>6 &&oneTree.visible){//gone out of our view zone
			treesToRemove.push(oneTree);
		}else{//check collision
			if(treePos.distanceTo(heroSphere.position)<=0.6){
				console.log("hit");
				hasCollided=true;
				explode();
			}
		}
	});
	var fromWhere;
	treesToRemove.forEach( function ( element, index ) {
		oneTree=treesToRemove[ index ];
		fromWhere=treesInPath.indexOf(oneTree);
		treesInPath.splice(fromWhere,1);
		treesPool.push(oneTree);
		oneTree.visible=false;
		console.log("remove tree");
	});
}
function doExplosionLogic(){
    if(!particles.visible) return;
    
    const positions = particleGeometry.attributes.position.array;
    
    for (let i = 0; i < particleCount; i++) {
        positions[i * 3] *= explosionPower;
        positions[i * 3 + 1] *= explosionPower;
        positions[i * 3 + 2] *= explosionPower;
    }
    
    if(explosionPower > 1.005){
        explosionPower -= 0.001;
    } else {
        particles.visible = false;
    }
    
    particleGeometry.attributes.position.needsUpdate = true;
}
function explode(){
    particles.position.y = 2;
    particles.position.z = 4.8;
    particles.position.x = heroSphere.position.x;
    
    const positions = particleGeometry.attributes.position.array;
    
    for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = -0.2 + Math.random() * 0.4;
        positions[i * 3 + 1] = -0.2 + Math.random() * 0.4;
        positions[i * 3 + 2] = -0.2 + Math.random() * 0.4;
    }
    
    particleGeometry.attributes.position.needsUpdate = true;
    explosionPower = 1.07;
    particles.visible = true;
    collisionSound.play();
    gameOver();
}

function gameOver() {
    hasCollided = true;
    rollingSpeed = 0;
    heroRollingSpeed = 0;
    bgMusic.stop();
    
    if (collisionSound.isPlaying) collisionSound.stop();
    collisionSound.play();
    
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('endlessHighscore', highScore.toString());
        document.getElementById('highScore').textContent = highScore.toString();
        document.getElementById('finalHighScore').textContent = highScore.toString();
    } else {
        document.getElementById('finalHighScore').textContent = highScore.toString();
    }
    
    const gameOverScreen = document.getElementById('gameOverScreen');
    const finalScore = document.getElementById('finalScore');
    if (finalScore) finalScore.textContent = score.toString();
    if (gameOverScreen) {
        gameOverScreen.style.display = 'flex';
    }
    
    window.addEventListener('keydown', restartHandler);
}

function restartHandler(e) {
    if (e.code === 'Space' || e.keyCode === 32) {
        window.removeEventListener('keydown', restartHandler);
        const gameOverScreen = document.getElementById('gameOverScreen');
        if (gameOverScreen) {
            gameOverScreen.style.display = 'none';
        }
        score = 0;
        scoreText.innerHTML = "0";
        speedMultiplier = 1;
        resetGame();
    }
}

function resetGame() {
    hasCollided = false;
    scoreText.innerHTML = score.toString();
    
    // Calculate appropriate speed multiplier based on current score
    speedMultiplier = 1 + Math.floor(score / 30) * 0.2;
    rollingSpeed = baseSpeed * speedMultiplier;
    heroRollingSpeed = (rollingSpeed*worldRadius/heroRadius)/5;
    
    heroSphere.position.y = heroBaseY;
    heroSphere.position.x = middleLane;
    currentLane = middleLane;
    
    treesInPath.forEach(tree => {
        treesPool.push(tree);
        tree.visible = false;
    });
    treesInPath = [];
    
    clock.start();
    particles.visible = false;
    
    if (bgMusic.isPlaying) bgMusic.stop();
    bgMusic.play();
}

function render(){
    renderer.render(scene, camera);//draw
}
function onWindowResize() {
	//resize & align
	sceneHeight = window.innerHeight;
	sceneWidth = window.innerWidth;
	renderer.setSize(sceneWidth, sceneHeight);
	camera.aspect = sceneWidth/sceneHeight;
	camera.updateProjectionMatrix();
}