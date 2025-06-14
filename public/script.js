// script.js

const questionElement   = document.querySelector('.question-container');
const answersContainer  = document.querySelector('.answers');
const timerElement      = document.querySelector('.timer');
const progressBar       = document.querySelector('.progress-bar');

let questions               = [];
let currentQuestionIndex    = 0;
let timeLeft                = 10;
let timerInterval;
let audio;  // Global audio nesnesi

// 📌 **MongoDB'den Soruları Çekme**
async function fetchQuestions() {
    try {
        const response = await fetch("http://localhost:5000/api/questions");
        questions = await response.json();
        showQuestion(); // İlk soruyu ekrana yazdır
    } catch (error) {
        console.error("❌ Sorular çekilemedi:", error);
    }
}

// 📌 **Soruyu Ekrana Getir ve Sayaç Başlat**
function showQuestion() {
    resetState(); // Önceki seçenekleri temizle
    let questionData = questions[currentQuestionIndex];
    questionElement.textContent = questionData.question;

    questionData.answers.forEach((answer, index) => {
        const button = document.createElement("div");
        button.classList.add("answer");
        button.innerHTML = `<span>${getShape(index)}</span> ${answer.text}`;
        button.dataset.correct = answer.correct;
        button.addEventListener("click", selectAnswer);
        answersContainer.appendChild(button);
    });

    startTimer(); // 📌 Soru gösterildiğinde geri sayımı başlat!
}

// 📌 **Eski Seçenekleri Temizleme**
function resetState() {
    answersContainer.innerHTML = "";
    clearInterval(timerInterval); // Önceki süreyi sıfırla!
}

// 📌 **Süre Çubuğunu ve Geri Sayımı Başlatma**
function startTimer() {
    // Audio'yu bir kere yükle
    if (!audio) {
        audio = new Audio('countdown.mp3');
        audio.loop = false;
        // İlk kullanıcı etkileşimine bağlayarak autoplay engelini aşalım
        document.body.addEventListener('click', () => {
          audio.play().catch(() => {});
        }, { once: true });
    }

    timeLeft = 10;
    timerElement.style.display = 'flex'; // Gerekirse görünür yap
    timerElement.textContent = timeLeft;
    progressBar.style.width = "100%"; 
    clearInterval(timerInterval); // Önceki sayacı sıfırla

    timerInterval = setInterval(() => {
        timeLeft--;
        timerElement.textContent = timeLeft;
        
        let progressWidth = (timeLeft / 10) * 100;
        progressBar.style.width = progressWidth + "%"; 

        // Ses çalmayı dene (kullanıcı etkileşimi sonrası izin varsa)
        if (timeLeft === 9) {
            audio.play().catch(() => {});
        }

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            audio.pause();
            nextQuestion();
        }
    }, 1000);
}

// 📌 **Cevap Seçildiğinde**
function selectAnswer(e) {
    const selectedButton = e.target.closest(".answer");
    if (!selectedButton) return;

    clearInterval(timerInterval);

    // İlk tıklamada kesin ses çalsın
    if (audio) audio.play().catch(() => {});

    document.querySelectorAll(".answer").forEach(button => {
        button.classList.remove("selected");
        button.style.border = "";
    });

    selectedButton.classList.add("selected");

    if (selectedButton.dataset.correct === "true") {
        selectedButton.style.border = "4px solid #4CAF50"; 
    } else {
        selectedButton.style.border = "4px solid #f44336"; 
    }

    setTimeout(nextQuestion, 1000);
}

// 📌 **Şekil Sembolü Eklemek için**
function getShape(index) {
    const shapes = ["▲", "◆", "●", "■"];
    return shapes[index] || "";
}

// 📌 **Bir Sonraki Soruyu Getir**
function nextQuestion() {
    currentQuestionIndex++;

    if (currentQuestionIndex < questions.length) {
        showQuestion();
    } else {
        showEndScreen();
    }
}

// 📌 **Quiz Bittiğinde**
function showEndScreen() {
    questionElement.textContent = "Quiz Over!";
    answersContainer.innerHTML = "<p>Thanks for playing! 🎉</p>";
    timerElement.style.display = "none";
}

// 📌 **Sayfa Açılınca MongoDB'den Soruları Çek ve Oyunu Başlat**
window.onload = function () {
    fetchQuestions();
};
