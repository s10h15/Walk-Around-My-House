// ======================= Loading Images =======================
function getImage(path) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to load image at: ${path}`));
        img.src = path;
    });
}
export async function loadImages(pathMap) {
    const entries = Object.entries(pathMap);
    const loadedPromises = entries.map(async ([key, path]) => {
        const img = await getImage(path);
        return [key, img];
    });
    const results = await Promise.all(loadedPromises);
    return Object.fromEntries(results);
}
const imagesToLoad = {
    livingRoom1: "./Images/livingRoom1.jpg",
    livingRoom2: "./Images/livingRoom2.jpg",
    livingRoom3: "./Images/livingRoom3.jpg",
    livingRoom4: "./Images/livingRoom4.jpg",
    livingRoom5: "./Images/livingRoom5.jpg",
    livingRoom6: "./Images/livingRoom6.jpg",
    livingRoom7: "./Images/livingRoom7.jpg",
    livingRoom8: "./Images/livingRoom8.jpg",

    kitchen1: "./Images/kitchen1.jpg",
    kitchen2: "./Images/kitchen2.jpg",
    kitchen3: "./Images/kitchen3.jpg",
    kitchen4: "./Images/kitchen4.jpg",

    sonRoom1: "./Images/sonRoom1.jpg",
    sonRoom2: "./Images/sonRoom2.jpg",
    sonRoom3: "./Images/sonRoom3.jpg",
    sonRoom4: "./Images/sonRoom4.jpg",

    momRoom1: "./Images/momRoom1.jpg",
    momRoom2: "./Images/momRoom2.jpg",
    momRoom3: "./Images/momRoom3.jpg",
    momRoom4: "./Images/momRoom4.jpg",

    corridor1: "./Images/corridor1.jpg",
    corridor2: "./Images/corridor2.jpg",
    corridor3: "./Images/corridor3.jpg",
    corridor4: "./Images/corridor4.jpg",
    corridor5: "./Images/corridor5.jpg",

    bathroom1: "./Images/bathroom1.jpg",
    bathroom2: "./Images/bathroom2.jpg",
    bathroom3: "./Images/bathroom3.jpg",
    bathroom4: "./Images/bathroom4.jpg",
};
const images = await loadImages(imagesToLoad);

// ======================= Canvas =======================
const canvas = {
    element: document.getElementById("canvasElement"),
    ctx: null,
    width: 0,
    height: 0,
    centerX: 0,
    centerY: 0,
    minDimension: 0,
    maxDimension: 0,
    scaleRate: 0
};
canvas.ctx = canvas.element.getContext("2d");
canvas.width = canvas.element.width;
canvas.width05 = canvas.width * 0.5;
canvas.height = canvas.element.height;
canvas.height05 = canvas.height * 0.5;
canvas.centerX = canvas.width * 0.5;
canvas.centerY = canvas.height * 0.5;
canvas.minDimension = Math.min(canvas.width, canvas.height);
canvas.maxDimension = Math.max(canvas.width, canvas.height);
canvas.scaleRate = canvas.minDimension / 1024;
canvas.ctx.imageSmoothingEnabled = false;

// ======================= Input Handling =======================
let currentlyHeldKeys = {};
let pressedKeys = {};
const russianRegex = /[а-яё]/i;
window.addEventListener("keydown", event => {
    const key = event.key.toLowerCase();
    currentlyHeldKeys[key] = true;

    if (!pressedKeys[key]) {
        pressedKeys[key] = true;
    }
});
window.addEventListener("keyup", event => {
    const key = event.key.toLowerCase();
    delete currentlyHeldKeys[key];
});

// ======================= Timing And Simulation =======================
const targetFps = 60;
const physicsFPS = 144;
const fixedStep = 1 / physicsFPS;
const maxAccumulator = 1 / physicsFPS * 32;
const minDelay = 1000 / targetFps;
let accumulator = 0;
let lastFrameTime = performance.now();

class Point {
    constructor(defaultDirection, directionPhotos, pointers) {
        if (directionPhotos.length !== pointers.length) {
            console.error("POINTERS DIDNT MATCH!");
        }
        this.directionPhotos = directionPhotos;
        this.pointers = pointers;
        this.defaultDirection = defaultDirection;
    }
}
// ======================= Photos Tree =======================
const house = {
    "livingRoom": new Point(0, [images.livingRoom1, images.livingRoom2, images.livingRoom3, images.livingRoom4, images.livingRoom5, images.livingRoom6, images.livingRoom7, images.livingRoom8], ["kitchen", null, null, null, "corridor", "sonRoom", null, "momRoom"]),
    "kitchen": new Point(0, [images.kitchen1, images.kitchen2, images.kitchen3, images.kitchen4], [null, null, null, null]),
    "momRoom": new Point(1, [images.momRoom1, images.momRoom2, images.momRoom3, images.momRoom4], [null, null, null, null]),
    "corridor": new Point(3, [images.corridor1, images.corridor2, images.corridor3, images.corridor4, images.corridor5], [null, "bathroom", null, null, null]),
    "sonRoom": new Point(2, [images.sonRoom1, images.sonRoom2, images.sonRoom3, images.sonRoom4], [null, null, null, null]),
    "bathroom": new Point(2, [images.bathroom1, images.bathroom2, images.bathroom3, images.bathroom4], [null, null, null, null]),

};
let currentPointName = "livingRoom";
let currentPointDirection = 1;
let history = [];

// ======================= UI =======================
function drawArrow(x, y, rotation) {
    canvas.ctx.save();
    canvas.ctx.translate(x, y);
    canvas.ctx.rotate(rotation);
    canvas.ctx.fillStyle = "rgba(255, 255, 255, 1)";
    canvas.ctx.beginPath();
    canvas.ctx.moveTo(-15, 10);
    canvas.ctx.lineTo(0, -15);
    canvas.ctx.lineTo(15, 10);
    canvas.ctx.closePath();
    canvas.ctx.fill();
    canvas.ctx.restore();
}

// ======================= Essential Functions =======================
function draw() {
    const currentPoint = house[currentPointName];
    const currentImage = currentPoint.directionPhotos[currentPointDirection];
    canvas.ctx.drawImage(currentImage, 0, 0, canvas.width, canvas.height);

    const bx = canvas.centerX;
    const by = canvas.height - 50;
    const spacing = 40;

    drawArrow(bx - spacing, by, -Math.PI / 2);
    drawArrow(bx + spacing, by, Math.PI / 2);
    if (currentPoint.pointers[currentPointDirection] !== null) {
        drawArrow(bx, by - spacing, 0);
    }
    if (history.length > 0) {
        drawArrow(bx, by + spacing, Math.PI);
    }
}

function perFrameUpdate() {
    const directionsCount = house[currentPointName].directionPhotos.length;
    if (currentlyHeldKeys["a"]) {
        delete currentlyHeldKeys["a"];
        currentPointDirection = (currentPointDirection - 1 + directionsCount) % directionsCount;
    } else if (currentlyHeldKeys["d"]) {
        delete currentlyHeldKeys["d"];
        currentPointDirection = (currentPointDirection + 1) % directionsCount;
    } else if (currentlyHeldKeys["w"]) {
        delete currentlyHeldKeys["w"];
        const oldPoint = house[currentPointName];
        const nextPointName = oldPoint.pointers[currentPointDirection];

        if (nextPointName !== null) {
            history.push({
                name: currentPointName,
                direction: currentPointDirection
            });

            // Update the name
            currentPointName = nextPointName;

            // Update the direction using the NEW point's defaultDirection
            const newPoint = house[currentPointName];
            currentPointDirection = newPoint.defaultDirection;
        }
    } else if (currentlyHeldKeys["s"]) {
        delete currentlyHeldKeys["s"];
        if (history.length > 0) {
            const lastState = history.pop();
            currentPointName = lastState.name;
            currentPointDirection = lastState.direction;
        }
    }
}

function perFixedStepUpdate() { }

function runFrame() {
    const frameStart = performance.now();
    const deltaTime = (frameStart - lastFrameTime) / 1000;
    lastFrameTime = frameStart;

    accumulator += deltaTime;
    if (accumulator > maxAccumulator) {
        accumulator = maxAccumulator;
    }

    while (accumulator >= fixedStep) {
        perFixedStepUpdate();
        accumulator -= fixedStep;
    }

    perFrameUpdate();
    render();

    const processTime = performance.now() - frameStart;
    const nextFrameDelay = minDelay - processTime;

    setTimeout(runFrame, Math.max(0, nextFrameDelay));
}

function render() {
    canvas.ctx.fillStyle = "black";
    canvas.ctx.fillRect(0, 0, canvas.width, canvas.height);
    draw();
}

runFrame();