class PuzzleGame {
    constructor() {
        this.gridSize = 4;
        this.tiles = [];
        this.correctOrder = [];
        this.currentOrder = [];
        this.moves = 0;
        this.startTime = null;
        this.timerInterval = null;
        this.gameStarted = false;
        this.currentImage = null;
        
        // Default image (using a data URL for a simple pattern)
        this.defaultImage = this.createDefaultImage();
        
        this.init();
    }

    createDefaultImage() {
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 400;
        const ctx = canvas.getContext('2d');
        
        // Create a colorful pattern
        const gradient = ctx.createLinearGradient(0, 0, 400, 400);
        gradient.addColorStop(0, '#ff6b6b');
        gradient.addColorStop(0.25, '#4ecdc4');
        gradient.addColorStop(0.5, '#45b7d1');
        gradient.addColorStop(0.75, '#96ceb4');
        gradient.addColorStop(1, '#ffeaa7');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 400, 400);
        
        // Add some geometric shapes
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        for (let i = 0; i < 8; i++) {
            ctx.beginPath();
            ctx.arc(Math.random() * 400, Math.random() * 400, Math.random() * 50 + 20, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Add some text
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('PUZZLE', 200, 180);
        ctx.fillText('GAME', 200, 240);
        
        return canvas.toDataURL();
    }

    init() {
        this.setupEventListeners();
        this.loadImage(this.defaultImage);
    }

    setupEventListeners() {
        // Difficulty buttons
        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.gridSize = parseInt(e.target.dataset.size);
                if (this.currentImage) {
                    this.createPuzzle();
                }
            });
        });

        // File upload
        document.getElementById('imageUpload').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    this.loadImage(e.target.result);
                };
                reader.readAsDataURL(file);
            }
        });

        // Game buttons
        document.getElementById('startBtn').addEventListener('click', () => this.startGame());
        document.getElementById('shuffleBtn').addEventListener('click', () => this.shuffleTiles());
        document.getElementById('resetBtn').addEventListener('click', () => this.resetGame());
        document.getElementById('playAgainBtn').addEventListener('click', () => this.closeSuccessModal());

        // Modal close
        document.getElementById('successModal').addEventListener('click', (e) => {
            if (e.target.id === 'successModal') {
                this.closeSuccessModal();
            }
        });
    }

    loadImage(imageSrc) {
        this.showLoading(true);
        
        const img = new Image();
        img.onload = () => {
            this.currentImage = imageSrc;
            document.getElementById('originalImage').src = imageSrc;
            document.getElementById('originalImage').style.display = 'block';
            this.createPuzzle();
            this.showLoading(false);
        };
        img.onerror = () => {
            alert('Failed to load image. Please try another image.');
            this.showLoading(false);
        };
        img.src = imageSrc;
    }

    showLoading(show) {
        document.querySelector('.loading').style.display = show ? 'block' : 'none';
    }

    createPuzzle() {
        const puzzleGrid = document.getElementById('puzzleGrid');
        puzzleGrid.innerHTML = '';
        puzzleGrid.style.gridTemplateColumns = `repeat(${this.gridSize}, 1fr)`;
        
        const tileSize = Math.max(60, Math.min(100, 400 / this.gridSize));
        
        this.tiles = [];
        this.correctOrder = [];
        this.currentOrder = [];

        for (let i = 0; i < this.gridSize * this.gridSize; i++) {
            const tile = document.createElement('div');
            tile.className = 'puzzle-tile';
            tile.draggable = true;
            tile.dataset.index = i;
            
            const row = Math.floor(i / this.gridSize);
            const col = i % this.gridSize;
            
            tile.style.width = `${tileSize}px`;
            tile.style.height = `${tileSize}px`;
            tile.style.backgroundImage = `url(${this.currentImage})`;
            tile.style.backgroundSize = `${tileSize * this.gridSize}px ${tileSize * this.gridSize}px`;
            tile.style.backgroundPosition = `-${col * tileSize}px -${row * tileSize}px`;
            
            this.setupTileDragAndDrop(tile);
            
            puzzleGrid.appendChild(tile);
            this.tiles.push(tile);
            this.correctOrder.push(i);
            this.currentOrder.push(i);
        }

        this.resetGame();
    }

    setupTileDragAndDrop(tile) {
        tile.addEventListener('dragstart', (e) => {
            if (!this.gameStarted) return;
            
            e.dataTransfer.setData('text/plain', tile.dataset.index);
            tile.classList.add('dragging');
        });

        tile.addEventListener('dragend', () => {
            tile.classList.remove('dragging');
            document.querySelectorAll('.drop-target').forEach(t => t.classList.remove('drop-target'));
        });

        tile.addEventListener('dragover', (e) => {
            if (!this.gameStarted) return;
            e.preventDefault();
            tile.classList.add('drop-target');
        });

        tile.addEventListener('dragleave', () => {
            tile.classList.remove('drop-target');
        });

        tile.addEventListener('drop', (e) => {
            if (!this.gameStarted) return;
            
            e.preventDefault();
            tile.classList.remove('drop-target');
            
            const draggedIndex = parseInt(e.dataTransfer.getData('text/plain'));
            const dropIndex = parseInt(tile.dataset.index);
            
            if (draggedIndex !== dropIndex) {
                this.swapTiles(draggedIndex, dropIndex);
                this.incrementMoves();
                this.checkWin();
            }
        });
    }

    swapTiles(index1, index2) {
        const tile1 = this.tiles[index1];
        const tile2 = this.tiles[index2];
        
        // Swap in current order array
        [this.currentOrder[index1], this.currentOrder[index2]] = [this.currentOrder[index2], this.currentOrder[index1]];
        
        // Swap visual positions
        const temp = tile1.style.backgroundPosition;
        tile1.style.backgroundPosition = tile2.style.backgroundPosition;
        tile2.style.backgroundPosition = temp;
    }

    shuffleTiles() {
        // Fisher-Yates shuffle
        for (let i = this.currentOrder.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            if (i !== j) {
                this.swapTiles(i, j);
            }
        }
    }

    startGame() {
        this.gameStarted = true;
        this.startTime = Date.now();
        this.moves = 0;
        this.updateMoveCount();
        this.startTimer();
        this.shuffleTiles();
        
        document.getElementById('startBtn').disabled = true;
        document.getElementById('shuffleBtn').disabled = false;
        document.getElementById('resetBtn').disabled = false;
    }

    resetGame() {
        this.gameStarted = false;
        this.moves = 0;
        this.updateMoveCount();
        this.stopTimer();
        
        // Reset to correct order
        this.currentOrder = [...this.correctOrder];
        this.tiles.forEach((tile, index) => {
            const row = Math.floor(index / this.gridSize);
            const col = index % this.gridSize;
            const tileSize = parseInt(tile.style.width);
            
            tile.style.backgroundPosition = `-${col * tileSize}px -${row * tileSize}px`;
        });
        
        document.getElementById('startBtn').disabled = false;
        document.getElementById('shuffleBtn').disabled = true;
        document.getElementById('resetBtn').disabled = true;
    }

    incrementMoves() {
        this.moves++;
        this.updateMoveCount();
    }

    updateMoveCount() {
        document.getElementById('moveCount').textContent = this.moves;
    }

    startTimer() {
        this.timerInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
            const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
            const seconds = (elapsed % 60).toString().padStart(2, '0');
            document.getElementById('timeCount').textContent = `${minutes}:${seconds}`;
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        document.getElementById('timeCount').textContent = '00:00';
    }

    checkWin() {
        const isWin = this.currentOrder.every((val, index) => val === this.correctOrder[index]);
        
        if (isWin) {
            this.gameStarted = false;
            this.stopTimer();
            this.showSuccessModal();
        }
    }

    showSuccessModal() {
        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
        const seconds = (elapsed % 60).toString().padStart(2, '0');
        
        document.getElementById('finalMoves').textContent = this.moves;
        document.getElementById('finalTime').textContent = `${minutes}:${seconds}`;
        document.getElementById('successModal').style.display = 'flex';
    }

    closeSuccessModal() {
        document.getElementById('successModal').style.display = 'none';
        this.resetGame();
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new PuzzleGame();
});