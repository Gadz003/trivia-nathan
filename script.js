// ----- Funções de API (mantidas) -----
const fetchTrivia = async (endpoint = '', qtd = 15) => {
    try {
        const url = `https://opentdb.com/api.php?amount=${qtd}${endpoint}`;
        let resultado = await fetch(url);
        resultado = await resultado.json();
        return resultado.results;
    } catch (e) {
        console.error(e.message);
        return [];
    }
};

const fetchTradutor = async (texto) => {
    try {
        const url = `https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=auto&tl=pt-BR&q=${encodeURIComponent(texto)}`;
        let resultado = await fetch(url);
        resultado = await resultado.json();
        return resultado[0][0];
    } catch (e) {
        console.error(e.message);
        return texto;
    }
};

// ----- Variáveis do jogo -----
const TOTAL_QUESTIONS = 15;
let questions = [];
let currentIndex = 0;
let correctCount = 0;
let playerName = '';
let isAnswered = false;
let timerInterval = null;
let seconds = 0;
let skipped = false; // indica se pulou a pergunta atual

// ----- Elementos DOM -----
const welcomeScreen = document.getElementById('welcome-screen');
const gameScreen = document.getElementById('game-screen');
const resultScreen = document.getElementById('result-screen');
const questionContainer = document.getElementById('question-container');
const progressSpan = document.getElementById('question-progress');
const progressFill = document.getElementById('progress-fill');
const timerDisplay = document.getElementById('timer-display');
const playerNameInput = document.getElementById('player-name');
const startBtn = document.getElementById('start-btn');
const skipBtn = document.getElementById('skip-btn');
const nextBtn = document.getElementById('next-btn');
const restartBtn = document.getElementById('restart-btn');
const resultMessage = document.getElementById('result-message');
const scoreList = document.getElementById('score-list');

// ----- Funções auxiliares -----
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

function formatTime(sec) {
    const m = String(Math.floor(sec / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return `${m}:${s}`;
}

function saveScore(name, score) {
    const scores = JSON.parse(localStorage.getItem('triviaScores') || '[]');
    scores.push({ name, score, date: new Date().toLocaleString() });
    if (scores.length > 20) scores.shift();
    localStorage.setItem('triviaScores', JSON.stringify(scores));
}

function renderScoreBoard() {
    const scores = JSON.parse(localStorage.getItem('triviaScores') || '[]');
    scoreList.innerHTML = '';
    if (scores.length === 0) {
        scoreList.innerHTML = '<li style="justify-content:center; opacity:0.6;">Nenhum jogo registrado ainda.</li>';
        return;
    }
    const reversed = [...scores].reverse().slice(0, 10);
    reversed.forEach(entry => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span class="player-name">${entry.name}</span>
            <span class="player-score">${entry.score}/${TOTAL_QUESTIONS}</span>
            <span style="font-size:0.7rem; opacity:0.5;">${entry.date}</span>
        `;
        scoreList.appendChild(li);
    });
}

// ----- Controle do cronômetro -----
function startTimer() {
    seconds = 0;
    timerDisplay.textContent = '00:00';
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        seconds++;
        timerDisplay.textContent = formatTime(seconds);
    }, 1000);
}

function stopTimer() {
    clearInterval(timerInterval);
}

// ----- Lógica do jogo -----
async function startGame() {
    // Valida e limita o tamanho do nome do jogador
    let nomeDigitado = playerNameInput.value.trim();
    if (nomeDigitado.length > 20) nomeDigitado = nomeDigitado.slice(0, 20);
    playerName = nomeDigitado || 'Anônimo';

    // Evita duplo clique enquanto as perguntas carregam
    startBtn.disabled = true;
    startBtn.textContent = 'Carregando...';

    questions = await fetchTrivia('', TOTAL_QUESTIONS);

    startBtn.disabled = false;
    startBtn.textContent = 'Iniciar';

    if (questions.length === 0) {
        alert('Erro ao carregar perguntas. Tente novamente.');
        return;
    }
    // Se a API retornar menos que o total, ajustamos
    // Mas vamos usar o que veio
    currentIndex = 0;
    correctCount = 0;
    isAnswered = false;
    skipped = false;
    showScreen('game-screen');
    startTimer();
    await showQuestion();
}

async function showQuestion() {
    if (currentIndex >= questions.length) {
        endGame();
        return;
    }

    const question = questions[currentIndex];
    isAnswered = false;
    skipped = false;
    nextBtn.disabled = true;
    skipBtn.disabled = false;

    // Atualiza progresso
    progressSpan.textContent = `Pergunta ${currentIndex + 1} de ${questions.length}`;
    const progressPercent = ((currentIndex) / questions.length) * 100;
    progressFill.style.width = `${progressPercent}%`;

    // Limpa container
    questionContainer.innerHTML = '';

    // Texto da pergunta traduzido
    const perguntaTraduzida = await fetchTradutor(question.question);
    const divPergunta = document.createElement('div');
    divPergunta.className = 'question-text';
    divPergunta.textContent = decodeURIComponent(perguntaTraduzida);
    questionContainer.appendChild(divPergunta);

    // Opções
    const optionsDiv = document.createElement('div');
    optionsDiv.className = 'options-list';

    const respostas = [...question.incorrect_answers, question.correct_answer];
    respostas.sort(() => Math.random() - 0.5);

    // Letras A, B, C, D
    const letras = ['A', 'B', 'C', 'D'];

    for (let i = 0; i < respostas.length; i++) {
        const resposta = respostas[i];
        const textoTraduzido = await fetchTradutor(resposta);
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerHTML = `<span class="letter">${letras[i]}</span> ${decodeURIComponent(textoTraduzido)}`;
        btn.dataset.correct = (resposta === question.correct_answer) ? 'true' : 'false';
        btn.dataset.value = resposta;
        btn.addEventListener('click', () => handleOptionClick(btn, question.correct_answer));
        optionsDiv.appendChild(btn);
    }

    questionContainer.appendChild(optionsDiv);

    // Atualiza barra de progresso para a pergunta atual (já está)
}

function handleOptionClick(clickedBtn, correctAnswer) {
    if (isAnswered) return;
    isAnswered = true;
    skipped = false;
    skipBtn.disabled = true;

    const allOptions = document.querySelectorAll('.option-btn');
    const isCorrect = (clickedBtn.dataset.correct === 'true');

    if (isCorrect) correctCount++;

    // Marca todas
    allOptions.forEach(btn => {
        btn.disabled = true;
        if (btn.dataset.correct === 'true') {
            btn.classList.add('correct');
        } else if (btn === clickedBtn && !isCorrect) {
            btn.classList.add('wrong');
        }
    });

    // Habilita "Próxima"
    nextBtn.disabled = false;
}

function skipQuestion() {
    if (isAnswered) return;
    isAnswered = true;
    skipped = true;
    skipBtn.disabled = true;

    // Marca a correta e desabilita tudo
    const allOptions = document.querySelectorAll('.option-btn');
    allOptions.forEach(btn => {
        btn.disabled = true;
        if (btn.dataset.correct === 'true') {
            btn.classList.add('correct');
        }
    });

    // Habilita "Próxima"
    nextBtn.disabled = false;
}

function goToNext() {
    if (!isAnswered) return;
    // Avança
    currentIndex++;
    if (currentIndex >= questions.length) {
        endGame();
    } else {
        showQuestion();
    }
}

function endGame() {
    stopTimer();
    // Garante que a barra de progresso feche em 100%
    progressFill.style.width = '100%';
    // Salva a pontuação
    saveScore(playerName, correctCount);

    resultMessage.textContent = `${playerName}, você acertou ${correctCount} de ${questions.length} perguntas!`;
    renderScoreBoard();
    showScreen('result-screen');
}

// ----- Eventos -----
startBtn.addEventListener('click', startGame);
playerNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') startGame();
});

skipBtn.addEventListener('click', skipQuestion);
nextBtn.addEventListener('click', goToNext);

restartBtn.addEventListener('click', () => {
    showScreen('welcome-screen');
    playerNameInput.value = playerName;
});

// Pré-carrega o placar na tela de resultado (já oculto)
document.addEventListener('DOMContentLoaded', () => {
    showScreen('welcome-screen');
    renderScoreBoard();
});