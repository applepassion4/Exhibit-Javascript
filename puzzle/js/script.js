var camera, scene, renderer;
function ObjectGameControls( eye , params ){

  this.intersected;
  this.selected;

  this.eye                = eye;

  this.mouse            = new THREE.Vector3();
  this.unprojectedMouse = new THREE.Vector3();
  
  this.objects          = [];

  var params = params || {};
  var p = params;

  this.domElement         = p.domElement         || document;

  this.recursive          = p.recursive          || false;
  
  this.raycaster          = new THREE.Raycaster();

  this.raycaster.near     = this.eye.near;
  this.raycaster.far      = this.eye.far;


  var addListener = this.domElement.addEventListener; 

}


ObjectGameControls.prototype._down = function(){

  this.down();

  if( this.intersected ){
   
    this._select( this.intersected  );

  }

}

ObjectGameControls.prototype.down = function(){}



ObjectGameControls.prototype._up = function(){

  this.up();

  if( this.selected ){

    this._deselect( this.selected );

  }

}

ObjectGameControls.prototype.up = function(){}



ObjectGameControls.prototype._hoverOut =  function( object ){

  this.hoverOut();
  
  this.objectHovered = false;
  
  if( object.hoverOut ){
    object.hoverOut( this );
  }

};

ObjectGameControls.prototype.hoverOut = function(){};



ObjectGameControls.prototype._hoverOver = function( object ){
 
  this.hoverOver();
  
  this.objectHovered = true;
  
  if( object.hoverOver ){
    object.hoverOver( this );
  }

};

ObjectGameControls.prototype.hoverOver = function(){}



ObjectGameControls.prototype._select = function( object ){
 
  this.select();
              
  var intersectionPoint = this.getIntersectionPoint( this.intersected );

  this.selected       = object;
  this.intersectionPoint = intersectionPoint;
 
  if( object.select ){
    object.select( this );
  }

};

ObjectGameControls.prototype.select = function(){}



ObjectGameControls.prototype._deselect = function( object ){


  this.selected = undefined;
  this.intersectionPoint = undefined;

  if( object.deselect ){
    object.deselect( this );
  }

  this.deselect();

};

ObjectGameControls.prototype.deselect = function(){}



ObjectGameControls.prototype.add = function( object ){

  this.objects.push( object );

};

ObjectGameControls.prototype.remove = function( object ){

  for( var i = 0; i < this.objects.length; i++ ){

    if( this.objects[i] == object ){
  
      this.objects.splice( i , 1 );

    }

  }

};






const GAME_FRAME = false;
const screenMaxWidth = window.innerWidth*2/3, screenMaxHeight = window.innerHeight*2/3;
const movementSettings = {
  height: 4,
  speed: 0.5,
  turnRotation: Math.PI * 0.2
}

var floor;
const discArray = []; 

const keyboard = {}; 

var objectControls; 
const raycaster = new THREE.Raycaster(), mouse = new THREE.Vector2(); 
var intersectionPlane;

let currentDisc = {
  radius: 0,
  originalX: -15, 
  releasedX: -15, 
  isMoved() {
    return Math.abs( currentDisc.originalX - currentDisc.releasedX )  >= 5 ?  true : false;
  },
  newPlatform() {
    if ( currentDisc.releasedX <= -5 ) {
      return rightTower;
    } else if ( currentDisc.releasedX > -5 && currentDisc.releasedX <= 5 ) {
      return centerTower;
    } else if ( currentDisc.releasedX > 5 ) {
      return leftTower;
    }
  },
  oldPlatform() {
    if ( currentDisc.originalX <= -5 ) {
      return rightTower;
    } else if ( currentDisc.originalX > -5 && currentDisc.originalX <= 5 ) {
      return centerTower;
    } else if ( currentDisc.originalX > 5 ) {
      return leftTower;
    }
  }
};

let leftTower = ["left"];
let centerTower = ["center"];
let rightTower = ["right"];



function init() {
  scene = new THREE.Scene();
   scene.background = new THREE.Color( 0xA52A2A);

  camera = new THREE.PerspectiveCamera(90, screenMaxWidth / screenMaxHeight, 0.1, 1000);

  camera.position.set(0, movementSettings.height, -20);
  camera.lookAt(new THREE.Vector3(0,0,0)); 

  rendererBuilder();
  objectControls = new ObjectGameControls( camera );
  createIntersectionPlane(); 


  addFloor(); 
  addPlatformAt("left"); 
  addPlatformAt("right"); 
  addPlatformAt("center");

  loadTowerArrays();

  letThereBeLight(); 
  addSpotlight(); 
  addDisc(4, "navy", 1); 
  addDisc(3, "green", 2); 
  addDisc(2, "black", 3); 
  addDisc(1, "yellow", 4); 

  animate(); 
}

function rendererBuilder() {
  renderer = new THREE.WebGLRenderer({ alpha: true });
  renderer.setSize(screenMaxWidth, screenMaxHeight); 

  renderer.shadowMap.enabled = true; 
  renderer.shadowMap.type = THREE.PCFSoftShadowMap; 

  renderer.gammaInput = true;
  renderer.gammaOutput = true;

  document.body.appendChild(renderer.domElement); 
}

function animate(){
  requestAnimationFrame(animate); 
  handleMovement(); 
 
  render();
}

function render() {
  renderer.render(scene, camera);
}



function addDisc(number, color, stackPosition) { 
  let discGeometry = new THREE.CylinderGeometry(number, number, 0.8, 50, false);
  let discMaterial = new THREE.MeshPhongMaterial({color: color, wireframe: false});
  let disc = new THREE.Mesh( discGeometry, discMaterial );
  let y = stackPosition === 1 ? 0.4 + (stackPosition * disc.geometry.parameters.height / 2) :
                                (stackPosition * (disc.geometry.parameters.height)); 
  let x = 15;
  let z = 0;

  let hoverMaterial = new THREE.MeshBasicMaterial({ color: 0x55ff88 }); 
  disc.hoverOver = function() { 
    this.material = hoverMaterial;
  }.bind( disc );

  disc.hoverOut = function() { 
    this.material = discMaterial;
  }.bind( disc ); 

  disc.select = function() { 
    currentDisc.originalX = this.position.x; 
    currentDisc.radius = this.geometry.parameters.radiusTop;

    intersectionPlane.position.copy( this.position );

    leftTower = ["left"];
    // centerTower = ["center"];
    rightTower = ["right"];
    loadTowerArrays(); 

  }.bind( disc ); 

  disc.deselect = function snapIntoPlace() { 
    currentDisc.releasedX = this.position.x; 

    if(currentDisc.isMoved()){ 
      let newTower = currentDisc.newPlatform(); 
      let oldTower = currentDisc.oldPlatform(); 
      if ( newTower.length > 1) { 
        let topDiscRadius = newTower[newTower.length - 1].geometry.parameters.radiusTop; 
        if ( currentDisc.radius > topDiscRadius ) { 
          this.position.x = currentDisc.originalX;
          console.log("Not legal");
        } else if ( currentDisc.radius < topDiscRadius ){ 
          this.position.x = newTower[1].position.x; 
          oldTower.splice(oldTower.indexOf(this), 1); 
          newTower.push(this); 
        }
      } else if ( newTower.length === 1 ){ 
        oldTower.splice(oldTower.indexOf(this), 1); 
        newTower.push(this);
      }
    }

    let towerArray = [leftTower, centerTower, rightTower];
    towerArray.forEach(function snapDicsIntoPlace(tower) {
      for(let i = 1; i < tower.length; i++) {
        tower[i].position.x = tower === leftTower ? 15 :
                              tower === centerTower ? 0 :
                              tower === rightTower ? -15 :
                              0;
        tower[i].position.y = i * tower[i].geometry.parameters.height;
      }
    });
  }.bind( disc ); 
  disc.update = function() {
    let raycaster = objectControls.raycaster;
    let i = raycaster.intersectObject( intersectionPlane );

  
    if (leftTower.indexOf(this) !== -1) { 
      let moveable = leftTower.indexOf(this) === leftTower.length - 1 ? true : false; 
      if (moveable) {
        this.position.copy( i[0].point );
      }
    } else if (centerTower.indexOf(this) !== -1) { 
      let moveable = centerTower.indexOf(this) === centerTower.length - 1 ? true : false; 
      if (moveable) {
        this.position.copy( i[0].point ); 
      }
    } else if (rightTower.indexOf(this) !== -1) { 
      let moveable = rightTower.indexOf(this) === rightTower.length - 1 ? true : false; 
      if (moveable) {
        this.position.copy( i[0].point ); 
      }
    }
  }.bind( disc ); 

  disc.position.set(x, y, z); 
  disc.receiveShadow = true; 
  disc.castShadow = true; 
  scene.add(disc); 
  discArray.push(disc); 
  objectControls.add(disc); 
}

function loadTowerArrays() {
  for(var i = 0; i < discArray.length; i++) {
    let xPosition = discArray[i].position.x;
    if(xPosition >= 5) {
      leftTower.push(discArray[i]);
    } else if (xPosition < 5 && xPosition > -5) {
      centerTower.push(discArray[i]);
    } else if (xPosition < -5) {
      rightTower.push(discArray[i]);
    }
  }
}

function addPlatformAt(position) { 
  let platformGeometry = new THREE.CylinderGeometry(4, 6, 0.4, 50, false);
  let platformMaterial = new THREE.MeshPhongMaterial({color: 0xA52A2A, wireframe: GAME_FRAME});
  let platform = new THREE.Mesh( platformGeometry, platformMaterial );
  let y = platform.geometry.parameters.height / 2; 
  let x = position === "left" ? -15:
          position === "right" ? 15:
          position === "center" ? 0 :
          0;
  let z = 0; 
  platform.position.set(x, y, z); 
  platform.receiveShadow = true; 
  platform.castShadow = true; 
  scene.add(platform); 
}
function addFloor() {
  let planeGeometry = new THREE.PlaneGeometry(1000, 1000, 20, 20);
  let planeMaterial = new THREE.MeshPhongMaterial({color: 0xf01f3f, wireframe: GAME_FRAME});
  floor = new THREE.Mesh(planeGeometry, planeMaterial);
  floor.rotation.x -= Math.PI / 2; 
  floor.receiveShadow = true; 
  floor.scale.set(1000,1000,1000); 
  scene.add(floor); 
}

function createIntersectionPlane() {
  let geo = new THREE.PlaneGeometry( 100000 , 100000, 8, 8);
  let mat = new THREE.MeshNormalMaterial({visible: false, side: THREE.DoubleSide});
  intersectionPlane = new THREE.Mesh( geo , mat );
  intersectionPlane.position.set(0,0,0);
  scene.add( intersectionPlane );
}



function letThereBeLight() {
  let pointLight = new THREE.PointLight(0xD2691E, 1.5, 100, 1.5); 
  pointLight.position.set(-3, 6, -6); 
  pointLight.castShadow = true; 
  pointLight.shadow.camera.near = 0.1; 
  pointLight.shadow.camera.far = 10;
  scene.add(pointLight);

  
}

function addSpotlight() {
  let spotGoalLight = new THREE.SpotLight( 0xffffff, 2 );
  spotGoalLight.position.set(-15, 50, 0);
  spotGoalLight.castShadow = true;
  spotGoalLight.angle = 0.15;
  spotGoalLight.penumbra = 1;
  spotGoalLight.decay = 2;
  spotGoalLight.distance = 200;
  spotGoalLight.shadow.mapSize.width = 1024;
  spotGoalLight.shadow.mapSize.height = 1024;
  spotGoalLight.shadow.camera.near = 1;
  spotGoalLight.shadow.camera.far = 200;
  spotGoalLight.target.position.set( -15 , 0, 0 );

  scene.add( spotGoalLight );
  scene.add( spotGoalLight.target );
}


function handleMovement() {
  //up 
  if(keyboard[38]){ 
    camera.position.x -= Math.sin(camera.rotation.y) * movementSettings.speed;
    camera.position.z -= -Math.cos(camera.rotation.y) * movementSettings.speed;
  }

  if(keyboard[40]){ 
    camera.position.x += Math.sin(camera.rotation.y) * movementSettings.speed;
    camera.position.z += -Math.cos(camera.rotation.y) * movementSettings.speed;
  }
  //left 
  if(keyboard[37]){
    camera.rotation.y -= movementSettings.speed / 5;
  }
  //right
  if(keyboard[39]){ 
    camera.rotation.y += movementSettings.speed / 5;
  }
  // n
  if(keyboard[77]){ 
    camera.position.x += -Math.sin(camera.rotation.y - Math.PI/2) * movementSettings.speed;
    camera.position.z += Math.cos(camera.rotation.y - Math.PI/2) * movementSettings.speed;
  }
  // m 
  if(keyboard[78]){ 
    camera.position.x += Math.sin(camera.rotation.y - Math.PI/2) * movementSettings.speed;
    camera.position.z += -Math.cos(camera.rotation.y - Math.PI/2) * movementSettings.speed;
  }
  // plus
  if(keyboard[187]){ 
    camera.position.y += movementSettings.speed;
    camera.position.z -= movementSettings.speed;
  }
  // minus
  if(keyboard[189]){ 
    if(camera.position.y > 1){
      camera.position.y -= movementSettings.speed;
      camera.position.z += movementSettings.speed;
    }
  }
}
function keyDown(event){
  keyboard[event.keyCode] = true;
}
function keyUp(event){
  keyboard[event.keyCode] = false;
}



window.addEventListener('keydown', keyDown);
window.addEventListener('keyup', keyUp);

window.onload = init;
