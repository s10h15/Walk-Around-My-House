// ======================= Configuration =======================
const houseConfig = {
    livingRoom: { defaultDir: 0, exits: { 0: "kitchen", 4: "corridor", 5: "sonRoom", 7: "momRoom" } },
    kitchen: { defaultDir: 0, exits: {} },
    momRoom: { defaultDir: 1, exits: {} },
    corridor: { defaultDir: 3, exits: { 1: "bathroom" } },
    sonRoom: { defaultDir: 2, exits: {} },
    bathroom: { defaultDir: 2, exits: {} },
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
            // Probe for images. Note: This will still show 404s in console 
            // but the logic handles the stopping point correctly.
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

        // Ensure pointers array is exactly the length of photos discovered
        const pointers = new Array(loadedPhotos.length).fill(null);
        for (const [dirIndex, destination] of Object.entries(settings.exits)) {
            const idx = parseInt(dirIndex);
            if (idx < loadedPhotos.length) {
                pointers[idx] = destination;
            }
        }

        house[roomName] = {
            directionPhotos: loadedPhotos,
            pointers: pointers,
            defaultDirection: settings.defaultDir
        };
    }
    return house;
}

const house = await buildHouse(houseConfig);
let currentPointName = "livingRoom";
let currentPointDirection = house["livingRoom"].defaultDirection;
let history = [];

// ======================= Canvas & Input =======================
const canvasElement = document.getElementById("canvasElement");
const ctx = canvasElement.getContext("2d");
const canvas = { width: canvasElement.width, height: canvasElement.height, centerX: canvasElement.width * 0.5 };

let currentlyHeldKeys = {};
window.addEventListener("keydown", e => { currentlyHeldKeys[e.key.toLowerCase()] = true; });
window.addEventListener("keyup", e => { delete currentlyHeldKeys[e.key.toLowerCase()]; });

// ======================= UI & Rendering =======================
function drawArrow(x, y, rotation) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rotation);
    ctx.fillStyle = "white"; ctx.beginPath();
    ctx.moveTo(-15, 10); ctx.lineTo(0, -15); ctx.lineTo(15, 10);
    ctx.fill(); ctx.restore();
}

function render() {
    const room = house[currentPointName];
    const img = room.directionPhotos[currentPointDirection];

    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (img && img.complete && img.naturalWidth !== 0) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    }

    const bx = canvas.centerX, by = canvas.height - 50, sp = 40;
    drawArrow(bx - sp, by, -Math.PI / 2);
    drawArrow(bx + sp, by, Math.PI / 2);
    if (room.pointers[currentPointDirection]) drawArrow(bx, by - sp, 0);
    if (history.length > 0) drawArrow(bx, by + sp, Math.PI);
}

// ======================= Main Loop =======================
function runFrame() {
    const room = house[currentPointName];
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
            history.push({ name: currentPointName, direction: currentPointDirection });
            currentPointName = next;
            currentPointDirection = house[currentPointName].defaultDirection;
        }
    } else if (currentlyHeldKeys["s"]) {
        delete currentlyHeldKeys["s"];
        if (history.length > 0) {
            const last = history.pop();
            currentPointName = last.name;
            currentPointDirection = Math.min(last.direction, house[currentPointName].directionPhotos.length - 1);
        }
    }

    render();
    requestAnimationFrame(runFrame);
}

runFrame();
