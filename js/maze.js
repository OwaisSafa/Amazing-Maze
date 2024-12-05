// Initialize game elements and state
let canvas, ctx, startMenu, gameContainer, mazeContainer, player;
let maze = null;
let currentCell = null;
let isMoving = false;
let currentDirection = null;
let trails = [];

// Game configuration
const difficultySettings = {
    easy: { moveSpeed: 4, trailLength: 45 },
    hard: { moveSpeed: 4, trailLength: 25 },
    extreme: { moveSpeed: 4, trailLength: 15 }
};

let selectedDifficulty = 'easy';
let gameConfig = {...difficultySettings.easy};
let isGlowEnabled = true;
let moveInterval = null;

// Add touch control variables
let touchStartX = 0;
let touchStartY = 0;
const SWIPE_THRESHOLD = 50;

function initializeGame() {
    // Get DOM elements
    canvas = document.getElementById('mazeCanvas');
    ctx = canvas.getContext('2d');
    startMenu = document.getElementById('start-menu');
    gameContainer = document.getElementById('game-container');
    mazeContainer = document.getElementById('mazeContainer');
    player = document.getElementById('player');

    // Initialize glow toggle
    const glowToggle = document.getElementById('glowToggle');
    isGlowEnabled = true;
    glowToggle.classList.add('selected');

    // Update glow effect when toggle is clicked
    glowToggle.addEventListener('click', () => {
        isGlowEnabled = !isGlowEnabled;
        glowToggle.textContent = `Glow: ${isGlowEnabled ? 'ON' : 'OFF'}`;
        glowToggle.classList.toggle('selected', isGlowEnabled);
        
        // Update maze appearance
        updateMazeAppearance();
    });

    // Add event listeners for keyboard and window resize
    document.addEventListener('keydown', handleKeyPress);
    window.addEventListener('resize', handleResize);
    
    // Initialize touch controls
    initializeTouchControls();
    
    // Add other event listeners
    document.getElementById('startBtn').addEventListener('click', startGame);
    document.getElementById('exitBtn').addEventListener('click', exitGame);
    document.getElementById('guideBtn').addEventListener('click', showGuide);
    
    // Set up difficulty buttons
    const difficultyBtns = document.querySelectorAll('.difficulty-btn');
    difficultyBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all buttons
            difficultyBtns.forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            btn.classList.add('active');
            // Set difficulty
            const difficulty = btn.id.replace('Btn', '').toLowerCase();
            selectedDifficulty = difficulty;
            gameConfig = {...difficultySettings[difficulty]};
        });
    });

    // Initialize maze size display
    const mazeSizeInput = document.getElementById('mazeSize');
    const mazeSizeValue = document.getElementById('mazeSizeValue');
    mazeSizeInput.addEventListener('input', () => {
        mazeSizeValue.textContent = mazeSizeInput.value;
    });

    // Set initial difficulty
    const easyBtn = document.getElementById('easyBtn');
    if (easyBtn) {
        easyBtn.classList.add('active');
        selectedDifficulty = 'easy';
        gameConfig = {...difficultySettings.easy};
    }

    // Hide game container initially
    if (gameContainer) {
        gameContainer.style.display = 'none';
    }

    // Add resize observer
    const resizeObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
            if (entry.target === mazeContainer) {
                handleResize();
                break;
            }
        }
    });
    resizeObserver.observe(mazeContainer);

    // Initial resize
    handleResize();
}

function updateMazeAppearance() {
    document.body.classList.toggle('no-glow', !isGlowEnabled);
    
    // Update player glow
    if (player) {
        player.style.boxShadow = isGlowEnabled ? '0 0 20px #00c3ff' : 'none';
    }
    
    // Update all trails
    document.querySelectorAll('.trail').forEach(trail => {
        trail.style.boxShadow = isGlowEnabled ? '0 0 10px #00c3ff' : 'none';
        trail.style.opacity = isGlowEnabled ? '1' : '0.5';
    });
    
    // Update buttons
    document.querySelectorAll('.control-btn, .touch-btn, .difficulty-btn').forEach(btn => {
        btn.style.boxShadow = isGlowEnabled ? '0 0 10px rgba(0, 195, 255, 0.5)' : 'none';
    });
    
    // Update canvas
    if (maze) {
        maze.draw();
    }
}

function initializeTouchControls() {
    // Touch buttons
    const touchButtons = {
        'upBtn': { dx: 0, dy: -1 },
        'rightBtn': { dx: 1, dy: 0 },
        'downBtn': { dx: 0, dy: 1 },
        'leftBtn': { dx: -1, dy: 0 }
    };

    // Add touch button listeners
    Object.entries(touchButtons).forEach(([btnId, dir]) => {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                handleDirectionInput(dir);
            });
            
            // For testing on desktop
            btn.addEventListener('mousedown', (e) => {
                e.preventDefault();
                handleDirectionInput(dir);
            });
        }
    });

    // Stop button
    const stopBtn = document.getElementById('stopBtn');
    if (stopBtn) {
        stopBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            isMoving = false;
            currentDirection = null;
        });
        
        // For testing on desktop
        stopBtn.addEventListener('mousedown', (e) => {
            e.preventDefault();
            isMoving = false;
            currentDirection = null;
        });
    }

    // Swipe controls
    if (mazeContainer) {
        mazeContainer.addEventListener('touchstart', handleTouchStart, false);
        mazeContainer.addEventListener('touchmove', handleTouchMove, false);
    }
}

function handleTouchStart(e) {
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
}

function handleTouchMove(e) {
    if (!touchStartX || !touchStartY) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartX;
    const deltaY = touch.clientY - touchStartY;

    if (Math.abs(deltaX) > SWIPE_THRESHOLD || Math.abs(deltaY) > SWIPE_THRESHOLD) {
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            // Horizontal swipe
            handleDirectionInput({ dx: deltaX > 0 ? 1 : -1, dy: 0 });
        } else {
            // Vertical swipe
            handleDirectionInput({ dx: 0, dy: deltaY > 0 ? 1 : -1 });
        }
        
        // Reset touch start
        touchStartX = null;
        touchStartY = null;
    }
}

function handleDirectionInput(dir) {
    if (!maze) return;
    
    currentDirection = dir;
    
    if (!isMoving) {
        isMoving = true;
        if (moveInterval) {
            clearInterval(moveInterval);
        }
        moveInterval = setInterval(movePlayer, 250);
        movePlayer();
    }
}

function startGame() {
    const size = parseInt(document.getElementById('mazeSize').value);
    
    // Set canvas size based on window size
    const minDimension = Math.min(window.innerWidth, window.innerHeight) * 0.8;
    canvas.width = minDimension;
    canvas.height = minDimension;
    
    // Initialize maze
    maze = new Maze(size);
    maze.generate();
    
    // Set starting position to top-left corner
    currentCell = maze.grid[0][0];
    
    // Reset game state
    isMoving = false;
    currentDirection = null;
    trails = [];
    
    // Hide menu and show game
    startMenu.style.display = 'none';
    gameContainer.style.display = 'flex';
    
    // Position player at start and set size
    const cellSize = canvas.width / maze.size;
    const playerSize = Math.max(Math.min(cellSize * 0.6, 20), 8); // 60% of cell size, min 8px, max 20px
    
    if (player) {
        player.style.width = `${playerSize}px`;
        player.style.height = `${playerSize}px`;
        player.style.left = `${cellSize / 2}px`;
        player.style.top = `${cellSize / 2}px`;
    }
    
    // Draw initial maze state
    maze.draw();
    
    // Start background music
    try {
        if (window.soundManager) {
            window.soundManager.startBackgroundMusic();
        }
    } catch (e) {
        console.log('Sound error:', e);
    }
}

function handleResize() {
    if (!canvas || !mazeContainer) return;

    // Get the container dimensions
    const containerRect = mazeContainer.getBoundingClientRect();
    const size = Math.min(containerRect.width, containerRect.height);
    
    // Set canvas size
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    canvas.width = size;
    canvas.height = size;
    
    // Redraw maze if it exists
    if (maze) {
        maze.draw();
    }
    
    // Update player position and size if it exists
    if (player && currentCell && maze) {
        const cellSize = size / maze.size;
        const playerSize = Math.max(Math.min(cellSize * 0.4, 18), 10);
        const x = Math.round((currentCell.x * cellSize) + (cellSize / 2));
        const y = Math.round((currentCell.y * cellSize) + (cellSize / 2));
        
        player.style.width = `${playerSize}px`;
        player.style.height = `${playerSize}px`;
        player.style.left = `${x}px`;
        player.style.top = `${y}px`;
        
        document.documentElement.style.setProperty('--trail-size', `${playerSize * 0.33}px`);
    }
}

function handleKeyPress(e) {
    if (!maze || isMoving) return;
    
    let dir;
    switch(e.key) {
        case 'ArrowLeft':
            dir = { dx: -1, dy: 0 };
            break;
        case 'ArrowUp':
            dir = { dx: 0, dy: -1 };
            break;
        case 'ArrowRight':
            dir = { dx: 1, dy: 0 };
            break;
        case 'ArrowDown':
            dir = { dx: 0, dy: 1 };
            break;
        case ' ': // Space to stop movement
            isMoving = false;
            currentDirection = null;
            return;
        default:
            return;
    }
    
    handleDirectionInput(dir);
}

function movePlayer() {
    if (!currentDirection || !maze || !isMoving) {
        if (moveInterval) {
            clearInterval(moveInterval);
            moveInterval = null;
        }
        return;
    }
    
    const newX = currentCell.x + currentDirection.dx;
    const newY = currentCell.y + currentDirection.dy;
    
    if (maze.canMove(currentCell.x, currentCell.y, newX, newY)) {
        // Get current position before moving
        const containerRect = mazeContainer.getBoundingClientRect();
        const size = Math.min(containerRect.width, containerRect.height);
        const cellSize = size / maze.size;
        
        // Calculate exact pixel positions
        const currentX = Math.round((currentCell.x * cellSize) + (cellSize / 2));
        const currentY = Math.round((currentCell.y * cellSize) + (cellSize / 2));
        
        // Add trail at current position before moving
        if (player) {
            addTrail(currentX, currentY);
        }
        
        // Update current cell position
        currentCell = maze.grid[newY][newX];
        
        // Calculate new position with exact pixels
        const trailX = Math.round((currentCell.x * cellSize) + (cellSize / 2));
        const trailY = Math.round((currentCell.y * cellSize) + (cellSize / 2));
        
        if (player) {
            player.style.left = `${trailX}px`;
            player.style.top = `${trailY}px`;
        }
        
        // Play move sound
        try {
            if (window.soundManager) {
                window.soundManager.play('move').catch(e => console.log('Sound error:', e));
            }
        } catch (e) {
            console.log('Sound error:', e);
        }
        
        // Check for victory
        if (currentCell.x === maze.size - 1 && currentCell.y === maze.size - 1) {
            setTimeout(() => {
                showVictoryScreen();
            }, 300);
            return;
        }

        // Check for turns and next moves
        const directions = [
            { dx: 1, dy: 0 },   // right
            { dx: -1, dy: 0 },  // left
            { dx: 0, dy: 1 },   // down
            { dx: 0, dy: -1 }   // up
        ];

        // Count available paths
        let availablePaths = 0;
        directions.forEach(dir => {
            const checkX = currentCell.x + dir.dx;
            const checkY = currentCell.y + dir.dy;
            if (maze.canMove(currentCell.x, currentCell.y, checkX, checkY)) {
                availablePaths++;
            }
        });

        // Stop at intersections (more than 2 paths) or dead ends (1 path including where we came from)
        if (availablePaths > 2 || availablePaths === 1) {
            isMoving = false;
            currentDirection = null;
            if (moveInterval) {
                clearInterval(moveInterval);
                moveInterval = null;
            }
            return;
        }

        // Check if we can continue in current direction
        const nextX = currentCell.x + currentDirection.dx;
        const nextY = currentCell.y + currentDirection.dy;
        
        if (!maze.canMove(currentCell.x, currentCell.y, nextX, nextY)) {
            // If we can't continue straight, look for a turn
            const possibleTurns = [
                { dx: currentDirection.dy, dy: currentDirection.dx },    // right turn
                { dx: -currentDirection.dy, dy: -currentDirection.dx }   // left turn
            ];

            let foundTurn = false;
            for (const turn of possibleTurns) {
                const turnX = currentCell.x + turn.dx;
                const turnY = currentCell.y + turn.dy;
                if (maze.canMove(currentCell.x, currentCell.y, turnX, turnY)) {
                    currentDirection = turn;
                    foundTurn = true;
                    break;
                }
            }

            if (!foundTurn) {
                isMoving = false;
                currentDirection = null;
                if (moveInterval) {
                    clearInterval(moveInterval);
                    moveInterval = null;
                }
                return;
            }
        }

        // Continue movement
        if (isMoving) {
            // requestAnimationFrame(movePlayer);
        }
    } else {
        // Play wall hit sound
        try {
            if (window.soundManager) {
                window.soundManager.play('wall').catch(e => console.log('Sound error:', e));
            }
        } catch (e) {
            console.log('Sound error:', e);
        }
        isMoving = false;
        currentDirection = null;
        if (moveInterval) {
            clearInterval(moveInterval);
            moveInterval = null;
        }
    }
}

function exitGame() {
    const gameContainer = document.getElementById('game-container');
    const startMenu = document.getElementById('start-menu');
    const victoryScreen = document.getElementById('victory-screen');
    
    if (victoryScreen) {
        victoryScreen.style.display = 'none';
    }
    if (gameContainer) {
        gameContainer.style.display = 'none';
    }
    if (startMenu) {
        startMenu.style.display = 'flex';
    }
    
    clearTrails();
    resetGame();
}

function showVictoryScreen() {
    const victoryScreen = document.getElementById('victory-screen');
    if (victoryScreen) {
        victoryScreen.style.display = 'flex';
        const playAgainBtn = document.getElementById('playAgainBtn');
        if (playAgainBtn) {
            playAgainBtn.onclick = () => {
                victoryScreen.style.display = 'none';
                exitGame();
            };
        }
    }
    isMoving = false;
    currentDirection = null;
}

function resetGame() {
    const victoryScreen = document.getElementById('victory-screen');
    if (victoryScreen) {
        victoryScreen.style.display = 'none';
    }
    
    isMoving = false;
    currentDirection = null;
    clearTrails();
    initializeMaze();
}

function addTrail(x, y) {
    const trail = document.createElement('div');
    trail.className = 'trail';
    trail.style.left = x + 'px';
    trail.style.top = y + 'px';
    mazeContainer.appendChild(trail);
    
    setTimeout(() => {
        if (trail.parentNode) {
            trail.parentNode.removeChild(trail);
        }
    }, 700);
    
    trails.push(trail);
    while (trails.length > gameConfig.trailLength) {
        const oldTrail = trails.shift();
        if (oldTrail && oldTrail.parentNode) {
            oldTrail.parentNode.removeChild(oldTrail);
        }
    }
}

function clearTrails() {
    const trails = document.querySelectorAll('.trail');
    trails.forEach(trail => trail.remove());
}

function updateBallPosition() {
    const playerElement = document.getElementById('player');
    if (!playerElement || !maze) return;
    
    const cellSize = maze.size;
    const xPos = (player.x * cellSize) + (cellSize / 2);
    const yPos = (player.y * cellSize) + (cellSize / 2);
    
    // Update CSS variables for animations
    playerElement.style.setProperty('--x', `${xPos}px`);
    playerElement.style.setProperty('--y', `${yPos}px`);
    playerElement.style.transform = `translate(${xPos}px, ${yPos}px)`;
}

function getCellCenter(cell) {
    const cellSize = maze.size;
    return {
        x: cell.x * cellSize + cellSize / 2,
        y: cell.y * cellSize + cellSize / 2
    };
}

function findPathToEnd(startCell) {
    if (!maze || !maze.grid) return null;
    
    const endCell = maze.grid[maze.size - 1][maze.size - 1];
    const visited = new Set();
    const queue = [[startCell]];
    
    while (queue.length > 0) {
        const path = queue.shift();
        const cell = path[path.length - 1];
        
        if (cell === endCell) {
            return path;
        }
        
        const cellKey = `${cell.x},${cell.y}`;
        if (!visited.has(cellKey)) {
            visited.add(cellKey);
            
            // Get valid neighbors using maze's canMove method
            const neighbors = [];
            
            // Check all possible directions
            const directions = [
                {x: 0, y: -1}, // top
                {x: 1, y: 0},  // right
                {x: 0, y: 1},  // bottom
                {x: -1, y: 0}  // left
            ];
            
            for (const dir of directions) {
                const newX = cell.x + dir.x;
                const newY = cell.y + dir.y;
                
                if (maze.isValidCell(newX, newY) && maze.canMove(cell.x, cell.y, newX, newY)) {
                    neighbors.push(maze.grid[newY][newX]);
                }
            }
            
            for (const neighbor of neighbors) {
                if (!visited.has(`${neighbor.x},${neighbor.y}`)) {
                    queue.push([...path, neighbor]);
                }
            }
        }
    }
    
    return null;
}

function showGuide() {
    if (!maze || !currentCell) return;
    
    // Play guide sound
    try {
        if (window.soundManager) {
            window.soundManager.play('guide').catch(e => console.log('Sound error:', e));
        }
    } catch (e) {
        console.log('Sound error:', e);
    }
    
    // Store current state
    const originalFillStyle = ctx.fillStyle;
    const originalLineWidth = ctx.lineWidth;
    
    // Set guide style
    ctx.strokeStyle = '#00c3ff';
    ctx.lineWidth = 6;
    ctx.shadowColor = '#00c3ff';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    
    // Find path to end
    let path = findPathToEnd(currentCell);
    
    if (path && path.length > 0) {
        // Draw the path with glow effect
        const containerRect = mazeContainer.getBoundingClientRect();
        const size = Math.min(containerRect.width, containerRect.height);
        const cellSize = size / maze.size;
        
        ctx.beginPath();
        ctx.moveTo(
            path[0].x * cellSize + cellSize / 2,
            path[0].y * cellSize + cellSize / 2
        );
        
        for (let i = 1; i < path.length; i++) {
            ctx.lineTo(
                path[i].x * cellSize + cellSize / 2,
                path[i].y * cellSize + cellSize / 2
            );
        }
        
        // Create glowing effect
        ctx.strokeStyle = '#00c3ff';
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
        
        // Add extra glow
        ctx.strokeStyle = 'rgba(0, 195, 255, 0.5)';
        ctx.lineWidth = 12;
        ctx.stroke();
        
        // Restore original context
        ctx.shadowBlur = 0;
        ctx.strokeStyle = originalFillStyle;
        ctx.lineWidth = originalLineWidth;
        
        // Remove guide after delay
        setTimeout(() => {
            maze.draw();
        }, 800);
    }
}

class Cell {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.walls = {
            top: true,
            right: true,
            bottom: true,
            left: true
        };
        this.visited = false;
    }
}

class Maze {
    constructor(size) {
        this.size = size;
        this.grid = [];
        this.cellSize = 0;
        this.init();
    }

    init() {
        // Initialize cells
        for (let y = 0; y < this.size; y++) {
            this.grid[y] = [];
            for (let x = 0; x < this.size; x++) {
                this.grid[y][x] = new Cell(x, y);
            }
        }
    }

    generate() {
        const stack = [];
        let current = this.grid[0][0];
        current.visited = true;

        do {
            const neighbors = this.getUnvisitedNeighbors(current);
            
            if (neighbors.length > 0) {
                const next = neighbors[Math.floor(Math.random() * neighbors.length)];
                stack.push(current);
                this.removeWalls(current, next);
                current = next;
                current.visited = true;
            } else if (stack.length > 0) {
                current = stack.pop();
            }
        } while (stack.length > 0);

        // Reset visited flags
        for (let y = 0; y < this.size; y++) {
            for (let x = 0; x < this.size; x++) {
                this.grid[y][x].visited = false;
            }
        }
    }

    getUnvisitedNeighbors(cell) {
        const neighbors = [];
        const directions = [
            { x: 0, y: -1 }, // top
            { x: 1, y: 0 },  // right
            { x: 0, y: 1 },  // bottom
            { x: -1, y: 0 }  // left
        ];

        for (const dir of directions) {
            const newX = cell.x + dir.x;
            const newY = cell.y + dir.y;

            if (this.isValidCell(newX, newY) && !this.grid[newY][newX].visited) {
                neighbors.push(this.grid[newY][newX]);
            }
        }

        return neighbors;
    }

    getAccessibleNeighbors(cell) {
        const neighbors = [];
        const possibleNeighbors = [
            {x: cell.x, y: cell.y - 1}, // top
            {x: cell.x + 1, y: cell.y}, // right
            {x: cell.x, y: cell.y + 1}, // bottom
            {x: cell.x - 1, y: cell.y}  // left
        ];

        for (let neighbor of possibleNeighbors) {
            if (this.isValidCell(neighbor.x, neighbor.y) && 
                this.canMove(cell.x, cell.y, neighbor.x, neighbor.y)) {
                neighbors.push(this.grid[neighbor.y][neighbor.x]);
            }
        }

        return neighbors;
    }

    removeWalls(current, next) {
        const dx = next.x - current.x;
        const dy = next.y - current.y;

        if (dx === 1) { // Remove right wall of current and left wall of next
            current.walls.right = false;
            next.walls.left = false;
        } else if (dx === -1) { // Remove left wall of current and right wall of next
            current.walls.left = false;
            next.walls.right = false;
        }

        if (dy === 1) { // Remove bottom wall of current and top wall of next
            current.walls.bottom = false;
            next.walls.top = false;
        } else if (dy === -1) { // Remove top wall of current and bottom wall of next
            current.walls.top = false;
            next.walls.bottom = false;
        }
    }

    isValidCell(x, y) {
        return x >= 0 && x < this.size && y >= 0 && y < this.size;
    }

    canMove(fromX, fromY, toX, toY) {
        if (!this.isValidCell(toX, toY)) return false;

        const current = this.grid[fromY][fromX];
        const next = this.grid[toY][toX];

        // Check if there's a wall between cells
        if (toX > fromX) return !current.walls.right && !next.walls.left;
        if (toX < fromX) return !current.walls.left && !next.walls.right;
        if (toY > fromY) return !current.walls.bottom && !next.walls.top;
        if (toY < fromY) return !current.walls.top && !next.walls.bottom;

        return false;
    }

    draw() {
        if (!canvas || !ctx) return;
        
        // Get exact container dimensions
        const containerRect = mazeContainer.getBoundingClientRect();
        const size = Math.min(containerRect.width, containerRect.height);
        const cellSize = size / this.size;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw cells with exact pixel positions
        for (let y = 0; y < this.size; y++) {
            for (let x = 0; x < this.size; x++) {
                const cell = this.grid[y][x];
                const startX = Math.round(x * cellSize);
                const startY = Math.round(y * cellSize);
                
                ctx.strokeStyle = '#00c3ff';
                ctx.lineWidth = 2;
                ctx.shadowColor = '#00c3ff';
                ctx.shadowBlur = 2;
                
                if (cell.walls.top) {
                    ctx.beginPath();
                    ctx.moveTo(startX, startY);
                    ctx.lineTo(startX + cellSize, startY);
                    ctx.stroke();
                }
                if (cell.walls.right) {
                    ctx.beginPath();
                    ctx.moveTo(startX + cellSize, startY);
                    ctx.lineTo(startX + cellSize, startY + cellSize);
                    ctx.stroke();
                }
                if (cell.walls.bottom) {
                    ctx.beginPath();
                    ctx.moveTo(startX, startY + cellSize);
                    ctx.lineTo(startX + cellSize, startY + cellSize);
                    ctx.stroke();
                }
                if (cell.walls.left) {
                    ctx.beginPath();
                    ctx.moveTo(startX, startY);
                    ctx.lineTo(startX, startY + cellSize);
                    ctx.stroke();
                }
            }
        }
        
        // Draw end point with exact positioning
        const endX = Math.round((this.size - 1) * cellSize + cellSize / 2);
        const endY = Math.round((this.size - 1) * cellSize + cellSize / 2);
        
        ctx.shadowColor = '#00c3ff';
        ctx.shadowBlur = 15;
        ctx.fillStyle = '#00c3ff';
        
        ctx.beginPath();
        ctx.arc(endX, endY, cellSize / 4, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.shadowBlur = 0;
    }
}

function setDifficulty(difficulty) {
    // Update game config
    selectedDifficulty = difficulty;
    gameConfig = {...difficultySettings[difficulty]};
    
    // Update button states
    const difficultyBtns = document.querySelectorAll('.difficulty-btn');
    difficultyBtns.forEach(btn => {
        const btnDifficulty = btn.id.replace('Btn', '').toLowerCase();
        btn.classList.toggle('active', btnDifficulty === difficulty);
    });
}

// Add event listener for when the page loads
window.addEventListener('load', initializeGame);
