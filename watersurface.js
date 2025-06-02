const FORCE_MULTIPLIER = 0.15;
const FRICTION = 0.95; 
const SPEED_LIMIT = 5.0;

class WaterNode {
  constructor(x, y, pinned) {
    this.pos = { x, y };
    this.restPos = { x, y };
    this.vel = { x: 0, y: 0 };
    this.force = { x: 0, y: 0 };
    this.pinned = pinned;
    this.height = 0.0;
  }

  applyRestoringForce() {
    if (this.pinned) return;
    const restoringStrength = 0.02;
    this.force.x += (this.restPos.x - this.pos.x) * restoringStrength;
    this.force.y += (this.restPos.y - this.pos.y) * restoringStrength;
  }

  updateNode() {
    if (this.pinned) return;
    const FORCE_MULTIPLIER = 0.25;
    const FRICTION = 0.99;
    const SPEED_LIMIT = 8.0;

    this.vel.x += this.force.x * FORCE_MULTIPLIER;
    this.vel.y += this.force.y * FORCE_MULTIPLIER;

    const speed = Math.hypot(this.vel.x, this.vel.y);
    if (speed > SPEED_LIMIT) {
      const scale = SPEED_LIMIT / speed;
      this.vel.x *= scale;
      this.vel.y *= scale;
    }

    this.pos.x += this.vel.x;
    this.pos.y += this.vel.y;

    this.force.x = 0;
    this.force.y = 0;

    this.vel.x *= FRICTION;
    this.vel.y *= FRICTION;

    this.height = Math.hypot(this.pos.x - this.restPos.x, this.pos.y - this.restPos.y);
  }
}

class WaterLink {
  constructor(node1, node2) {
    this.node1 = node1;
    this.node2 = node2;
  }

  updateLink() {
    const dx = this.node2.pos.x - this.node1.pos.x;
    const dy = this.node2.pos.y - this.node1.pos.y;
    if (!this.node1.pinned) {
      this.node1.force.x += dx;
      this.node1.force.y += dy;
    }
    if (!this.node2.pinned) {
      this.node2.force.x -= dx;
      this.node2.force.y -= dy;
    }
  }
}

const canvas = document.getElementById('water-surface');
const ctx = canvas.getContext('2d');

const GRID_SIZE = 40

let nodes = [];
let links = [];
let gridCountX, gridCountY;

const KNIFE_RANGE = 8;
const brokenLinks = [];
const RECOVER_TIME_MS = 150;

let mousePos = { x: 0, y: 0 };

function setupGrid(){
    const sizeX = canvas.width;
    const sizeY = canvas.height
    
    gridCountX = sizeX / GRID_SIZE
    gridCountY = sizeY / GRID_SIZE

    for (let i=0; i<=gridCountY; i++){
        for(let j=0; j<=gridCountX; j++){
            const x = (j / gridCountX) * sizeX;
            const y = (i / gridCountY) * sizeY;
            const pinned = (i == 0 || j == 0 || i == gridCountY || j == gridCountX);
            nodes.push(new WaterNode(x, y, pinned));
        }
    }

    for (let i = 0; i <= gridCountY; i++) {
        for (let j = 0; j <= gridCountX; j++) {
        const index = i * (gridCountX + 1) + j;
        const current = nodes[index];

            if (j < gridCountX) {
                const right = nodes[index + 1];
                if (!(current.pinned && right.pinned)) {
                links.push(new WaterLink(current, right));
                }
            }

            if (i < gridCountY) {
                const bottom = nodes[index + (gridCountX + 1)];
                if (!(current.pinned && bottom.pinned)) {
                links.push(new WaterLink(current, bottom));
                }
            }
        }
    }
}

function cutLink(link) {
    links.splice(links.indexOf(link), 1);  // 从 links 中移除
    brokenLinks.push({
        link: link,
        brokenTime: Date.now()
    });
}

function checkCutLinks(mousePos) {
    for (const link of [...links]) {
        const midX = (link.node1.pos.x + link.node2.pos.x) / 2;
        const midY = (link.node1.pos.y + link.node2.pos.y) / 2;

        const dx = mousePos.x - midX;
        const dy = mousePos.y - midY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < KNIFE_RANGE) {
            cutLink(link);
        }
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#484955';
    ctx.lineWidth = 0.5;

    ctx.beginPath();
    for (const link of links) {
        ctx.moveTo(link.node1.pos.x, link.node1.pos.y);
        ctx.lineTo(link.node2.pos.x, link.node2.pos.y);
    }
    ctx.stroke();
    
    const squareSize = 2;
    ctx.fillStyle = '#484955';
    for (const node of nodes) {
        const x = node.pos.x - squareSize / 2;
        const y = node.pos.y - squareSize / 2;
        ctx.fillRect(x, y, squareSize, squareSize);
    }
}

function animate() {
    update();
    draw();
    requestAnimationFrame(animate);
}


function updatelinks(){
    for (const link of links) {
        link.updateLink(); 
    }
}

function updatenodes(){
    for (const node of nodes) {
        node.applyRestoringForce(); 
        node.updateNode(); 
    }
}

function handleLinkRecovery() {
    const now = Date.now();
    for (const broken of [...brokenLinks]) {
        if (now - broken.brokenTime > RECOVER_TIME_MS) {
            links.push(broken.link);
            brokenLinks.splice(brokenLinks.indexOf(broken), 1);
        }
    }
}

function update() {
    updatelinks();
    updatenodes();
    handleLinkRecovery();
}


canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mousePos = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    };
    checkCutLinks(mousePos);
    
});


setupGrid();
animate();