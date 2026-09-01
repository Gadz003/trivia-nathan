const fetchTrivia = async (endpoint='', qtd=5) => {
    try {
        const url = `https://opentdb.com/api.php?amount=${qtd}${endpoint}`
        let resultado = await fetch(url);
        resultado = await resultado.json();

        return resultado.results;
    } catch (e) {
        console.error(e.message)
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
    }
}

const mostrarQuestoes = async () => {
    const container = document.querySelector('#question-container');
    const questions = await fetchTrivia();
    let acertos = 0;
    
    for (const question of questions){
        container.innerHTML = '';
        const novaQuestao = document.createElement('div');
        novaQuestao.innerHTML = decodeURIComponent(await fetchTradutor(question.question)) + '<br>';
        container.appendChild(novaQuestao);
        
        const divResposta = document.createElement('div');        
        const respostas = [...question.incorrect_answers, question.correct_answer];
        respostas.sort((a, b) => Math.random() - 0.5);
    
        for (const resposta of respostas){
            const botaoResposta = document.createElement('button');
            botaoResposta.innerText = decodeURIComponent(await fetchTradutor(resposta));
            divResposta.appendChild(botaoResposta);
        }
    
        container.appendChild(divResposta);
    
        const respostaTraduzida = decodeURIComponent(await fetchTradutor(question.correct_answer));
    
        await new Promise((resolve) => {
            const botoesResposta = document.querySelectorAll('button');
            botoesResposta.forEach((botao) => {
                botao.onclick = () => {
                    if (botao.innerText == respostaTraduzida){
                        botao.style.backgroundColor = 'green';
                        acertos++;
                    } else {
                        botao.style.backgroundColor = 'red';
                        botoesResposta.forEach((bt) => {
                            if (bt.innerText == respostaTraduzida){
                                bt.style.backgroundColor = 'green';
                            }
                        });
                    }
                    setTimeout(() => {
                        resolve();
                    }, 1000)
                }
            });
        })
    }

    container.innerHTML = `Você acertou ${acertos}/5 questões!`
}

mostrarQuestoes();