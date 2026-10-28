const PUZZLE = {"size": 15, "words": [{"answer": "REGISTRATION", "row": 7, "col": 1, "dir": "A", "clue": "Recording a guest’s details on arrival."}, {"answer": "HOUSEKEEPING", "row": 0, "col": 2, "dir": "D", "clue": "Department responsible for cleaning guest rooms."}, {"answer": "CANCELLATION", "row": 10, "col": 0, "dir": "A", "clue": "Ending a reservation before arrival."}, {"answer": "RESERVATION", "row": 3, "col": 0, "dir": "A", "clue": "A request to book a room before arrival."}, {"answer": "ROOMSTATUS", "row": 1, "col": 0, "dir": "A", "clue": "The current condition or availability of a room."}, {"answer": "WAKEUPCALL", "row": 5, "col": 0, "dir": "A", "clue": "A scheduled telephone call to wake a guest."}, {"answer": "UPSELLING", "row": 0, "col": 12, "dir": "D", "clue": "Encouraging a guest to purchase a higher room category."}, {"answer": "NOSHOW", "row": 9, "col": 10, "dir": "D", "clue": "A guest who does not arrive despite having a reservation."}, {"answer": "TARIFF", "row": 9, "col": 7, "dir": "D", "clue": "The published price for a room or service."}, {"answer": "WALKIN", "row": 12, "col": 3, "dir": "A", "clue": "A guest who arrives without a prior reservation."}, {"answer": "FOLIO", "row": 13, "col": 9, "dir": "A", "clue": "A record of a guest’s charges and payments."}, {"answer": "PMS", "row": 5, "col": 5, "dir": "D", "clue": "Abbreviation for a hotel property management system."}, {"answer": "DND", "row": 2, "col": 10, "dir": "D", "clue": "Room-status abbreviation meaning “Do Not Disturb”."}, {"answer": "ETA", "row": 10, "col": 4, "dir": "D", "clue": "Abbreviation for estimated time of arrival."}, {"answer": "VIP", "row": 12, "col": 12, "dir": "D", "clue": "Abbreviation for a very important guest."}]};
const SIZE = PUZZLE.size;
const gridEl = document.getElementById('crossword');
const clueAEl = document.getElementById('cluesA');
const clueDEl = document.getElementById('cluesD');
const statusEl = document.getElementById('status');
const scoreText = document.getElementById('scoreText');
let activeWord = null;
let activeDirection = 'A';
let checked = false;

const cells = Array.from({length: SIZE}, () => Array(SIZE).fill(null));
const numbers = Array.from({length: SIZE}, () => Array(SIZE).fill(0));
const starts = new Map();
const wordByKey = new Map();

function key(r,c) { return `${r},${c}`; }
function cellKey(r,c) { return `${r}-${c}`; }

PUZZLE.words.forEach(w => {
  w.cells = [];
  for (let i=0;i<w.answer.length;i++) {
    const r = w.row + (w.dir === 'D' ? i : 0);
    const c = w.col + (w.dir === 'A' ? i : 0);
    w.cells.push([r,c]);
    if (!cells[r][c]) cells[r][c] = {answer:w.answer[i], words:[]};
    else if (cells[r][c].answer !== w.answer[i]) console.error('Crossword conflict',w,r,c);
    cells[r][c].words.push(w);
  }
  starts.set(key(w.row,w.col), w);
  wordByKey.set(w.dir + ':' + w.answer, w);
});

// Standard crossword numbering: number every square where an across or down answer begins.
let number = 0;
const numberedWords = [];
for (let r=0;r<SIZE;r++) {
  for (let c=0;c<SIZE;c++) {
    if (!cells[r][c]) continue;
    const acrossStart = c===0 || !cells[r][c-1];
    const downStart = r===0 || !cells[r-1][c];
    if (acrossStart || downStart) {
      number++;
      numbers[r][c] = number;
      if (acrossStart) {
        const w = PUZZLE.words.find(x => x.dir==='A' && x.row===r && x.col===c);
        if (w) { w.number=number; numberedWords.push(w); }
      }
      if (downStart) {
        const w = PUZZLE.words.find(x => x.dir==='D' && x.row===r && x.col===c);
        if (w) { w.number=number; numberedWords.push(w); }
      }
    }
  }
}
PUZZLE.words.forEach(w => {
  if (w.number == null) {
    // Fallback only for a malformed placement; the supplied layout has standard starts.
    w.number = number++;
  }
});

function renderGrid() {
  gridEl.innerHTML = '';
  gridEl.style.gridTemplateColumns = `repeat(${SIZE}, minmax(0, 1fr))`;
  for (let r=0;r<SIZE;r++) for (let c=0;c<SIZE;c++) {
    const box = document.createElement('div');
    box.className = 'cell' + (!cells[r][c] ? ' block' : '');
    box.dataset.row=r; box.dataset.col=c;
    if (cells[r][c]) {
      if (numbers[r][c]) {
        const n=document.createElement('span'); n.className='number'; n.textContent=numbers[r][c]; box.appendChild(n);
      }
      const input=document.createElement('input');
      input.maxLength=1; input.autocomplete='off'; input.autocapitalize='characters';
      input.setAttribute('aria-label',`Row ${r+1}, column ${c+1}`);
      input.dataset.row=r; input.dataset.col=c;
      input.value='';
      input.addEventListener('focus',()=>onCellFocus(r,c));
      input.addEventListener('click',()=>onCellClick(r,c));
      input.addEventListener('input',e=>onInput(e,r,c));
      input.addEventListener('keydown',e=>onKeyDown(e,r,c));
      box.appendChild(input);
    }
    gridEl.appendChild(box);
  }
}
function inputAt(r,c) { return gridEl.querySelector(`input[data-row="${r}"][data-col="${c}"]`); }
function boxAt(r,c) { return gridEl.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`); }
function wordAt(r,c,dir) {
  const options=(cells[r][c]?.words||[]).filter(w=>w.dir===dir);
  return options[0] || null;
}
function onCellFocus(r,c) {
  if (!activeWord || !activeWord.cells.some(([rr,cc])=>rr===r&&cc===c)) {
    activeWord=wordAt(r,c,activeDirection) || wordAt(r,c,activeDirection==='A'?'D':'A');
    if (activeWord) activeDirection=activeWord.dir;
  }
  paintActive();
}
function onCellClick(r,c) {
  const across=wordAt(r,c,'A'), down=wordAt(r,c,'D');
  if (across && down) {
    if (activeWord && activeWord.cells.some(([rr,cc])=>rr===r&&cc===c)) {
      activeWord=activeWord.dir==='A'?down:across;
    } else activeWord=activeDirection==='A'?across:down;
  } else activeWord=across||down;
  if (activeWord) activeDirection=activeWord.dir;
  paintActive();
}
function onInput(e,r,c) {
  const input=e.target;
  const value=input.value.toUpperCase().replace(/[^A-Z]/g,'').slice(-1);
  input.value=value;
  clearMarks();
  if (value && activeWord) {
    const index=activeWord.cells.findIndex(([rr,cc])=>rr===r&&cc===c);
    const next=activeWord.cells[index+1];
    if (next) inputAt(next[0],next[1]).focus();
  }
  updateProgress();
}
function onKeyDown(e,r,c) {
  if (!activeWord) return;
  if (e.key==='Backspace' && !e.target.value) {
    const i=activeWord.cells.findIndex(([rr,cc])=>rr===r&&cc===c);
    if (i>0) { e.preventDefault(); const [pr,pc]=activeWord.cells[i-1]; inputAt(pr,pc).focus(); inputAt(pr,pc).value=''; updateProgress(); }
  } else if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)) {
    e.preventDefault();
    const moves={ArrowLeft:[0,-1],ArrowRight:[0,1],ArrowUp:[-1,0],ArrowDown:[1,0]};
    const [dr,dc]=moves[e.key]; let nr=r+dr,nc=c+dc;
    while(nr>=0&&nr<SIZE&&nc>=0&&nc<SIZE&&!cells[nr][nc]) { nr+=dr; nc+=dc; }
    if(nr>=0&&nr<SIZE&&nc>=0&&nc<SIZE&&cells[nr][nc]) inputAt(nr,nc).focus();
  } else if(e.key===' ' || e.key==='Tab') {
    if(e.key===' ') { e.preventDefault(); onCellClick(r,c); }
  }
}
function paintActive() {
  gridEl.querySelectorAll('.cell').forEach(el=>el.classList.remove('active-word','focused'));
  if(activeWord) activeWord.cells.forEach(([r,c])=>boxAt(r,c)?.classList.add('active-word'));
  const focused=document.activeElement;
  if(focused?.matches('input[data-row]')) boxAt(+focused.dataset.row,+focused.dataset.col)?.classList.add('focused');
  document.querySelectorAll('.clue').forEach(el=>el.classList.toggle('selected',activeWord && el.dataset.wordKey===activeWord.dir+':'+activeWord.answer));
}
function renderClues(dir, target) {
  const words=PUZZLE.words.filter(w=>w.dir===dir).sort((a,b)=>a.number-b.number);
  target.innerHTML='';
  words.forEach(w=>{
    const btn=document.createElement('button'); btn.className='clue'; btn.dataset.wordKey=w.dir+':'+w.answer;
    btn.innerHTML=`<span class="clue-number">${w.number}.</span><span>${w.clue}</span><span class="length">${w.answer.length}</span>`;
    btn.addEventListener('click',()=>selectWord(w));
    target.appendChild(btn);
  });
}
function selectWord(w) {
  activeWord=w; activeDirection=w.dir; paintActive();
  const [r,c]=w.cells[0]; inputAt(r,c).focus(); paintActive();
}
function clearMarks() {
  checked=false; gridEl.querySelectorAll('.cell').forEach(el=>el.classList.remove('correct','incorrect'));
  scoreText.textContent='Score: not checked yet';
  document.querySelectorAll('.clue').forEach(el=>el.classList.remove('done'));
}
function updateProgress() {
  let complete=0;
  PUZZLE.words.forEach(w=>{
    const full=w.cells.every(([r,c])=>inputAt(r,c)?.value.toUpperCase()===cells[r][c].answer);
    if(full) complete++;
    document.querySelectorAll('.clue').forEach(el=>{ if(el.dataset.wordKey===w.dir+':'+w.answer) el.classList.toggle('done',full); });
  });
  const pct=Math.round(complete/PUZZLE.words.length*100);
  document.getElementById('progressText').textContent=`${complete} of ${PUZZLE.words.length} words complete`;
  document.getElementById('percentText').textContent=pct+'%';
  document.getElementById('progressBar').style.width=pct+'%';
}
function checkAnswers() {
  checked=true; let correct=0, filled=0, total=0;
  for(let r=0;r<SIZE;r++) for(let c=0;c<SIZE;c++) if(cells[r][c]) {
    total++; const input=inputAt(r,c); const box=boxAt(r,c);
    box.classList.remove('correct','incorrect');
    if(input.value) filled++;
    if(input.value.toUpperCase()===cells[r][c].answer) { box.classList.add('correct'); correct++; }
    else if(input.value) box.classList.add('incorrect');
  }
  let complete=0;
  PUZZLE.words.forEach(w=>{ if(w.cells.every(([r,c])=>inputAt(r,c).value.toUpperCase()===cells[r][c].answer)) complete++; });
  const pct=Math.round(correct/total*100);
  scoreText.textContent=`Score: ${correct}/${total} letters correct`;
  statusEl.textContent=complete===PUZZLE.words.length ? 'Excellent! You completed the crossword correctly. Great front-office knowledge!' : `${complete} of ${PUZZLE.words.length} words are correct. ${filled} of ${total} squares have been filled. Review the red squares and try again.`;
  updateProgress();
}
function revealSelected() {
  if(!activeWord) { statusEl.textContent='Select a clue or a square first.'; return; }
  activeWord.cells.forEach(([r,c])=>{ inputAt(r,c).value=cells[r][c].answer; boxAt(r,c).classList.remove('incorrect'); boxAt(r,c).classList.add('correct'); });
  statusEl.textContent=`Revealed: ${activeWord.number} ${activeWord.dir==='A'?'Across':'Down'} — ${activeWord.answer}.`;
  updateProgress();
}
function hint() {
  if(!activeWord) { statusEl.textContent='Select a clue or a square first.'; return; }
  const blank=activeWord.cells.find(([r,c])=>!inputAt(r,c).value);
  const target=blank||activeWord.cells[0];
  inputAt(target[0],target[1]).value=cells[target[0]][target[1]].answer;
  inputAt(target[0],target[1]).focus();
  statusEl.textContent=`Hint: one letter has been filled in for clue ${activeWord.number}.`;
  updateProgress();
}
function resetPuzzle() {
  gridEl.querySelectorAll('input').forEach(i=>i.value='');
  clearMarks(); activeWord=null; activeDirection='A'; updateProgress(); paintActive();
  statusEl.textContent='Puzzle reset. Start with any Across or Down clue.';
}
document.querySelectorAll('.tab').forEach(tab=>tab.addEventListener('click',()=>{
  document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active',t===tab));
  clueAEl.classList.toggle('hidden',tab.dataset.tab!=='A');
  clueDEl.classList.toggle('hidden',tab.dataset.tab!=='D');
  activeDirection=tab.dataset.tab;
  if(activeWord && activeWord.dir!==activeDirection) activeWord=null;
  paintActive();
}));
document.getElementById('checkBtn').addEventListener('click',checkAnswers);
document.getElementById('revealBtn').addEventListener('click',revealSelected);
document.getElementById('hintBtn').addEventListener('click',hint);
document.getElementById('resetBtn').addEventListener('click',resetPuzzle);
renderGrid(); renderClues('A',clueAEl); renderClues('D',clueDEl); updateProgress();
