// ----- Funções originais (adaptadas) -----
const fetchTrivia = async (endpoint = '', qtd = 5) => {
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
        return texto; // fallback: texto original
    }
};

// ----- Variáveis globais do jogo -----
let questions = [];
let currentIndex = 0;
let correctCount = 0;
let playerName = '';
let isAnswering = false;

// ----- Elementos DOM -----
const welcomeScreen = document.getElementById('welcome-screen');
const gameScreen = document.getElementById('game-screen');
const resultScreen = document.getElementById('result-screen');
const questionContainer = document.getElementById('question-container');
const currentQSpan = document.getElementById('current-q');
const resultMessage = document.getElementById('result-message');
const scoreList = document.getElementById('score-list');
const playerNameInput = document.getElementById('player-name');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');

// ----- Funções auxiliares -----
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

// Salva a pontuação no localStorage
function saveScore(name, score) {
    const scores = JSON.parse(localStorage.getItem('triviaScores') || '[]');
    scores.push({ name, score, date: new Date().toLocaleString() });
    // Mantém apenas os últimos 20 registros
    if (scores.length > 20) scores.shift();
    localStorage.setItem('triviaScores', JSON.stringify(scores));
}

// Exibe o placar (últimos registros)
function renderScoreBoard() {
    const scores = JSON.parse(localStorage.getItem('triviaScores') || '[]');
    scoreList.innerHTML = '';
    if (scores.length === 0) {
        scoreList.innerHTML = '<li style="justify-content:center; opacity:0.6;">Nenhum jogo registrado ainda.</li>';
        return;
    }
    // Mostra os últimos 10 (do mais recente para o mais antigo)
    const reversed = [...scores].reverse().slice(0, 10);
    reversed.forEach(entry => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span class="player-name">${entry.name}</span>
            <span class="player-score">${entry.score}/5</span>
            <span style="font-size:0.7rem; opacity:0.5;">${entry.date}</span>
        `;
        scoreList.appendChild(li);
    });
}

// ----- Lógica principal do jogo -----
async function startGame() {
    playerName = playerNameInput.value.trim() || 'Anônimo';
    // Busca as perguntas
    questions = await fetchTrivia();
    if (questions.length === 0) {
        alert('Erro ao carregar perguntas. Tente novamente.');
        return;
    }
    currentIndex = 0;
    correctCount = 0;
    showScreen('game-screen');
    await showQuestion();
}

async function showQuestion() {
    if (currentIndex >= questions.length) {
        endGame();
        return;
    }

    const question = questions[currentIndex];
    currentQSpan.textContent = currentIndex + 1;
    questionContainer.innerHTML = '';

    // Cria o texto da pergunta (traduzido)
    const perguntaTraduzida = await fetchTradutor(question.question);
    const divPergunta = document.createElement('div');
    divPergunta.innerHTML = decodeURIComponent(perguntaTraduzida) + '<br>';
    questionContainer.appendChild(divPergunta);

    // Embaralha as respostas
    const respostas = [...question.incorrect_answers, question.correct_answer];
    respostas.sort(() => Math.random() - 0.5);

    const divRespostas = document.createElement('div');
    for (const resposta of respostas) {
        const botao = document.createElement('button');
        const textoTraduzido = await fetchTradutor(resposta);
        botao.innerText = decodeURIComponent(textoTraduzido);
        botao.dataset.correct = (resposta === question.correct_answer) ? 'true' : 'false';
        divRespostas.appendChild(botao);
    }
    questionContainer.appendChild(divRespostas);

    // Traduz a resposta correta para comparação (usada no clique)
    const corretaTraduzida = decodeURIComponent(await fetchTradutor(question.correct_answer));

    // Aguarda o clique do usuário
    isAnswering = false;
    const botoes = divRespostas.querySelectorAll('button');
    botoes.forEach(btn => {
        btn.onclick = () => handleAnswer(btn, corretaTraduzida, botoes);
    });
}

function handleAnswer(clickedBtn, correctAnswer, allButtons) {
    if (isAnswering) return;
    isAnswering = true;

    const isCorrect = (clickedBtn.innerText === correctAnswer);
    if (isCorrect) correctCount++;

    // Feedback visual
    allButtons.forEach(btn => {
        btn.disabled = true;
        if (btn.innerText === correctAnswer) {
            btn.style.backgroundColor = '#2ecc71';
            btn.style.borderColor = '#2ecc71';
        } else if (btn === clickedBtn && !isCorrect) {
            btn.style.backgroundColor = '#e74c3c';
            btn.style.borderColor = '#e74c3c';
        }
    });

    // Avança para a próxima pergunta após 1 segundo
    setTimeout(() => {
        currentIndex++;
        showQuestion();
    }, 1000);
}

function endGame() {
    // Salva a pontuação
    saveScore(playerName, correctCount);

    // Exibe resultado
    resultMessage.textContent = `${playerName}, você acertou ${correctCount} de 5 perguntas!`;
    renderScoreBoard();
    showScreen('result-screen');
}

// ----- Eventos -----
startBtn.addEventListener('click', startGame);

restartBtn.addEventListener('click', () => {
    showScreen('welcome-screen');
    playerNameInput.value = playerName; // mantém o nome
});

// Permite iniciar com Enter no campo de nome
playerNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') startGame();
});

// Inicialização: mostra a tela de boas-vindas e carrega placar (já visível)
document.addEventListener('DOMContentLoaded', () => {
    showScreen('welcome-screen');
    // Pré-carrega o placar na tela de resultado (já está oculto)
    renderScoreBoard();
});