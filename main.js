import { Mouse } from "./mouse.js";

// ======================= Configuration =======================
const houseConfig = {
    livingRoom: { isPath: false, defaultDir: 0, exits: { 0: "kitchen", 4: "corridor", 5: "sonRoom", 7: "momRoom" } },
    kitchen: { isPath: false, defaultDir: 0, exits: {} },
    momRoom: { isPath: false, defaultDir: 1, exits: {} },
    corridor: { isPath: false, defaultDir: 3, exits: { 1: "bathroom", 4: "porch" } },
    sonRoom: { isPath: false, defaultDir: 2, exits: {} },
    bathroom: { isPath: false, defaultDir: 2, exits: {} },
    porch: { isPath: true, endingPointer: "enter" },
    enter: { isPath: false, defaultDir: 4, exits: { 2: "trees", 6: "carPath" } },
    trees: { isPath: true, endingPointer: "grass" },
    grass: { isPath: false, defaultDir: 4, exits: { 2: "grassPath" } },
    carPath: { isPath: true, endingPointer: "car" },
    car: { isPath: false, defaultDir: 2, exits: {} },
    grassPath: { isPath: true, endingPointer: "garden" },
    garden: { isPath: false, defaultDir: 2, exits: {2: "yardPath"} },
    yardPath: { isPath: true, endingPointer: "yard" },
    yard: { isPath: false, defaultDir: 4, exits: {} },
};

// ======================= Automatic Discovery Logic =======================
function getImage(path) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject();
        img.src = path;
    });
}

async function discoverRoomImages(roomName) {
    const images = [];
    let index = 1;
    let searching = true;
    while (searching) {
        try {
            const img = await getImage(`./Images/${roomName}${index}.jpg`);
            images.push(img);
            index++;
        } catch (e) {
            searching = false;
        }
    }
    return images;
}

async function buildHouse(config) {
    const house = {};
    for (const [roomName, settings] of Object.entries(config)) {
        const loadedPhotos = await discoverRoomImages(roomName);

        if (settings.isPath) {
            // This is a straight path - can only go forward/back
            house[roomName] = {
                isPath: true,
                pathPhotos: loadedPhotos,
                endingPointer: settings.endingPointer
            };
        } else {
            // This is a turnable spot
            const pointers = new Array(loadedPhotos.length).fill(null);
            for (const [dirIndex, destination] of Object.entries(settings.exits)) {
                const idx = parseInt(dirIndex);
                if (idx < loadedPhotos.length) {
                    pointers[idx] = destination;
                }
            }

            house[roomName] = {
                isPath: false,
                directionPhotos: loadedPhotos,
                pointers: pointers,
                defaultDirection: settings.defaultDir
            };
        }
    }
    return house;
}

const house = await buildHouse(houseConfig);
let currentPointName = "livingRoom";
let currentPointDirection = house["livingRoom"].defaultDirection;
let currentPathPosition = 0; // For tracking position along a path
let history = [];

// ======================= Canvas & Input =======================
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

const mouse = new Mouse(canvasElement, canvas.scaleRate);
let mouseWasPressed = false;
const HITBOX_RADIUS = 28;

let currentlyHeldKeys = {};
window.addEventListener("keydown", e => { currentlyHeldKeys[e.key.toLowerCase()] = true; });
window.addEventListener("keyup", e => { delete currentlyHeldKeys[e.key.toLowerCase()]; });

// ======================= UI & Rendering =======================
function drawArrow(x, y, rotation) {
    canvas.ctx.save();
    canvas.ctx.beginPath();
    canvas.ctx.arc(x, y, HITBOX_RADIUS, 0, Math.PI * 2);
    canvas.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    canvas.ctx.fill();
    canvas.ctx.restore();
    const drawShape = (offsetX, offsetY, color) => {
        canvas.ctx.save();
        canvas.ctx.translate(x + offsetX, y + offsetY);
        canvas.ctx.rotate(rotation);
        canvas.ctx.fillStyle = color;

        canvas.ctx.beginPath();
        canvas.ctx.moveTo(-5, 15);
        canvas.ctx.lineTo(5, 15);
        canvas.ctx.lineTo(5, 0);
        canvas.ctx.lineTo(12, 0);
        canvas.ctx.lineTo(0, -15);
        canvas.ctx.lineTo(-12, 0);
        canvas.ctx.lineTo(-5, 0);
        canvas.ctx.closePath();

        canvas.ctx.fill();
        canvas.ctx.restore();
    };
    drawShape(1, 1, "black");
    drawShape(0, 0, "white");
}

function render() {
    const room = house[currentPointName];
    let img;

    canvas.ctx.fillStyle = "black";
    canvas.ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (room.isPath) {
        // Rendering a path position
        img = room.pathPhotos[currentPathPosition];
    } else {
        // Rendering a turnable room
        img = room.directionPhotos[currentPointDirection];
    }

    if (img && img.complete && img.naturalWidth !== 0) {
        canvas.ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    }

    const bx = canvas.centerX, by = canvas.height - 50, sp = 40;

    if (room.isPath) {
        // Only show forward/back arrows for paths
        const canGoForward = currentPathPosition < room.pathPhotos.length - 1;
        const canGoBack = currentPathPosition > 0 || history.length > 0;

        if (canGoForward) drawArrow(bx, by - sp, 0); // Forward
        if (canGoBack) drawArrow(bx, by + sp, Math.PI); // Back

        // Show ending pointer arrow if at end of path
        if (currentPathPosition === room.pathPhotos.length - 1 && room.endingPointer) {
            drawArrow(bx, by - sp, 0);
        }
    } else {
        // Show all navigation arrows for turnable rooms
        drawArrow(bx - sp, by, -Math.PI / 2); // Left
        drawArrow(bx + sp, by, Math.PI / 2); // Right
        if (room.pointers[currentPointDirection]) drawArrow(bx, by - sp, 0); // Forward
        if (history.length > 0) drawArrow(bx, by + sp, Math.PI); // Back
    }

    // canvas.ctx.fillStyle = "white";
    // canvas.ctx.font = "50px Monospace";
    // canvas.ctx.textBaseline = "top";
    // canvas.ctx.textAlign = "left";
    // canvas.ctx.fillText(currentPointDirection + " " + currentPointName, 0, 0);
}

// ======================= Main Loop =======================
function runFrame() {
    const bx = canvas.centerX, by = canvas.height - 50, sp = 40;
    if (mouse.isPressed && !mouseWasPressed) {
        const checkClick = (targetX, targetY, key) => {
            const dist = Math.sqrt((mouse.x - targetX) ** 2 + (mouse.y - targetY) ** 2);
            if (dist < HITBOX_RADIUS) {
                currentlyHeldKeys[key] = true;
            }
        };
        const room = house[currentPointName];
        if (room.isPath) {
            checkClick(bx, by - sp, "w");
            checkClick(bx, by + sp, "s");
        } else {
            checkClick(bx - sp, by, "a");
            checkClick(bx + sp, by, "d");
            checkClick(bx, by - sp, "w");
            checkClick(bx, by + sp, "s");
        }
    }
    mouseWasPressed = mouse.isPressed;

    const room = house[currentPointName];

    if (room.isPath) {
        // Handle path navigation
        if (currentlyHeldKeys["w"]) {
            delete currentlyHeldKeys["w"];

            if (currentPathPosition < room.pathPhotos.length - 1) {
                // Move forward along the path
                currentPathPosition++;
            } else if (room.endingPointer) {
                // Reached the end - transition to ending point
                history.push({
                    name: currentPointName,
                    direction: currentPointDirection,
                    pathPosition: currentPathPosition,
                    isPath: true
                });
                currentPointName = room.endingPointer;
                currentPointDirection = house[currentPointName].defaultDirection;
                currentPathPosition = 0;
            }
        } else if (currentlyHeldKeys["s"]) {
            delete currentlyHeldKeys["s"];

            if (currentPathPosition > 0) {
                // Move back along the path
                currentPathPosition--;
            } else if (history.length > 0) {
                // At start of path - go back to previous location
                const last = history.pop();
                currentPointName = last.name;
                currentPathPosition = last.pathPosition || 0;

                if (last.isPath) {
                    // Previous location was also a path
                    currentPointDirection = 0;
                } else {
                    // Previous location was a turnable room
                    const targetRoom = house[currentPointName];
                    currentPointDirection = Math.min(last.direction, targetRoom.directionPhotos.length - 1);
                }
            }
        }
    } else {
        // Handle turnable room navigation
        const dirCount = room.directionPhotos.length;

        if (currentlyHeldKeys["a"]) {
            delete currentlyHeldKeys["a"];
            currentPointDirection = (currentPointDirection - 1 + dirCount) % dirCount;
        } else if (currentlyHeldKeys["d"]) {
            delete currentlyHeldKeys["d"];
            currentPointDirection = (currentPointDirection + 1) % dirCount;
        } else if (currentlyHeldKeys["w"]) {
            delete currentlyHeldKeys["w"];
            const next = room.pointers[currentPointDirection];
            if (next) {
                history.push({
                    name: currentPointName,
                    direction: currentPointDirection,
                    pathPosition: 0,
                    isPath: false
                });
                currentPointName = next;

                const nextRoom = house[currentPointName];
                if (nextRoom.isPath) {
                    currentPathPosition = 0;
                } else {
                    currentPointDirection = nextRoom.defaultDirection;
                }
            }
        } else if (currentlyHeldKeys["s"]) {
            delete currentlyHeldKeys["s"];
            if (history.length > 0) {
                const last = history.pop();
                currentPointName = last.name;
                currentPathPosition = last.pathPosition || 0;

                if (last.isPath) {
                    currentPointDirection = 0;
                } else {
                    currentPointDirection = Math.min(last.direction, house[currentPointName].directionPhotos.length - 1);
                }
            }
        }
    }

    render();
    requestAnimationFrame(runFrame);
}

runFrame();