// BSCS-DS_S2_M4 Physics Engine
// A simple physics engine to simulate gravity, friction and other forces

// DOM Elements
const canvas = document.getElementById('physics-canvas');
const resetBtn = document.getElementById('reset-btn');
const addBallBtn = document.getElementById('add-ball-btn');
const gravitySlider = document.getElementById('gravity-slider');
const gravityValue = document.getElementById('gravity-value');
const frictionSlider = document.getElementById('friction-slider');
const frictionValue = document.getElementById('friction-value');
const fpsCounter = document.getElementById('fps-counter');
const particleCounter = document.getElementById('particle-counter');

// Physics engine configuration
const config = {
    gravity: parseFloat(gravitySlider.value),
    friction: parseFloat(frictionSlider.value),
    maxParticles: 50,
    minRadius: 10,
    maxRadius: 30,
    colors: [
        '#60a5fa', '#4a6cf7', '#a78bfa', '#f472b6', 
        '#34d399', '#fbbf24', '#f87171', '#9333ea'
    ],
    collisionDamping: 0.8,
    wallCollisionDamping: 0.7
};

// Physics engine state
let particles = [];
let isMouseDown = false;
let selectedParticle = null;
let dragStartPos = { x: 0, y: 0 };
let lastFrameTime = 0;
let fps = 0;
let frameCount = 0;
let lastFpsUpdate = 0;

// Vector utility functions
const Vector = {
    add: (v1, v2) => ({ x: v1.x + v2.x, y: v1.y + v2.y }),
    subtract: (v1, v2) => ({ x: v1.x - v2.x, y: v1.y - v2.y }),
    multiply: (v, scalar) => ({ x: v.x * scalar, y: v.y * scalar }),
    divide: (v, scalar) => ({ x: v.x / scalar, y: v.y / scalar }),
    magnitude: (v) => Math.sqrt(v.x * v.x + v.y * v.y),
    normalize: (v) => {
        const mag = Vector.magnitude(v);
        return mag === 0 ? { x: 0, y: 0 } : Vector.divide(v, mag);
    },
    distance: (v1, v2) => Vector.magnitude(Vector.subtract(v1, v2))
};

// Initialize the physics engine
function init() {
    // Event listeners for controls
    resetBtn.addEventListener('click', resetSimulation);
    addBallBtn.addEventListener('click', addRandomParticle);
    gravitySlider.addEventListener('input', updateGravity);
    frictionSlider.addEventListener('input', updateFriction);
    
    // Mouse event listeners for the canvas
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseUp);
    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);
    
    // Add initial particles
    for (let i = 0; i < 10; i++) {
        addRandomParticle();
    }
    
    // Start animation loop
    requestAnimationFrame(update);
}

// Create a new particle
function createParticle(x, y, radius, velocity = { x: 0, y: 0 }) {
    const randomColor = config.colors[Math.floor(Math.random() * config.colors.length)];
    const particle = {
        x: x,
        y: y,
        radius: radius,
        velocity: velocity,
        mass: radius * radius * 0.01, // Mass proportional to area
        color: randomColor,
        trail: [],
        maxTrailLength: 10,
        selected: false,
        id: 'particle-' + Date.now() + '-' + Math.floor(Math.random() * 1000)
    };
    
    // Create SVG circle element for the particle
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', particle.x);
    circle.setAttribute('cy', particle.y);
    circle.setAttribute('r', particle.radius);
    circle.setAttribute('fill', particle.color);
    circle.setAttribute('class', 'particle');
    circle.setAttribute('id', particle.id);
    
    canvas.appendChild(circle);
    
    // Create trail path element
    const trail = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    trail.setAttribute('id', 'trail-' + particle.id);
    trail.setAttribute('stroke', particle.color);
    trail.setAttribute('fill', 'none');
    trail.setAttribute('class', 'trail');
    trail.setAttribute('d', '');
    canvas.insertBefore(trail, canvas.firstChild);
    
    return particle;
}

// Add a random particle
function addRandomParticle() {
    if (particles.length >= config.maxParticles) {
        return;
    }
    
    const canvasRect = canvas.getBoundingClientRect();
    const radius = config.minRadius + Math.random() * (config.maxRadius - config.minRadius);
    const x = radius + Math.random() * (canvasRect.width - 2 * radius);
    const y = radius + Math.random() * (canvasRect.height - 2 * radius);
    
    const velocity = {
        x: (Math.random() - 0.5) * 5,
        y: (Math.random() - 0.5) * 5
    };
    
    particles.push(createParticle(x, y, radius, velocity));
    updateParticleCounter();
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
    
    const canvasRect = canvas.getBoundingClientRect();
    
    // Update positions and apply physics
    for (let i = 0; i < particles.length; i++) {
        const particle = particles[i];
        
        // Apply gravity if not selected
        if (!particle.selected) {
            particle.velocity.y += config.gravity * deltaTime;
        }
        
        // Apply friction
        particle.velocity.x *= config.friction;
        particle.velocity.y *= config.friction;
        
        // Update position
        particle.x += particle.velocity.x;
        particle.y += particle.velocity.y;
        
        // Boundary collision detection (walls)
        if (particle.x - particle.radius < 0) {
            particle.x = particle.radius;
            particle.velocity.x = -particle.velocity.x * config.wallCollisionDamping;
        } else if (particle.x + particle.radius > canvasRect.width) {
            particle.x = canvasRect.width - particle.radius;
            particle.velocity.x = -particle.velocity.x * config.wallCollisionDamping;
        }
        
        if (particle.y - particle.radius < 0) {
            particle.y = particle.radius;
            particle.velocity.y = -particle.velocity.y * config.wallCollisionDamping;
        } else if (particle.y + particle.radius > canvasRect.height) {
            particle.y = canvasRect.height - particle.radius;
            particle.velocity.y = -particle.velocity.y * config.wallCollisionDamping;
        }
        
        // Update trail
        particle.trail.push({ x: particle.x, y: particle.y });
        if (particle.trail.length > particle.maxTrailLength) {
            particle.trail.shift();
        }
        
        // Update trail path
        if (particle.trail.length > 1) {
            let pathData = `M ${particle.trail[0].x} ${particle.trail[0].y}`;
            for (let j = 1; j < particle.trail.length; j++) {
                pathData += ` L ${particle.trail[j].x} ${particle.trail[j].y}`;
            }
            
            const trail = document.getElementById('trail-' + particle.id);
            if (trail) {
                trail.setAttribute('d', pathData);
            }
        }
        
        // Update particle SVG element
        const circle = document.getElementById(particle.id);
        if (circle) {
            circle.setAttribute('cx', particle.x);
            circle.setAttribute('cy', particle.y);
        }
    }
    
    // Particle-particle collision detection
    for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
            const p1 = particles[i];
            const p2 = particles[j];
            
            // Skip if either particle is selected
            if (p1.selected || p2.selected) continue;
            
            const distance = Vector.distance({ x: p1.x, y: p1.y }, { x: p2.x, y: p2.y });
            const minDistance = p1.radius + p2.radius;
            
            if (distance < minDistance) {
                // Collision detected - resolve it
                resolveCollision(p1, p2);
            }
        }
    }
    
    // Continue animation loop
    requestAnimationFrame(update);
}

// Resolve collision between two particles
function resolveCollision(p1, p2) {
    const collisionVector = Vector.subtract({ x: p2.x, y: p2.y }, { x: p1.x, y: p1.y });
    const distance = Vector.magnitude(collisionVector);
    const normal = Vector.normalize(collisionVector);
    
    // Calculate overlap and move particles apart
    const overlap = (p1.radius + p2.radius) - distance;
    const p1MoveRatio = p1.mass / (p1.mass + p2.mass);
    const p2MoveRatio = p2.mass / (p1.mass + p2.mass);
    
    // Move particles apart to prevent sticking
    p1.x -= normal.x * overlap * (1 - p1MoveRatio);
    p1.y -= normal.y * overlap * (1 - p1MoveRatio);
    p2.x += normal.x * overlap * (1 - p2MoveRatio);
    p2.y += normal.y * overlap * (1 - p2MoveRatio);
    
    // Calculate relative velocity
    const relativeVelocity = Vector.subtract(p2.velocity, p1.velocity);
    
    // Calculate relative velocity in the direction of the normal
    const velAlongNormal = relativeVelocity.x * normal.x + relativeVelocity.y * normal.y;
    
    // Do not resolve if objects are moving away from each other
    if (velAlongNormal > 0) return;
    
    // Calculate impulse scalar
    const restitution = config.collisionDamping;
    const impulseMagnitude = -(1 + restitution) * velAlongNormal;
    const impulse = impulseMagnitude / (1/p1.mass + 1/p2.mass);
    
    // Apply impulse
    p1.velocity.x -= (impulse * normal.x) / p1.mass;
    p1.velocity.y -= (impulse * normal.y) / p1.mass;
    p2.velocity.x += (impulse * normal.x) / p2.mass;
    p2.velocity.y += (impulse * normal.y) / p2.mass;
}

// Event handlers
function handleMouseDown(e) {
    isMouseDown = true;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    dragStartPos = { x: mouseX, y: mouseY };
    
    // Check if we're clicking on a particle
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        const distance = Vector.distance({ x: p.x, y: p.y }, { x: mouseX, y: mouseY });
        
        if (distance <= p.radius) {
            selectParticle(p);
            return;
        }
    }
    
    // Deselect if clicking on empty space
    deselectAllParticles();
}

function handleMouseMove(e) {
    if (!isMouseDown || !selectedParticle) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Move selected particle to mouse position
    selectedParticle.x = mouseX;
    selectedParticle.y = mouseY;
    
    // Calculate velocity based on movement
    selectedParticle.velocity.x = (mouseX - dragStartPos.x) * 0.1;
    selectedParticle.velocity.y = (mouseY - dragStartPos.y) * 0.1;
    
    // Update drag start position
    dragStartPos = { x: mouseX, y: mouseY };
}

function handleMouseUp() {
    isMouseDown = false;
    if (selectedParticle) {
        // Keep the velocity from the last mouse movement
        selectedParticle.selected = false;
        selectedParticle = null;
        
        // Update particle appearance
        updateParticleAppearance();
    }
}

function handleClick(e) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Check if we're clicking on a particle
    let clickedOnParticle = false;
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        const distance = Vector.distance({ x: p.x, y: p.y }, { x: mouseX, y: mouseY });
        
        if (distance <= p.radius) {
            clickedOnParticle = true;
            break;
        }
    }
    
    // Add a new particle if clicked on empty space
    if (!clickedOnParticle && particles.length < config.maxParticles) {
        const radius = config.minRadius + Math.random() * (config.maxRadius - config.minRadius);
        particles.push(createParticle(mouseX, mouseY, radius));
        updateParticleCounter();
    }
}

// Touch events
function handleTouchStart(e) {
    e.preventDefault();
    if (e.touches.length === 1) {
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousedown', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        handleMouseDown(mouseEvent);
    }
}

function handleTouchMove(e) {
    e.preventDefault();
    if (e.touches.length === 1) {
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousemove', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        handleMouseMove(mouseEvent);
    }
}

function handleTouchEnd(e) {
    e.preventDefault();
    handleMouseUp();
}

// Helper functions
function selectParticle(particle) {
    deselectAllParticles();
    selectedParticle = particle;
    selectedParticle.selected = true;
    
    // Update appearance
    const circle = document.getElementById(particle.id);
    if (circle) {
        circle.classList.add('selected');
    }
}

function deselectAllParticles() {
    particles.forEach(p => {
        p.selected = false;
        const circle = document.getElementById(p.id);
        if (circle) {
            circle.classList.remove('selected');
        }
    });
    selectedParticle = null;
}

function updateParticleAppearance() {
    particles.forEach(p => {
        const circle = document.getElementById(p.id);
        if (circle) {
            if (p.selected) {
                circle.classList.add('selected');
            } else {
                circle.classList.remove('selected');
            }
        }
    });
}

function resetSimulation() {
    // Remove all particles from the DOM
    particles.forEach(p => {
        const circle = document.getElementById(p.id);
        if (circle) {
            circle.remove();
        }
        
        const trail = document.getElementById('trail-' + p.id);
        if (trail) {
            trail.remove();
        }
    });
    
    // Clear the particles array
    particles = [];
    selectedParticle = null;
    
    // Add some new random particles
    for (let i = 0; i < 10; i++) {
        addRandomParticle();
    }
}

function updateGravity() {
    config.gravity = parseFloat(gravitySlider.value);
    gravityValue.textContent = config.gravity.toFixed(1);
}

function updateFriction() {
    config.friction = parseFloat(frictionSlider.value);
    frictionValue.textContent = config.friction.toFixed(2);
}

function updateParticleCounter() {
    particleCounter.textContent = `${particles.length} Particles`;
}

// Start the simulation when the page loads
window.addEventListener('load', init);