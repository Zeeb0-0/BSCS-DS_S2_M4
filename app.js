// BSCS-DS_S2_M4 Physics Engine
// A comprehensive physics engine to simulate gravity, friction, elasticity, and momentum

// DOM Elements
const canvas = document.getElementById('physics-canvas');
const resetBtn = document.getElementById('reset-btn');
const addShapeBtn = document.getElementById('add-shape-btn');
const addCircleBtn = document.getElementById('add-circle-btn');
const addSquareBtn = document.getElementById('add-square-btn');
const addTriangleBtn = document.getElementById('add-triangle-btn');
const addPentagonBtn = document.getElementById('add-pentagon-btn');
const removeShapeBtn = document.getElementById('remove-shape-btn');
// New button for Hexagon (if added to HTML)
const addHexagonBtn = document.getElementById('add-hexagon-btn');

const gravitySlider = document.getElementById('gravity-slider');
const gravityInput = document.getElementById('gravity-input');
const frictionSlider = document.getElementById('friction-slider');
const frictionInput = document.getElementById('friction-input');
const elasticitySlider = document.getElementById('elasticity-slider');
const elasticityInput = document.getElementById('elasticity-input');

const fpsCounter = document.getElementById('fps-counter');
const particleCounter = document.getElementById('particle-counter');
const velocityValue = document.getElementById('velocity-value');
const momentumValue = document.getElementById('momentum-value');
const vectorDisplay = document.getElementById('vector-display');

// Physics engine configuration (ranges can be modified in HTML as well)
const config = {
    gravity: parseFloat(gravitySlider.value),       // e.g., -20 to 20 (or wider if desired)
    friction: parseFloat(frictionSlider.value),       // 0 to 1
    elasticity: parseFloat(elasticitySlider.value),   // 0 to 2
    maxObjects: 50,
    minSize: 15,
    maxSize: 40,
    gradients: [
        'url(#gradient-blue)',
        'url(#gradient-purple)',
        'url(#gradient-pink)',
        'url(#gradient-green)',
        'url(#gradient-yellow)',
        'url(#gradient-red)'
    ],
    wallElasticity: 0.7,
    dragFactor: 0.1,
    showVectors: true
};

// Shape types
const SHAPE_TYPES = {
    CIRCLE: 'circle',
    SQUARE: 'square',
    TRIANGLE: 'triangle',
    PENTAGON: 'pentagon',
    HEXAGON: 'hexagon'  // New shape added
};

// Physics engine state
let objects = [];
let isMouseDown = false;
let selectedObject = null;
let dragStartPos = { x: 0, y: 0 };
let lastMousePos = { x: 0, y: 0 };
let lastFrameTime = 0;
let fps = 0;
let frameCount = 0;
let lastFpsUpdate = 0;
let canvasDimensions = { width: 0, height: 0 };

// Vector utility functions
const Vector = {
    add: (v1, v2) => ({ x: v1.x + v2.x, y: v1.y + v2.y }),
    subtract: (v1, v2) => ({ x: v1.x - v2.x, y: v1.y - v2.y }),
    multiply: (v, scalar) => ({ x: v.x * scalar, y: v.y * scalar }),
    divide: (v, scalar) => scalar !== 0 ? { x: v.x / scalar, y: v.y / scalar } : { x: 0, y: 0 },
    magnitude: (v) => Math.sqrt(v.x * v.x + v.y * v.y),
    normalize: (v) => {
        const mag = Vector.magnitude(v);
        return mag === 0 ? { x: 0, y: 0 } : Vector.divide(v, mag);
    },
    distance: (v1, v2) => Vector.magnitude(Vector.subtract(v1, v2)),
    dot: (v1, v2) => v1.x * v2.x + v1.y * v2.y,
    cross: (v1, v2) => v1.x * v2.y - v1.y * v2.x,
    rotate: (v, angle) => {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return {
            x: v.x * cos - v.y * sin,
            y: v.x * sin + v.y * cos
        };
    }
};

// Initialize the physics engine
function init() {
    // Update canvas dimensions
    updateCanvasDimensions();
    
    // Event listeners for controls
    resetBtn.addEventListener('click', resetSimulation);
    addCircleBtn.addEventListener('click', () => addRandomObject(SHAPE_TYPES.CIRCLE));
    addSquareBtn.addEventListener('click', () => addRandomObject(SHAPE_TYPES.SQUARE));
    addTriangleBtn.addEventListener('click', () => addRandomObject(SHAPE_TYPES.TRIANGLE));
    addPentagonBtn.addEventListener('click', () => addRandomObject(SHAPE_TYPES.PENTAGON));
    if (addHexagonBtn) { // Only add if the element exists in HTML
        addHexagonBtn.addEventListener('click', () => addRandomObject(SHAPE_TYPES.HEXAGON));
    }
    removeShapeBtn.addEventListener('click', removeSelectedObject);
    
    // Sliders and input fields
    gravitySlider.addEventListener('input', updateGravity);
    gravityInput.addEventListener('input', updateGravityFromInput);
    frictionSlider.addEventListener('input', updateFriction);
    frictionInput.addEventListener('input', updateFrictionFromInput);
    elasticitySlider.addEventListener('input', updateElasticity);
    elasticityInput.addEventListener('input', updateElasticityFromInput);
    
    // Mouse event listeners for the canvas
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseUp);
    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);
    
    // Window resize event
    window.addEventListener('resize', updateCanvasDimensions);
    
    // Start animation loop
    requestAnimationFrame(update);
}

// Update canvas dimensions
function updateCanvasDimensions() {
    const rect = canvas.getBoundingClientRect();
    canvasDimensions = {
        width: rect.width,
        height: rect.height
    };
}

// Create a new physics object based on shape type
function createObject(x, y, size, shapeType, velocity = { x: 0, y: 0 }) {
    // Choose a random gradient
    const gradient = config.gradients[Math.floor(Math.random() * config.gradients.length)];
    
    // Calculate mass based on size
    const mass = size * size * 0.01;
    
    // Base object properties
    const object = {
        x: x,
        y: y,
        size: size,
        velocity: velocity,
        mass: mass,
        type: shapeType,
        fill: gradient,
        angularVelocity: (Math.random() - 0.5) * 0.1,
        angle: Math.random() * Math.PI * 2,
        trail: [],
        maxTrailLength: 10,
        selected: false,
        id: 'object-' + Date.now() + '-' + Math.floor(Math.random() * 1000)
    };
    
    // Create SVG element based on shape type
    let shapeElement;
    let points = [];
    
    switch (shapeType) {
        case SHAPE_TYPES.CIRCLE:
            shapeElement = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            shapeElement.setAttribute('cx', object.x);
            shapeElement.setAttribute('cy', object.y);
            shapeElement.setAttribute('r', object.size);
            // For circle collision
            object.radius = size;
            object.vertices = [];
            break;
            
        case SHAPE_TYPES.SQUARE:
            shapeElement = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            shapeElement.setAttribute('x', object.x - object.size);
            shapeElement.setAttribute('y', object.y - object.size);
            shapeElement.setAttribute('width', object.size * 2);
            shapeElement.setAttribute('height', object.size * 2);
            // Vertices for collision
            object.vertices = [
                { x: -size, y: -size },
                { x: size, y: -size },
                { x: size, y: size },
                { x: -size, y: size }
            ];
            object.radius = Math.sqrt(2) * size; // Bounding circle
            break;
            
        case SHAPE_TYPES.TRIANGLE:
            shapeElement = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            // Equilateral triangle
            const h = size * Math.sqrt(3);
            points = [
                `${object.x},${object.y - size}`,
                `${object.x + h * 2/3},${object.y + size/2}`,
                `${object.x - h * 2/3},${object.y + size/2}`
            ];
            shapeElement.setAttribute('points', points.join(' '));
            // Vertices for collision
            object.vertices = [
                { x: 0, y: -size },
                { x: h * 2/3, y: size/2 },
                { x: -h * 2/3, y: size/2 }
            ];
            object.radius = size; // Bounding circle
            break;
            
        case SHAPE_TYPES.PENTAGON:
            shapeElement = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            points = [];
            // Regular pentagon
            for (let i = 0; i < 5; i++) {
                const angle = (i * 2 * Math.PI / 5) - Math.PI / 2;
                points.push(`${object.x + size * Math.cos(angle)},${object.y + size * Math.sin(angle)}`);
                
                // Add vertices for collision
                if (!object.vertices) object.vertices = [];
                object.vertices.push({
                    x: size * Math.cos(angle),
                    y: size * Math.sin(angle)
                });
            }
            shapeElement.setAttribute('points', points.join(' '));
            object.radius = size; // Bounding circle
            break;
            
        case SHAPE_TYPES.HEXAGON:
            shapeElement = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            points = [];
            object.vertices = [];
            // Regular hexagon (6 sides)
            for (let i = 0; i < 6; i++) {
                const angle = (i * 2 * Math.PI / 6) - Math.PI / 2;
                const vx = size * Math.cos(angle);
                const vy = size * Math.sin(angle);
                points.push(`${object.x + vx},${object.y + vy}`);
                object.vertices.push({ x: vx, y: vy });
            }
            shapeElement.setAttribute('points', points.join(' '));
            object.radius = size; // Bounding circle
            break;
    }
    
    // Common shape attributes
    shapeElement.setAttribute('fill', object.fill);
    shapeElement.setAttribute('class', 'physics-object');
    shapeElement.setAttribute('id', object.id);
    
    if (shapeType !== SHAPE_TYPES.CIRCLE) {
        shapeElement.setAttribute('transform', `rotate(${object.angle * 180 / Math.PI}, ${object.x}, ${object.y})`);
    }
    
    // Add shape to the SVG canvas
    canvas.appendChild(shapeElement);
    
    // Create trail path element
    const trail = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    trail.setAttribute('id', 'trail-' + object.id);
    // Use the solid color from the gradient URL (strip 'url(' and ')')
    trail.setAttribute('stroke', object.fill.replace('url(', '').replace(')', ''));
    trail.setAttribute('fill', 'none');
    trail.setAttribute('class', 'trail');
    trail.setAttribute('d', '');
    canvas.insertBefore(trail, canvas.firstChild);
    
    // Create velocity vector indicator
    if (config.showVectors) {
        const vector = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        vector.setAttribute('id', 'vector-' + object.id);
        vector.setAttribute('x1', object.x);
        vector.setAttribute('y1', object.y);
        vector.setAttribute('x2', object.x);
        vector.setAttribute('y2', object.y);
        vector.setAttribute('class', 'vector-indicator');
        vector.setAttribute('stroke', '#ffffff');
        canvas.appendChild(vector);
    }
    
    return object;
}

// Add a random object with specified shape type
function addRandomObject(shapeType = SHAPE_TYPES.CIRCLE) {
    if (objects.length >= config.maxObjects) {
        return;
    }
    
    const size = config.minSize + Math.random() * (config.maxSize - config.minSize);
    const margin = shapeType === SHAPE_TYPES.CIRCLE ? size : size * Math.sqrt(2);
    
    const x = margin + Math.random() * (canvasDimensions.width - 2 * margin);
    const y = margin + Math.random() * (canvasDimensions.height - 2 * margin);
    
    const velocity = {
        x: (Math.random() - 0.5) * 5,
        y: (Math.random() - 0.5) * 5
    };
    
    objects.push(createObject(x, y, size, shapeType, velocity));
    updateObjectCounter();
}

// Remove the selected object
function removeSelectedObject() {
    if (!selectedObject) return;
    
    // Remove SVG elements
    const shape = document.getElementById(selectedObject.id);
    if (shape) shape.remove();
    
    const trail = document.getElementById('trail-' + selectedObject.id);
    if (trail) trail.remove();
    
    const vector = document.getElementById('vector-' + selectedObject.id);
    if (vector) vector.remove();
    
    // Remove from objects array
    objects = objects.filter(obj => obj.id !== selectedObject.id);
    
    // Reset selection
    selectedObject = null;
    vectorDisplay.style.display = 'none';
    
    updateObjectCounter();
}

// Calculate momentum for an object
function calculateMomentum(object) {
    return Vector.magnitude(object.velocity) * object.mass;
}

// Transform object's local vertices to world coordinates
function getWorldVertices(object) {
    if (object.type === SHAPE_TYPES.CIRCLE) {
        return []; // Circles don't have vertices
    }
    
    return object.vertices.map(vertex => {
        const rotated = Vector.rotate(vertex, object.angle);
        return {
            x: object.x + rotated.x,
            y: object.y + rotated.y
        };
    });
}

// Check if point is inside polygon
function pointInPolygon(point, vertices) {
    let inside = false;
    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
        const xi = vertices[i].x, yi = vertices[i].y;
        const xj = vertices[j].x, yj = vertices[j].y;
        
        const intersect = ((yi > point.y) !== (yj > point.y))
            && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

// Update the simulation
function update(timestamp) {
    // Calculate FPS
    if (!lastFrameTime) {
        lastFrameTime = timestamp;
        frameCount = 0;
    }
    
    const deltaTime = (timestamp - lastFrameTime) / 1000; // Convert to seconds
    lastFrameTime = timestamp;
    frameCount++;
    
    // Update FPS display every 500ms
    if (timestamp - lastFpsUpdate > 500) {
        fps = Math.round(frameCount / ((timestamp - lastFpsUpdate) / 1000));
        fpsCounter.textContent = `${fps} FPS`;
        frameCount = 0;
        lastFpsUpdate = timestamp;
    }
    
    // Cap delta time to prevent huge jumps
    const cappedDelta = Math.min(deltaTime, 0.1);
    
    // Apply physics to each object
    objects.forEach(object => updateObject(object, cappedDelta));
    
    // Check for collisions
    handleCollisions();
    
    // Update SVG elements
    updateSVGElements();
    
    // Update selected object info
    updateSelectedObjectInfo();
    
    // Continue animation loop
    requestAnimationFrame(update);
}

// Update physics for an object
function updateObject(object, deltaTime) {
    // Apply gravity
    object.velocity.y += config.gravity * deltaTime;
    
    // Apply friction (air resistance)
    object.velocity.x *= Math.pow(config.friction, deltaTime * 60);
    object.velocity.y *= Math.pow(config.friction, deltaTime * 60);
    
    // Very small velocities are set to zero to prevent jitter
    if (Math.abs(object.velocity.x) < 0.01) object.velocity.x = 0;
    if (Math.abs(object.velocity.y) < 0.01) object.velocity.y = 0;
    
    // Update position
    object.x += object.velocity.x;
    object.y += object.velocity.y;
    
    // Update rotation
    object.angle += object.angularVelocity;
    
    // Apply angular friction
    object.angularVelocity *= Math.pow(config.friction, deltaTime * 60);
    
    // Check boundary collisions
    handleBoundaryCollision(object);
    
    // Update trail
    if (Vector.magnitude(object.velocity) > 1) {
        object.trail.push({ x: object.x, y: object.y });
        if (object.trail.length > object.maxTrailLength) {
            object.trail.shift();
        }
    }
}

// Handle object collision with boundaries
function handleBoundaryCollision(object) {
    let collision = false;
    const radius = object.radius || object.size;
    
    // Bottom boundary
    if (object.y + radius > canvasDimensions.height) {
        object.y = canvasDimensions.height - radius;
        object.velocity.y = -object.velocity.y * config.elasticity;
        // Add some friction when hitting the ground
        object.velocity.x *= 0.95;
        collision = true;
    }
    
    // Top boundary
    if (object.y - radius < 0) {
        object.y = radius;
        object.velocity.y = -object.velocity.y * config.elasticity;
        collision = true;
    }
    
    // Right boundary
    if (object.x + radius > canvasDimensions.width) {
        object.x = canvasDimensions.width - radius;
        object.velocity.x = -object.velocity.x * config.elasticity;
        collision = true;
    }
    
    // Left boundary
    if (object.x - radius < 0) {
        object.x = radius;
        object.velocity.x = -object.velocity.x * config.elasticity;
        collision = true;
    }
    
    // If collision occurred, slightly increase angular velocity for more realistic behavior
    if (collision) {
        object.angularVelocity += (Math.random() - 0.5) * 0.05;
    }
}

// Check for collisions between objects
function handleCollisions() {
    for (let i = 0; i < objects.length; i++) {
        for (let j = i + 1; j < objects.length; j++) {
            checkCollision(objects[i], objects[j]);
        }
    }
}

// Check and resolve collision between two objects
function checkCollision(obj1, obj2) {
    // Quick check using bounding circles
    const distance = Vector.distance({ x: obj1.x, y: obj1.y }, { x: obj2.x, y: obj2.y });
    if (distance > obj1.radius + obj2.radius) {
        return; // No collision possible
    }
    
    // For simplicity, treat all shapes as circles for collision
    const overlap = obj1.radius + obj2.radius - distance;
    if (overlap <= 0) {
        return; // No collision
    }
    
    // Calculate collision normal
    const normal = Vector.normalize(Vector.subtract(
        { x: obj2.x, y: obj2.y },
        { x: obj1.x, y: obj1.y }
    ));
    
    // Calculate relative velocity
    const relativeVelocity = Vector.subtract(obj2.velocity, obj1.velocity);
    
    // Check if objects are moving toward each other
    const velocityAlongNormal = Vector.dot(relativeVelocity, normal);
    if (velocityAlongNormal > 0) {
        return; // Objects are moving away from each other
    }
    
    // Calculate impulse scalar
    const restitution = config.elasticity;
    const impulseScalar = -(1 + restitution) * velocityAlongNormal / 
                            (1 / obj1.mass + 1 / obj2.mass);
    
    // Apply impulse
    const impulse = Vector.multiply(normal, impulseScalar);
    obj1.velocity = Vector.subtract(obj1.velocity, Vector.multiply(impulse, 1 / obj1.mass));
    obj2.velocity = Vector.add(obj2.velocity, Vector.multiply(impulse, 1 / obj2.mass));
    
    // Positional correction (to prevent objects from sinking into each other)
    const percent = 0.5; // typically 20% to 80%
    const correction = Vector.multiply(normal, percent * overlap / (1 / obj1.mass + 1 / obj2.mass));
    
    obj1.x -= correction.x * (1 / obj1.mass);
    obj1.y -= correction.y * (1 / obj1.mass);
    obj2.x += correction.x * (1 / obj2.mass);
    obj2.y += correction.y * (1 / obj2.mass);
    
    // Add some angular velocity change for more dynamic behavior
    const angularImpulse = Vector.cross(relativeVelocity, normal) * 0.01;
    obj1.angularVelocity -= angularImpulse / obj1.mass;
    obj2.angularVelocity += angularImpulse / obj2.mass;
}

// Update SVG elements to match object positions
function updateSVGElements() {
    objects.forEach(object => {
        const element = document.getElementById(object.id);
        if (!element) return;
        
        switch (object.type) {
            case SHAPE_TYPES.CIRCLE:
                element.setAttribute('cx', object.x);
                element.setAttribute('cy', object.y);
                break;
                
            case SHAPE_TYPES.SQUARE:
                element.setAttribute('x', object.x - object.size);
                element.setAttribute('y', object.y - object.size);
                element.setAttribute('transform', `rotate(${object.angle * 180 / Math.PI}, ${object.x}, ${object.y})`);
                break;
                
            case SHAPE_TYPES.TRIANGLE:
            case SHAPE_TYPES.PENTAGON:
            case SHAPE_TYPES.HEXAGON:
                // Update polygon positions by rotating and translating vertices
                const worldVertices = getWorldVertices(object);
                const pointsString = worldVertices.map(v => `${v.x},${v.y}`).join(' ');
                element.setAttribute('points', pointsString);
                break;
        }
        
        // Update trail
        if (object.trail.length > 1) {
            const trail = document.getElementById('trail-' + object.id);
            if (trail) {
                const pathData = `M ${object.trail[0].x} ${object.trail[0].y} ` + 
                                object.trail.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
                trail.setAttribute('d', pathData);
            }
        }
        
        // Update velocity vector
        if (config.showVectors) {
            const vector = document.getElementById('vector-' + object.id);
            if (vector) {
                const velocityScale = 5;
                vector.setAttribute('x1', object.x);
                vector.setAttribute('y1', object.y);
                vector.setAttribute('x2', object.x + object.velocity.x * velocityScale);
                vector.setAttribute('y2', object.y + object.velocity.y * velocityScale);
            }
        }
        
        // Update selection indicator
        if (object.selected) {
            element.classList.add('selected');
        } else {
            element.classList.remove('selected');
        }
    });
}

// Update information display for selected object
function updateSelectedObjectInfo() {
    if (selectedObject) {
        velocityValue.textContent = `${selectedObject.velocity.x.toFixed(1)}, ${selectedObject.velocity.y.toFixed(1)}`;
        momentumValue.textContent = calculateMomentum(selectedObject).toFixed(1);
        vectorDisplay.style.display = 'block';
    } else {
        vectorDisplay.style.display = 'none';
    }
}

// Update the object counter display
function updateObjectCounter() {
    particleCounter.textContent = `${objects.length} Objects`;
}

// Handle mouse down event
function handleMouseDown(event) {
    isMouseDown = true;
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    dragStartPos = { x: mouseX, y: mouseY };
    lastMousePos = { x: mouseX, y: mouseY };
    
    // Check if we clicked on an object
    selectedObject = null;
    for (let i = objects.length - 1; i >= 0; i--) {
        const obj = objects[i];
        
        // For circles, check distance
        if (obj.type === SHAPE_TYPES.CIRCLE) {
            if (Vector.distance({ x: mouseX, y: mouseY }, { x: obj.x, y: obj.y }) <= obj.radius) {
                selectedObject = obj;
                break;
            }
        } else {
            // For polygons, check if point is inside
            const worldVertices = getWorldVertices(obj);
            if (pointInPolygon({ x: mouseX, y: mouseY }, worldVertices)) {
                selectedObject = obj;
                break;
            }
        }
    }
    
    // Update selection state
    objects.forEach(obj => obj.selected = (obj === selectedObject));
}

// Handle mouse move event
function handleMouseMove(event) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    if (isMouseDown && selectedObject) {
        // Calculate new velocity based on mouse movement
        const dragVelocity = {
            x: (mouseX - lastMousePos.x) * config.dragFactor,
            y: (mouseY - lastMousePos.y) * config.dragFactor
        };
        
        // Update object velocity
        selectedObject.velocity.x += dragVelocity.x;
        selectedObject.velocity.y += dragVelocity.y;
        
        // Limit max velocity to prevent extreme speeds
        const maxVel = 100;
        const vel = Vector.magnitude(selectedObject.velocity);
        if (vel > maxVel) {
            selectedObject.velocity = Vector.multiply(
                Vector.normalize(selectedObject.velocity),
                maxVel
            );
        }
    }
    
    lastMousePos = { x: mouseX, y: mouseY };
}

// Handle mouse up event
function handleMouseUp() {
    isMouseDown = false;
}

// Handle mouse click event (for selecting without dragging)
function handleClick(event) {
    // Selection is handled in mouseDown
}

// Handle touch start event
function handleTouchStart(event) {
    event.preventDefault();
    if (event.touches.length === 1) {
        const touch = event.touches[0];
        handleMouseDown({
            clientX: touch.clientX,
            clientY: touch.clientY
        });
    }
}

// Handle touch move event
function handleTouchMove(event) {
    event.preventDefault();
    if (event.touches.length === 1) {
        const touch = event.touches[0];
        handleMouseMove({
            clientX: touch.clientX,
            clientY: touch.clientY
        });
    }
}

// Handle touch end event
function handleTouchEnd(event) {
    handleMouseUp();
}

// Reset the simulation (clear all objects)
function resetSimulation() {
    // Remove all SVG elements
    objects.forEach(obj => {
        const shape = document.getElementById(obj.id);
        if (shape) shape.remove();
        
        const trail = document.getElementById('trail-' + obj.id);
        if (trail) trail.remove();
        
        const vector = document.getElementById('vector-' + obj.id);
        if (vector) vector.remove();
    });
    
    // Clear objects array
    objects = [];
    selectedObject = null;
    vectorDisplay.style.display = 'none';
    
    updateObjectCounter();
}

// Update gravity from slider
function updateGravity() {
    config.gravity = parseFloat(gravitySlider.value);
    gravityInput.value = config.gravity;
}

// Update gravity from input field
function updateGravityFromInput() {
    const value = parseFloat(gravityInput.value);
    if (!isNaN(value) && value >= parseFloat(gravitySlider.min) && value <= parseFloat(gravitySlider.max)) {
        config.gravity = value;
        gravitySlider.value = value;
    }
}

// Update friction from slider
function updateFriction() {
    config.friction = parseFloat(frictionSlider.value);
    frictionInput.value = config.friction;
}

// Update friction from input field
function updateFrictionFromInput() {
    const value = parseFloat(frictionInput.value);
    if (!isNaN(value) && value >= parseFloat(frictionSlider.min) && value <= parseFloat(frictionSlider.max)) {
        config.friction = value;
        frictionSlider.value = value;
    }
}

// Update elasticity from slider
function updateElasticity() {
    config.elasticity = parseFloat(elasticitySlider.value);
    elasticityInput.value = config.elasticity;
}

// Update elasticity from input field
function updateElasticityFromInput() {
    const value = parseFloat(elasticityInput.value);
    if (!isNaN(value) && value >= parseFloat(elasticitySlider.min) && value <= parseFloat(elasticitySlider.max)) {
        config.elasticity = value;
        elasticitySlider.value = value;
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', init);
