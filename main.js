// Load Assets

//SFX
const click = new Audio('assets/sfx/click3.ogg');
const bgm = new Audio('assets/bgm/Final_Encore.ogg');
const hurt = new Audio('assets/sfx/hurt.ogg');
const game_over = new Audio('assets/sfx/game_over.ogg');
const game_won = new Audio('assets/sfx/game_won.ogg');

// Game state variables
let currentPuzzle = null;
let originalPuzzle = null;
let selectedCell = null;
let selectedSymbol = null;
let gameStartTime = null;
let timerInterval = null;
let currentDifficulty = '';
let mistakeCount = 0;


// Symbol mappings (numbers 1-9 to symbols)
const SYMBOL_MAP = {
    1: '❤️', 2: '💧', 3: '🍏', 4: '🌞', 5: '🔮',
    6: '🔥', 7: '❄️', 8: '🐾', 9: '🕷️'
};

const NUMBER_MAP = {
    '❤️': 1, '💧': 2, '🍏': 3, '🌞': 4, '🔮': 5,
    '🔥': 6, '❄️': 7, '🐾': 8, '🕷️': 9
};

/**
 * Initialize the game when page loads  (Init)
 */
function initializeGame() {
    createSymbolsPanel();
    console.log('Game initialized successfully');
	if(window.musicOn){   // This is for music s
   		bgm.loop = true;
   		bgm.play();
	}
}

/**
 * Create the symbols selection panel
 */
function createSymbolsPanel() {
    const symbolsGrid = document.getElementById('symbolsGrid');
    symbolsGrid.innerHTML = '';

    for (let i = 1; i <= 9; i++) {
        const symbolBtn = document.createElement('div');
        symbolBtn.className = 'symbol-btn';
        symbolBtn.textContent = SYMBOL_MAP[i];
        symbolBtn.onclick = () => selectSymbol(SYMBOL_MAP[i]);
        symbolsGrid.appendChild(symbolBtn);
    }
}

/**
 * Generate a new Sudoku puzzle from Dosuku API
 */
async function generateNewPuzzle(difficulty) {
	
	 //Audio
	if(window.soundOn){
	   click.currentTime = 0;
       click.play();
    }
    
    
    showLoadingState();
    currentDifficulty = difficulty;
    document.getElementById('difficulty').textContent = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);

    try {
        const response = await fetch(`https://sudoku-api.vercel.app/api/dosuku?query={newboard(limit:1){grids{value,difficulty}}}`);
        const data = await response.json();
        
        if (data.newboard && data.newboard.grids && data.newboard.grids.length > 0) {
            const puzzle = data.newboard.grids[0].value;
            setupNewGame(puzzle);
        } else {
            console.error('ERROR: Invalid API response');
        }
    } catch (error) {
        console.error('Error: fetching puzzle:', error);
        // Fallback to a sample puzzle
        generateFallbackPuzzle();
    }
    
   

	//document.querySelector('.game-title').classList.remove('hidden')
	document.querySelector('.symbols-panel').classList.remove('hidden');
	document.querySelector('.status-panel').classList.remove('hidden');
	document.querySelector('.clearCell-panel').classList.remove('hidden');
	
}

/**
 * Setup a new game with the fetched puzzle
 */
function setupNewGame(puzzle) {
	document.querySelector('.game-controls').classList.add('hidden');
	document.querySelector('.game-title').classList.add('hidden');
	document.getElementById('sudokuGrid').classList.add('grid-active');
	
	
    currentPuzzle = puzzle.map(row => [...row]);
    originalPuzzle = puzzle.map(row => [...row]);
    
    renderSudokuGrid();
   // startTimer();   -- I think its unnessasry
    clearSelections();
    mistakeCount = 0;
    console.log('New game setup completed');
}

/**
 * Generate a fallback puzzle if API fails
 */
function generateFallbackPuzzle() {
    // Sample puzzle for fallback
    const samplePuzzle = [
        [5,3,0,0,7,0,0,0,0],
        [6,0,0,1,9,5,0,0,0],
        [0,9,8,0,0,0,0,6,0],
        [8,0,0,0,6,0,0,0,3],
        [4,0,0,8,0,3,0,0,1],
        [7,0,0,0,2,0,0,0,6],
        [0,6,0,0,0,0,2,8,0],
        [0,0,0,4,1,9,0,0,5],
        [0,0,0,0,8,0,0,7,9]
    ];
    setupNewGame(samplePuzzle);
    console.log('WARNING: Using fallback puzzle');
}

/**
 * Render the Sudoku grid in the DOM
 */
function renderSudokuGrid() {
    const grid = document.getElementById('sudokuGrid');
    grid.innerHTML = '';

    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = row;
            cell.dataset.col = col;
            
            const value = currentPuzzle[row][col];
            if (value !== 0) {
                cell.textContent = SYMBOL_MAP[value];
                if (originalPuzzle[row][col] !== 0) {
                    cell.classList.add('given');
                }
            }
            
            cell.onclick = () => selectCell(row, col);
            grid.appendChild(cell);
        }
    }
}

/**
 * Select a cell in the grid
 */
function selectCell(row, col) {
    // Don't allow selection of given cells
    if (originalPuzzle[row][col] !== 0) return;

    clearCellHighlights();
    selectedCell = { row, col };
    
    const cellElement = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    cellElement.classList.add('selected');
    
    highlightRelatedCells(row, col);
    
    // Auto-place symbol if one is selected
    if (selectedSymbol) {
        placeSymbolInSelectedCell();
    }
}

/**
 * Select a symbol from the panel
 */
function selectSymbol(symbol) {
    clearSymbolSelection();
    selectedSymbol = symbol;
    
    const symbolBtns = document.querySelectorAll('.symbol-btn');
    symbolBtns.forEach(btn => {
        if (btn.textContent === symbol) {
            btn.classList.add('selected');
        }
    });

    // Auto-place in selected cell
    if (selectedCell) {
        placeSymbolInSelectedCell();
        //clearSymbolSelection();
         setTimeout(() => clearSymbolSelection(), 200);
    }
}

/**
 * Place the selected symbol in the selected cell
 */
function placeSymbolInSelectedCell() {
    if (!selectedCell || !selectedSymbol) return;

    const { row, col } = selectedCell;
    const number = NUMBER_MAP[selectedSymbol];
    
    if (isValidMove(row, col, number)) {
        currentPuzzle[row][col] = number;
        const cellElement = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        cellElement.textContent = selectedSymbol;
        cellElement.classList.remove('error');
        
        checkForCompletion();
    } else {
        showInvalidMoveAnimation(row, col);
        mistakeCount++;
        updateMistakes();
        if(window.soundOn && mistakeCount <= 4){
        	hurt.currentTime = 0;
        	hurt.play();
        }
        if (mistakeCount >= 5) {
    		//alert('Too many mistakes! Try again.');
    		if(window.soundOn){
    			game_over.currentTime = 0;
    			game_over.play();	
    		}
    		gameOver();
    		//showSuccessMessage();
    	//resetPuzzle();
		}
    }
}

/**
 * Check if a move is valid according to Sudoku rules
 */
function isValidMove(row, col, number) {
    // Check row
    for (let c = 0; c < 9; c++) {
        if (c !== col && currentPuzzle[row][c] === number) {
            return false;
        }
    }

    // Check column
    for (let r = 0; r < 9; r++) {
        if (r !== row && currentPuzzle[r][col] === number) {
            return false;
        }
    }

    // Check 3x3 box
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    
    for (let r = boxRow; r < boxRow + 3; r++) {
        for (let c = boxCol; c < boxCol + 3; c++) {
            if ((r !== row || c !== col) && currentPuzzle[r][c] === number) {
                return false;
            }
        }
    }

    return true;
}

/**
 * Show animation for invalid moves
 */
function showInvalidMoveAnimation(row, col) {
    const cellElement = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    cellElement.classList.add('error');
    
    setTimeout(() => {
        cellElement.classList.remove('error');
    }, 500);
}

/**
 * Highlight cells related to the selected cell
 */
function highlightRelatedCells(row, col) {
    const currentValue = currentPuzzle[row][col];
    
    // Highlight same numbers/symbols
    if (currentValue !== 0) {
        const symbol = SYMBOL_MAP[currentValue];
        document.querySelectorAll('.cell').forEach(cell => {
            if (cell.textContent === symbol) {
                cell.classList.add('highlight-same');
            }
        });
    }
}

/**
 * Clear all cell highlights
 */
function clearCellHighlights() {
    document.querySelectorAll('.cell').forEach(cell => {
        cell.classList.remove('selected', 'highlight-same');
    });
}

/**
 * Clear symbol selection
 */
function clearSymbolSelection() {
    document.querySelectorAll('.symbol-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    selectedSymbol = null;
}

/**
 * Clear all selections
 */
function clearSelections() {
    clearCellHighlights();
    clearSymbolSelection();
    selectedCell = null;
}

/**
 * Clear the selected cell content
 */
function clearSelectedCell() {
    if (!selectedCell) return;
    
    const { row, col } = selectedCell;
    
    // Don't clear given cells
    if (originalPuzzle[row][col] !== 0) return;
    
    currentPuzzle[row][col] = 0;
    const cellElement = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    cellElement.textContent = '';
}

/**
 * Reset the puzzle to original state
 */
function resetPuzzle() {
    if (!originalPuzzle) return;
    
    document.querySelector('.game-controls').classList.remove('hidden');
    
    currentPuzzle = originalPuzzle.map(row => [...row]);
    renderSudokuGrid();
    clearSelections();
   // startTimer();
    mistakeCount = 0;
    
    
}

/**
 * Start the game timer
 */
function startTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    
    gameStartTime = Date.now();
    timerInterval = setInterval(updateTimer, 1000);
}

/**
 * Update the timer display
 */
function updateTimer() {
    if (!gameStartTime) return;
    
    const elapsed = Math.floor((Date.now() - gameStartTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    
    document.getElementById('timer').textContent = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Check if the puzzle is completed
 */
function checkForCompletion() {
	
    // Check if all cells are filled
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            if (currentPuzzle[row][col] === 0) {
                return false;
            }
        }
    }
    
    // Check if solution is valid
    if (isPuzzleValid()) {
        showSuccessMessage();
       // stopTimer();
        return true;
    }
    
    return false;
}

/**
 * Check if the current puzzle state is valid
 */
function isPuzzleValid() {
    // Check all rows, columns, and boxes
    for (let i = 0; i < 9; i++) {
        if (!isRowValid(i) || !isColumnValid(i) || !isBoxValid(i)) {
            return false;
        }
    }
    return true;
}

/**
 * Check if a row is valid
 */
function isRowValid(row) {
    const seen = new Set();
    for (let col = 0; col < 9; col++) {
        const value = currentPuzzle[row][col];
        if (value !== 0) {
            if (seen.has(value)) return false;
            seen.add(value);
        }
    }
    return true;
}

/**
 * Check if a column is valid
 */
function isColumnValid(col) {
    const seen = new Set();
    for (let row = 0; row < 9; row++) {
        const value = currentPuzzle[row][col];
        if (value !== 0) {
            if (seen.has(value)) return false;
            seen.add(value);
        }
    }
    return true;
}

/**
 * Check if a 3x3 box is valid
 */
function isBoxValid(boxIndex) {
    const seen = new Set();
    const boxRow = Math.floor(boxIndex / 3) * 3;
    const boxCol = (boxIndex % 3) * 3;
    
    for (let r = boxRow; r < boxRow + 3; r++) {
        for (let c = boxCol; c < boxCol + 3; c++) {
            const value = currentPuzzle[r][c];
            if (value !== 0) {
                if (seen.has(value)) return false;
                seemistakeCountn.add(value);
            }
        }
    }
    return true;
}

/**
 * Show success message when puzzle is completed
 */
function showSuccessMessage() {

  //Audio
  if(window.soundOn){
    game_won.currentTime = 0;
  	game_won.play();
  }
	
  if (document.getElementById('gameWonOverlay')) return;

  // 3) build the overlay
  const overlay = document.createElement('div');
  overlay.id = 'gameWonOverlay';
  overlay.className = 'overlay-container';

  // 4) build the modal content
  const modal = document.createElement('div');
  modal.className = 'settings-modal';  // reuse settings-modal styles
  modal.innerHTML = `
  <h2><b>🤩️🤩️🥳️<br> YOU WON <br>🥳️🤩️🤩️<b></h2>
  <div class="option">
    <button id="retryBtn" class="reset-btn">🔄 Wanna Try Again??</button>
  </div>
    <div class="option">
  </div>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);


  // 5) wire up Retry
  document.getElementById('retryBtn').addEventListener('click', () => {
    if(window.soundOn){
    	click.currentTime = 0;
    	click.play();
    }
    overlay.remove();
    resetToStart();    // or resetPuzzle(), whichever you prefer
  });

  // Setup Quit button using quit function
  document.getElementById('quitBtn').addEventListener('click', () => {quit();});

    
}


/**
* Game Over Screen
**/
function gameOver() {
  // 1) stop the clock
  stopTimer();

  // 2) don’t open twice
  if (document.getElementById('gameOverOverlay')) return;

  // 3) build the overlay
  const overlay = document.createElement('div');
  overlay.id = 'gameOverOverlay';
  overlay.className = 'overlay-container';

  // 4) build the modal content
  const modal = document.createElement('div');
  modal.className = 'settings-modal';  // reuse settings-modal styles
  modal.innerHTML = `
  <h2><b>Game Over<b></h2>
  <p style="color:#ff3131e5; font-size:25px">😭️😭️😭️😭️😭️</p>
  <div class="option">
    <button id="retryBtn" class="reset-btn">🔄 Retry</button>
  </div>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // 5) wire up Retry
  document.getElementById('retryBtn').addEventListener('click', () => {
    if(window.soundOn){
    	click.currentTime = 0;
    	click.play();
    }
    overlay.remove();
    resetToStart();    // or resetPuzzle(), whichever you prefer
  });

  // 6) wire up Close (if you want “just dismiss” behavior)
  document.getElementById('closeGameOverBtn').addEventListener('click', () => {
    overlay.remove();
    // you could optionally resume timer, or leave it stopped
  });
}


/**
 * Stop the timer
 */
function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

/**
 * Show loading state
 */
function showLoadingState() {
    const grid = document.getElementById('sudokuGrid');
    grid.innerHTML = '<div class="loading">🎲 Loading new puzzle...</div>';
    stopTimer();
}

function updateMistakes(){ 
	document.getElementById('mistakes').textContent=mistakeCount; 
}

function resetToStart() {
   
  // Stop any in‑flight timer
  //stopTimer();
  // reset state variables

  // Clear game state
  currentPuzzle = null;
  originalPuzzle = null;
  selectedCell = null;
  selectedSymbol = null;
  mistakeCount = 0;
  currentDifficulty = null;
  
  
	// reset the status‐panel display :contentReference[oaicite:0]{index=0}
  document.getElementById('difficulty').textContent = '-';
  document.getElementById('mistakes').textContent  = '0';

  
  document.querySelector('.clearCell-panel').classList.add('hidden');
  document.querySelector('.symbols-panel').classList.add('hidden');
  document.querySelector('.status-panel').classList.add('hidden');
  document.querySelector('.game-controls').classList.remove('hidden');
  document.querySelector('.game-title').classList.remove('hidden');
  
  
  // Restore the grid prompt
  const grid = document.getElementById('sudokuGrid');
  grid.innerHTML = `<div class="loading">🎲 Select one the option  above to start!!</div>`;
//const grid = document.getElementById('sudokuGrid');
  grid.classList.remove('grid-active');
	//grid.innerHTML = `<div class="loading">🎲 Select one the option to start!!</div>`;
  // Reset status displays
  document.getElementById('timer').textContent      = '00:00';
  document.getElementById('difficulty').textContent = '-';
  document.getElementById('mistakes').textContent   = '0';

  // Show the difficulty buttons again
  
  //document.getElementsByClassName('game-controls').remove('hidden');

}

// Initialize the game when page loads
document.addEventListener('DOMContentLoaded', initializeGame);


// 1. Make sure settings button is wired up after DOM loads
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('settingsBtn')
          .addEventListener('click', openSettings);



          
});

function openSettings() {
  // pause game
  stopTimer();

  // if already open, do nothing
  if (document.getElementById('settingsOverlay')) return;

  // 1) build overlay + modal container
  const overlay = document.createElement('div');
  overlay.id = 'settingsOverlay';
  overlay.className = 'overlay-container';
  const modal = document.createElement('div');
  modal.className = 'settings-modal';
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // 2) function to render each “screen”
  function renderScreen(screen) {
    let html = '';
    if (screen === 'main') {
      html = `
        <h2>Settings</h2>
        <div class="option">
          <label for="musicToggle"><b>Music<b></label>
          <input type="checkbox" id="musicToggle" ${window.musicOn !== false ? 'checked' : ''}>
        </div>
        <div class="option">
          <label for="soundToggle"><b>Sound FX<b></label>
          <input type="checkbox" id="soundToggle" ${window.soundOn !== false ? 'checked' : ''}>
        </div>
        <div class="option">
          <button id="howToPlayBtn" class="reset-btn">How to Play</button>
        </div>
        <div class="option">
          <button id="creditsBtn" class="reset-btn">Credits</button>
        </div>
        <div class="option">
          <button id="quitBtn" class="reset-btn">Go-to Home</button>
        </div>           
        <button class="close-btn" id="closeSettingsBtn">Close</button>
      `;
    } else if (screen === 'help') {
      //click.play();
      html = `
        <h2>How to Play</h2>
        <p>Fill each row, column &amp; 3×3 box with all 9 symbols exactly once.</p>
        <button class="close-btn" id="backBtn">Back</button>
      `;
    } else if (screen === 'credits') {
      //click.play();
      html = `
        <h2>Credits</h2>
        <p>Designed &amp; coded by @eaglebelt and Claude <br> Music by Rifussion <br> Sfx by Kenny.nl</p>
        <button class="close-btn" id="backBtn">Back</button>
      `;
    }

    modal.innerHTML = html;

    // 3) wire up this screen’s buttons:
    // Close / Back
    modal.querySelectorAll('#closeSettingsBtn, #backBtn')
         .forEach(btn => btn.addEventListener('click', () => {
           overlay.remove();
           startTimer();
           if(window.soundOn){
            click.currentTime = 0;
            click.play();
           }
         }));

    // Main‑screen actions
    if (screen === 'main') {
      modal.querySelector('#howToPlayBtn')
           .addEventListener('click', withClick(() => renderScreen('help')));
      modal.querySelector('#creditsBtn')
           .addEventListener('click', withClick(() => renderScreen('credits')));
      modal.querySelector('#quitBtn')
           .addEventListener('click', withClick(() => {overlay.remove(); resetToStart(); }));
      modal.querySelector('#musicToggle')
           .addEventListener('change', withClick(e => { window.musicOn = e.target.checked; if(window.musicOn){bgm.loop = true; bgm.play();}else{bgm.pause();}}));
      modal.querySelector('#soundToggle')
           .addEventListener('change', e => { window.soundOn = e.target.checked; if(window.soundOn){click.currentTime = 0; click.play();}});
      if(window.soundOn){
        click.currentTime = 0;
        click.play();
      }
    }
  }

  // 4) Finally, show the main settings page
  renderScreen('main');
}



//AUDIO RELATED STUFF 

window.musicOn = false;  // THIS IS FOR MUSIC 
window.soundOn = true;	// THIS IS FOR SFX



function maybeClick() {
  if (window.soundOn) {
    click.currentTime = 0;
    click.play();
  }
}

// 3. A helper to wrap any handler with that conditional click
function withClick(fn) {
  return e => {
    maybeClick();
    fn(e);
  };
}




// Add keyboard support
document.addEventListener('keydown', (e) => {
    if (!selectedCell) return;
    
    // Number keys 1-9 /**
/**    if (e.key >= '1' && e.key <= '9') {
        const number = parseInt(e.key);
        selectSymbol(SYMBOL_MAP[number]);
    } **/
    
    // Delete/Backspace to clear
    if (e.key === 'Delete' || e.key === 'Backspace') {
        clearSelectedCell();
    }
    
    // Arrow keys for navigation
/**    const { row, col } = selectedCell;
    let newRow = row, newCol = col;
    
    switch (e.key) {
        case 'ArrowUp': newRow = Math.max(0, row - 1); break;
        case 'ArrowDown': newRow = Math.min(8, row + 1); break;
        case 'ArrowLeft': newCol = Math.max(0, col - 1); break;
        case 'ArrowRight': newCol = Math.min(8, col + 1); break;
    }
    
    if (newRow !== row || newCol !== col) {
        selectCell(newRow, newCol);
    }  */
});
