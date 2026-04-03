/**
 * 3D Pot Visualization System
 * Displays detected pottery defects in an interactive 3D model
 */

class Pot3DVisualization {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error('3D Pot container not found:', containerId);
      return;
    }

    this.width = this.container.clientWidth || 500;
    this.height = 400;
    this.defects = [];
    this.potGeometry = null;
    this.potMesh = null;
    this.defectMarkers = [];

    this.initScene();
    this.createPot();
    this.setupControls();
    this.setupLights();
    this.animate();
    this.setupWindowResize();
  }

  initScene() {
    // Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf5f5f5);

    // Camera setup - adjusted for better pot viewing
    this.camera = new THREE.PerspectiveCamera(
      75,
      this.width / this.height,
      0.1,
      1000
    );
    this.camera.position.set(0, 0.5, 3);

    // Renderer setup
    try {
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch (e) {
      console.error('WebGL not supported:', e);
      this.container.innerHTML = '<p style="padding: 20px; color: #999;">WebGL not supported. Please use a modern browser.</p>';
      return;
    }
    
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.container.innerHTML = ''; // Clear the container
    this.container.appendChild(this.renderer.domElement);

    // Add grid helper
    const gridHelper = new THREE.GridHelper(4, 8, 0xdddddd, 0xeeeeee);
    this.scene.add(gridHelper);
  }

  createPot() {
    // Create a simple cylindrical pot with geometry variations
    // This geometry is adjustable based on sensor data
    const geometry = new THREE.LatheGeometry(
      [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(0.8, 0.1),
        new THREE.Vector2(1.0, 0.5),
        new THREE.Vector2(0.95, 1.2),
        new THREE.Vector2(0.7, 1.4),
        new THREE.Vector2(0.5, 1.5),
      ],
      32
    );

    // Create material with grid texture
    const canvas = this.createGridTexture();
    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      metalness: 0.3,
      roughness: 0.7,
      color: 0xd4a574,
    });

    this.potMesh = new THREE.Mesh(geometry, material);
    this.potMesh.scale.set(1.5, 1.5, 1.5);
    this.potMesh.rotation.x = -Math.PI / 8;
    
    this.scene.add(this.potMesh);
    this.potGeometry = geometry;
  }

  createGridTexture() {
    // Create a canvas texture with grid pattern
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Base color
    ctx.fillStyle = '#d4a574';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid lines
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.lineWidth = 2;

    const cellSize = 32;
    for (let i = 0; i <= canvas.width; i += cellSize) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvas.height);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(canvas.width, i);
      ctx.stroke();
    }

    return canvas;
  }

  setupLights() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    // Directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    directionalLight.castShadow = true;
    this.scene.add(directionalLight);

    // Point light for subtle accent
    const pointLight = new THREE.PointLight(0xffffff, 0.3);
    pointLight.position.set(-3, 2, 3);
    this.scene.add(pointLight);
  }

  setupControls() {
    // Mouse controls for rotation and zoom
    this.controls = {
      isRotating: false,
      previousMousePosition: { x: 0, y: 0 },
      rotation: { x: 0, y: 0 },
    };

    this.container.addEventListener('mousedown', (e) => {
      this.controls.isRotating = true;
      this.controls.previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.controls.isRotating) return;

      const deltaX = e.clientX - this.controls.previousMousePosition.x;
      const deltaY = e.clientY - this.controls.previousMousePosition.y;

      this.controls.rotation.y += deltaX * 0.005;
      this.controls.rotation.x += deltaY * 0.005;

      if (this.potMesh) {
        this.potMesh.rotation.y = this.controls.rotation.y;
        this.potMesh.rotation.x = this.controls.rotation.x - Math.PI / 8;
      }

      this.controls.previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    document.addEventListener('mouseup', () => {
      this.controls.isRotating = false;
    });

    // Zoom with mouse wheel
    this.container.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomSpeed = 0.1;
      const direction = e.deltaY > 0 ? 1 : -1;
      this.camera.position.z += direction * zoomSpeed;
      this.camera.position.z = Math.max(1.5, Math.min(8, this.camera.position.z));
    });
  }

  setupWindowResize() {
    window.addEventListener('resize', () => {
      const newWidth = this.container.clientWidth;
      const newHeight = 400;

      if (newWidth !== this.width) {
        this.width = newWidth;
        this.height = newHeight;
        this.camera.aspect = this.width / this.height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.width, this.height);
      }
    });
  }

  /**
   * Update pot geometry based on sensor data
   * @param {Object} potData - Sensor-detected pot specifications
   * @param {Array} potData.profile - Array of {radius, height} points
   */
  updatePotGeometry(potData) {
    if (!potData.profile || potData.profile.length < 3) return;

    // Remove old mesh
    if (this.potMesh) this.scene.remove(this.potMesh);
    if (this.potGeometry) this.potGeometry.dispose();

    // Create new geometry from sensor data
    const points = potData.profile.map(
      (point) => new THREE.Vector2(point.radius, point.height)
    );

    const geometry = new THREE.LatheGeometry(points, 32);
    const material = new THREE.MeshStandardMaterial({
      map: new THREE.CanvasTexture(this.createGridTexture()),
      metalness: 0.3,
      roughness: 0.7,
      color: 0xd4a574,
    });

    this.potMesh = new THREE.Mesh(geometry, material);
    this.potMesh.scale.set(1.5, 1.5, 1.5);
    this.potMesh.rotation.x = this.controls.rotation.x - Math.PI / 8;
    this.potMesh.rotation.y = this.controls.rotation.y;

    this.scene.add(this.potMesh);
  }

  /**
   * Add defect markers to the 3D visualization
   * @param {Array} defects - Array of defect objects
   */
  updateDefects(defects = []) {
    // Clear existing defect markers
    this.defectMarkers.forEach((marker) => this.scene.remove(marker));
    this.defectMarkers = [];
    this.defects = defects;

    // Create markers for each defect
    defects.forEach((defect, index) => {
      // Normalize coordinates to pot surface (0-1 range)
      const u = (defect.x + 1) / 2; // Normalize x to 0-1
      const v = (defect.y + 1) / 2; // Normalize y to 0-1

      // Create marker based on defect type
      const marker = this.createDefectMarker(defect, u, v);
      this.scene.add(marker);
      this.defectMarkers.push(marker);
    });
  }

  /**
   * Create a 3D marker for a single defect
   * @param {Object} defect - Defect data
   * @param {number} u - Normalized u coordinate (0-1)
   * @param {number} v - Normalized v coordinate (0-1)
   * @returns {THREE.Group} Marker group
   */
  createDefectMarker(defect, u, v) {
    const group = new THREE.Group();

    // Determine color based on defect type
    const color =
      defect.depth === 'subsurface'
        ? 0xff9800 // Orange for subsurface
        : 0xff5722; // Red for surface

    const opacity = defect.depth === 'subsurface' ? 0.6 : 0.9;

    // Create sphere marker
    const sphereGeometry = new THREE.SphereGeometry(0.15, 16, 16);
    const material = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.5,
      metalness: 0.5,
      roughness: 0.4,
    });

    const sphere = new THREE.Mesh(sphereGeometry, material);

    // Position marker on pot surface
    const angle = u * Math.PI * 2;
    const height = (v - 0.5) * 1.5;
    const radius = 0.75 + (defect.depth === 'subsurface' ? -0.1 : 0);

    sphere.position.set(
      Math.cos(angle) * radius * 1.5,
      height * 1.5,
      Math.sin(angle) * radius * 1.5
    );

    group.add(sphere);

    // Add label
    const label = this.createDefectLabel(
      `#${defect.id || '?'} ${defect.material || 'Defect'}`,
      color
    );
    label.position.copy(sphere.position);
    label.position.z += 0.5;
    group.add(label);

    // Store defect data
    group.userData = { defect, u, v };

    return group;
  }

  /**
   * Create a text label for a defect marker
   * @param {string} text - Label text
   * @param {number} color - Hex color
   * @returns {THREE.Sprite} Text sprite
   */
  createDefectLabel(text, color) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(text, 128, 40);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(2, 0.5, 1);

    return sprite;
  }

  /**
   * Animate the scene
   */
  animate = () => {
    requestAnimationFrame(this.animate);

    // Add continuous rotation when idle
    if (!this.controls.isRotating) {
      this.controls.rotation.y += 0.002;
      if (this.potMesh) {
        this.potMesh.rotation.y = this.controls.rotation.y;
        this.potMesh.rotation.x = this.controls.rotation.x - Math.PI / 8;
      }
    }

    // Light rotation for dynamic lighting
    const lights = this.scene.children.filter(
      (child) => child instanceof THREE.Light
    );
    if (lights.length > 1) {
      const light = lights[1];
      light.position.x = Math.sin(Date.now() * 0.0005) * 5;
      light.position.z = Math.cos(Date.now() * 0.0005) * 5;
    }

    this.renderer.render(this.scene, this.camera);
  };

  /**
   * Dispose and clean up resources
   */
  dispose() {
    this.renderer.dispose();
    this.potGeometry?.dispose();
    this.scene.children.forEach((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  }
}

// Initialize visualization when DOM is ready
function initPot3D() {
  const container = document.getElementById('potVisualization3D');
  if (!container) {
    console.error('Pot visualization container not found');
    return;
  }
  
  if (!window.THREE) {
    console.error('Three.js library not loaded');
    return;
  }

  window.pot3d = new Pot3DVisualization('potVisualization3D');
  
  // Load sample defects for initial visualization
  if (window.pot3d && window.pot3d.scene) {
    window.pot3d.updateDefects([
      { id: 1, x: 0.3, y: 0.2, z: 0.5, depth: 'surface', confidence: 0.92, material: 'Clay' },
      { id: 2, x: -0.4, y: 0.5, z: 0.5, depth: 'subsurface', confidence: 0.78, material: 'Crack' },
      { id: 3, x: 0.1, y: -0.3, z: 0.5, depth: 'surface', confidence: 0.85, material: 'Debris' },
    ]);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPot3D);
} else {
  // DOM already loaded
  setTimeout(initPot3D, 100);
}
