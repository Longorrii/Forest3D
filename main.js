import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.118/build/three.module.js';
import { math } from "./math.js";
import { FBXLoader } from 'https://cdn.jsdelivr.net/npm/three@0.118.1/examples/jsm/loaders/FBXLoader.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.118.1/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.118/examples/jsm/controls/OrbitControls.js';

const _VS = `
varying vec3 vWorldPosition;

void main() {
  vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
  vWorldPosition = worldPosition.xyz;

  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`;

const _FS = `
uniform vec3 topColor;
uniform vec3 bottomColor;
uniform float offset;
uniform float exponent;

varying vec3 vWorldPosition;

void main() {
  float h = normalize( vWorldPosition + offset ).y;
  gl_FragColor = vec4( mix( bottomColor, topColor, max( pow( max( h , 0.0), exponent ), 0.0 ) ), 1.0 );
}`;

class LoadModelDemo {
  constructor() {
    this._Initialize();
  }

  _Initialize() {
    this._threejs = new THREE.WebGLRenderer({
      antialias: true,
    });
    //Thiết lập đổ bóng cho các model
    this._threejs.shadowMap.enabled = true;
    //Tạo ra các bóng mờ
    this._threejs.shadowMap.type = THREE.PCFSoftShadowMap;
    //Thiết lập để điều chỉnh độ phân giải của màn hình theo tỷ lệ của thiết bị người dùng
    this._threejs.setPixelRatio(window.devicePixelRatio);
    //Thiết lập kích thước màn hình
    this._threejs.setSize(window.innerWidth, window.innerHeight);

    document.body.appendChild(this._threejs.domElement);

    window.addEventListener('resize', () => {
      this._OnWindowResize();
    }, false);
    //Góc nhìn
    const fov = 60;
    //Tỉ lệ khung hình
    const aspect = 1920 / 1080;
    //Khoảng cách gần nhất
    const near = 1.0;
    //Khoảng cách xa nhất
    const far = 1000.0;
    this._camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    this._camera.position.set(75, 20, 0);
    this._scene = new THREE.Scene();

    this._scene.background = new THREE.Color(0xffffff);
    this._scene.fog = new THREE.FogExp2(0x89b2eb, 0.002);

    //Tạo 1 đối tượng ánh sáng có màu trắng và độ sáng = 1 
    let light = new THREE.DirectionalLight(0xFFFFFF, 1.0);
    //Đặt vị trí
    light.position.set(-10, 500, 10);
    //Ánh sáng hướng mục tiêu
    light.target.position.set(0, 0, 0);
    //Cho phép đối tượng ánh sáng tạo bóng
    light.castShadow = true;
    //
    light.shadow.bias = -0.001;
    //Kích thước của bản đồ đổ bóng
    light.shadow.mapSize.width = 4096;
    light.shadow.mapSize.height = 4096;
    // Xác định kích thước của camera ánh sáng như:gần,xa,trái,phải,trên,dưới
    light.shadow.camera.near = 0.1;
    light.shadow.camera.far = 1000.0;
    light.shadow.camera.left = 100;
    light.shadow.camera.right = -100;
    light.shadow.camera.top = 100;
    light.shadow.camera.bottom = -100;
    // Add đối tương ánh sáng vào
    this._scene.add(light);
    //Tạo đối tượng ánh sáng xung quan màu trắng, độ sáng = 2
    light = new THREE.AmbientLight(0xFFFFFF, 1.0);
    this._scene.add(light);

    //Tạo đối tương OrbitControls cho phép người dùng điều khiển camera
    const controls = new OrbitControls(this._camera, this._threejs.domElement);
    //Đặt ví trí hướng camera
    controls.target.set(0, 20, 0);
    controls.update();

    //Tạo mặt đất
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(5000, 5000, 10, 10),
      new THREE.MeshStandardMaterial({
        color: 0x1e601c,
      })
    );
    plane.castShadow = false;
    plane.receiveShadow = true;
    plane.rotation.x = -Math.PI / 2;
    this._scene.add(plane);

    //Biến lưu trữ các hoạt động nhảy, ...
    this._mixers = [];
    //Biến lưu trữ giá trị requestAnimationFrame trước đó
    this._previousRAF = null;

    this._SetupMouseControls()
    this._LoadAnimal()
    this._LoadClouds()
    this._LoadFoliage()
    this._LoadSky()
    this._LoadSound()

    this._LoadAnimatedModelAndPlay(
      './resources/nobita/', 'nobita.fbx', 'Hip Hop Dancing.fbx', new THREE.Vector3(0, -1.5, 5), 0.1);
    this._LoadAnimatedModelAndPlay(
      './resources/doraemon/', 'doraemon.fbx', 'Flair.fbx', new THREE.Vector3(30, 2.5, -15), 7);
    this._LoadAnimatedModelAndPlay(
      './resources/doraemon/', 'doraemon.fbx', 'Hip Hop Dancing.fbx', new THREE.Vector3(-30, 0, -15), 7);


    this._LoadAnimatedModelAndPlay(
      './resources/small-concrete-pipe/source/', 'smallconcretepipe.fbx', '', new THREE.Vector3(50, 7.5, -70), 0.3);
    this._LoadAnimatedModelAndPlay(
      './resources/small-concrete-pipe/source/', 'smallconcretepipe.fbx', '', new THREE.Vector3(65, 7.5, -70), 0.3);
    this._LoadAnimatedModelAndPlay(
      './resources/small-concrete-pipe/source/', 'smallconcretepipe.fbx', '', new THREE.Vector3(57, 19, -70), 0.3);
    this._LoadAnimatedModelAndPlay(
      './resources/swing-set/source/', 'swing.fbx', '', new THREE.Vector3(-70, 0, -75), 0.04);
    this._LoadAnimatedModelAndPlay(
      './resources/slide/source/', 'SlideFinal.fbx', '', new THREE.Vector3(0, -5, -70), 7);

    this._RAF();
  }

  _SetupMouseControls() {
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    document.addEventListener('mousedown', (event) => {
      isDragging = true;
      previousMousePosition.x = event.clientX;
      previousMousePosition.y = event.clientY;
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
    });

    document.addEventListener('mousemove', (event) => {
      if (!isDragging) return;

      const deltaMove = {
        x: event.clientX - previousMousePosition.x,
        y: event.clientY - previousMousePosition.y
      };

      // Điều chỉnh góc nhìn của camera dựa trên deltaMove
      // Ví dụ:
      this._camera.rotation.y += deltaMove.x * 0.01;
      this._camera.rotation.x += deltaMove.y * 0.01;

      previousMousePosition.x = event.clientX;
      previousMousePosition.y = event.clientY;
    });

    document.addEventListener('wheel', (event) => {
      const deltaZoom = event.deltaY;

      // Điều chỉnh khoảng cách giữa camera và đối tượng mục tiêu dựa trên deltaZoom
      // Ví dụ:
      const zoomSpeed = 0.1;
      this._camera.position.z -= deltaZoom * zoomSpeed;
    });
  }

  _LoadAnimal() {
    for (let i = 0; i < 10; ++i) {
      const pos = new THREE.Vector3(
        (Math.random() * 2.0 - 1.0) * 500,
        0,
        (Math.random() * 2.0 - 1.0) * 500
      );
      this._LoadAnimatedModelAndPlay(
        './resources/animal/', 'Deer.fbx', '', pos, 0.06);
    }
  }

  _LoadSky() {
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xfffffff, 0.6);
    hemiLight.color.setHSL(0.6, 1, 0.6);
    hemiLight.groundColor.setHSL(0.095, 1, 0.75);
    this._scene.add(hemiLight);

    const uniforms = {
      topColor: { value: new THREE.Color(0x0077ff) },
      bottomColor: { value: new THREE.Color(0xffffff) },
      offset: { value: 33 },
      exponent: { value: 0.6 },
    };
    uniforms["topColor"].value.copy(hemiLight.color);

    this._scene.fog.color.copy(uniforms["bottomColor"].value);

    const skyGeo = new THREE.SphereBufferGeometry(1000, 32, 15);
    const skyMat = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: _VS,
      fragmentShader: _FS,
      side: THREE.BackSide,
    });

    const sky = new THREE.Mesh(skyGeo, skyMat);
    this._scene.add(sky);
  }

  _LoadClouds() {
    for (let i = 0; i < 40; ++i) {
      const index = math.rand_int(1, 3);
      const pos = new THREE.Vector3(
        (Math.random() * 2.0 - 1.0) * 500,
        150,
        (Math.random() * 2.0 - 1.0) * 500
      );
      const loader = new GLTFLoader();
      loader.setPath("./resources/nature2/GLTF/");
      loader.load("Cloud" + index + ".glb", (glb) => {
        glb.scene.scale.set(Math.random() * 5 + 10, Math.random() * 5 + 10, Math.random() * 5 + 10);
        glb.scene.traverse(c => {
          if (c.isMesh) {
            c.material.emissive = new THREE.Color(0x808080);
          }
        });
        glb.scene.position.copy(pos);
        this._scene.add(glb.scene);
      });
    }
  }

  _LoadFoliage() {
    for (let i = 0; i < 50; ++i) {
      const names = [
        "BirchTree",
        "BirchTree_Autumn",
        "BirchTree_Dead",
        "BirchTree_Dead_Snow",
        "BirchTree_Snow",

        "Cactus",
        "CactusFlowers",

        "CommonTree",
        "CommonTree_Autumn",
        "CommonTree_Dead",
        "CommonTree_Dead_Snow",
        "CommonTree_Snow",

        "Willow",
        "Willow_Autumn",
        "Willow_Dead",
        "Willow_Dead_Snow",
        "Willow_Snow",

        "PineTree",
        "PineTree_Autumn",
        "PineTree_Snow",

        "Rock",
        "Rock_Moss",
        "Rock_Snow",

        "Plant",
        "PalmTree",
      ];
      const name = names[math.rand_int(0, names.length - 1)];
      const index = math.rand_int(1, 5);

      const pos = new THREE.Vector3(
        (Math.random() * 2.0 - 1.0) * 500,
        0,
        (Math.random() * 2.0 - 1.0) * 500
      );

      const loader = new FBXLoader();

      loader.setPath("./resources/nature/FBX/");
      loader.load(name + "_" + index + ".fbx", (fbx) => {
        fbx.scale.setScalar(0.25);
        fbx.traverse(c => {
          if (c.isMesh) {
            c.castShadow = true;
            c.receiveShadow = true;
            c.material.emissive = new THREE.Color(0x000000);
          }
        });
        fbx.position.copy(pos);
        fbx.specular = new THREE.Color(0x000000);
        this._scene.add(fbx);
      });
    }
  }

  _LoadSound() {
    const listener = new THREE.AudioListener();
    this._scene.add(listener);

    let sound; // Khai báo biến sound ở phạm vi chính

    const playSound = () => {
      sound = new THREE.Audio(listener); // Gán giá trị cho biến sound
      const audioLoader = new THREE.AudioLoader();
      audioLoader.load('./resources/sound/Doraemon.mp3', function (buffer) {
        sound.setBuffer(buffer);
        sound.setLoop(true);
        sound.setVolume(1); // Giá trị volume từ 0 đến 1
        sound.play();
      });
    };

    // Sự kiện window.onload tự động phát nhạc sau khi trang web được tải lại
    document.addEventListener('click', function () {
      // Khởi tạo AudioContext sau sự kiện tương tác
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      if (!sound || sound.isPlaying === false) { // Kiểm tra nếu sound chưa được phát hoặc đang không phát
        playSound();
      }
    });
  }

  _LoadAnimatedModelAndPlay(path, modelFile, animFile, offset, scaleFactor) {
    const loader = new FBXLoader();
    loader.setPath(path);
    loader.load(modelFile, (fbx) => {
      fbx.scale.setScalar(scaleFactor);
      fbx.traverse(c => {
        c.castShadow = true;
      });
      fbx.position.copy(offset);

      const anim = new FBXLoader();
      anim.setPath(path);
      anim.load(animFile, (anim) => {
        const m = new THREE.AnimationMixer(fbx);
        this._mixers.push(m);
        const idle = m.clipAction(anim.animations[0]);
        idle.play();
      });
      this._scene.add(fbx);
    });
  }

  _OnWindowResize() {
    this._camera.aspect = window.innerWidth / window.innerHeight;
    this._camera.updateProjectionMatrix();
    this._threejs.setSize(window.innerWidth, window.innerHeight);
  }

  _RAF() {
    requestAnimationFrame((t) => {
      if (this._previousRAF === null) {
        this._previousRAF = t;
      }

      this._RAF();

      this._threejs.render(this._scene, this._camera);
      this._Step(t - this._previousRAF);
      this._previousRAF = t;
    });
  }

  _Step(timeElapsed) {
    const timeElapsedS = timeElapsed * 0.001;
    if (this._mixers) {
      this._mixers.map(m => m.update(timeElapsedS));
    }

    if (this._controls) {
      this._controls.Update(timeElapsedS);
    }
  }
}

let _APP = null;

// Load model lưu vào biến _APP
window.addEventListener('DOMContentLoaded', () => {
  _APP = new LoadModelDemo();
});
