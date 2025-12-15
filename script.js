const texts = [
    'whoami',
    'cat about.txt',
    'ls skills/',
    'git log --oneline'
];

let textIndex = 0;
let charIndex = 0;
let isDeleting = false;
const typedTextElement = document.querySelector('.typed-text');
const typingSpeed = 100;
const deletingSpeed = 50;
const pauseDuration = 2000;

function typeText() {
    const currentText = texts[textIndex];
    
    if (!isDeleting) {
        typedTextElement.textContent = currentText.substring(0, charIndex);
        charIndex++;
        
        if (charIndex > currentText.length) {
            isDeleting = true;
            setTimeout(typeText, pauseDuration);
            return;
        }
    } else {
        typedTextElement.textContent = currentText.substring(0, charIndex);
        charIndex--;
        
        if (charIndex === 0) {
            isDeleting = false;
            textIndex = (textIndex + 1) % texts.length;
        }
    }
    
    setTimeout(typeText, isDeleting ? deletingSpeed : typingSpeed);
}

setTimeout(typeText, 1000);

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

const navbar = document.querySelector('.navbar');
window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        navbar.style.background = 'rgba(10, 14, 39, 0.98)';
    } else {
        navbar.style.background = 'rgba(10, 14, 39, 0.95)';
    }
});

const observerOptions = {
    threshold: 0.5,
    rootMargin: '0px'
};

const skillObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const progressBars = entry.target.querySelectorAll('.skill-progress');
            progressBars.forEach(bar => {
                const progress = bar.getAttribute('data-progress');
                bar.style.width = progress + '%';
            });
        }
    });
}, observerOptions);

const skillsSection = document.querySelector('.skills');
if (skillsSection) {
    skillObserver.observe(skillsSection);
}

document.querySelectorAll('.btn-copy').forEach(button => {
    button.addEventListener('click', function() {
        const codeBlock = this.previousElementSibling.querySelector('code');
        const code = codeBlock.textContent;
        
        navigator.clipboard.writeText(code).then(() => {
            const originalText = this.textContent;
            this.textContent = '✓ Copiado!';
            this.style.background = 'var(--primary-color)';
            this.style.color = 'var(--bg-darker)';
            
            setTimeout(() => {
                this.textContent = originalText;
                this.style.background = 'transparent';
                this.style.color = 'var(--primary-color)';
            }, 2000);
        });
    });
});

const canvas = document.getElementById('snakeCanvas');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const restartBtn = document.getElementById('restartBtn');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('highScore');
const finalScoreElement = document.getElementById('finalScore');
const gameOverElement = document.getElementById('gameOver');

const gridSize = 20;
const tileCount = canvas.width / gridSize;

let gameSpeed = parseInt(localStorage.getItem('snakeGameSpeed')) || 100;

function setGameSpeed(ms) {
    gameSpeed = ms;
    localStorage.setItem('snakeGameSpeed', String(ms));
    if (gameLoop) {
        clearInterval(gameLoop);
        gameLoop = setInterval(drawGame, gameSpeed);
    }
}

function createSpeedControl() {
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.right = '12px';
    container.style.bottom = '12px';
    container.style.background = 'rgba(10,14,39,0.9)';
    container.style.color = '#fff';
    container.style.padding = '8px 10px';
    container.style.borderRadius = '8px';
    container.style.zIndex = '9999';
    container.style.fontSize = '13px';
    container.style.display = 'flex';
    container.style.alignItems = 'center';
    container.style.gap = '8px';

    const label = document.createElement('span');
    label.textContent = 'Velocidade';
    container.appendChild(label);

    const select = document.createElement('select');
    const options = [
        { label: '0.5x', value: 200 },
        { label: '0.75x', value: 150 },
        { label: '1x', value: 100 },
        { label: '1.25x', value: 80 },
        { label: '1.5x', value: 66 },
        { label: '2x', value: 50 }
    ];
    options.forEach(opt => {
        const o = document.createElement('option');
        o.value = String(opt.value);
        o.textContent = opt.label;
        select.appendChild(o);
    });
    select.value = String(gameSpeed);
    select.addEventListener('change', () => setGameSpeed(parseInt(select.value)));

    container.appendChild(select);
    document.body.appendChild(container);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createSpeedControl);
} else {
    createSpeedControl();
}


let snake = [{ x: 10, y: 10 }];
let velocity = { x: 0, y: 0 };
let food = { x: 15, y: 15 };
let score = 0;
let highScore = localStorage.getItem('snakeHighScore') || 0;
let gameLoop = null;
let isPaused = false;
let gameStarted = false;

highScoreElement.textContent = highScore;

function drawGame() {
    if (isPaused) return;
    
    ctx.fillStyle = '#1a1f3a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    if (gameStarted) {
        const head = { x: snake[0].x + velocity.x, y: snake[0].y + velocity.y };
        
        if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) {
            gameOver();
            return;
        }
        
        for (let i = 0; i < snake.length; i++) {
            if (head.x === snake[i].x && head.y === snake[i].y) {
                gameOver();
                return;
            }
        }
        
        snake.unshift(head);
        
        if (head.x === food.x && head.y === food.y) {
            score++;
            scoreElement.textContent = score;
            placeFood();
        } else {
            snake.pop();
        }
    }
    
    snake.forEach((segment, index) => {
        ctx.fillStyle = index === 0 ? '#00d9ff' : '#4facfe';
        ctx.fillRect(segment.x * gridSize, segment.y * gridSize, gridSize - 2, gridSize - 2);
        
        if (index === 0) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#00d9ff';
        } else {
            ctx.shadowBlur = 0;
        }
    });
    
    ctx.fillStyle = '#f97316';
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#f97316';
    ctx.beginPath();
    ctx.arc(
        food.x * gridSize + gridSize / 2,
        food.y * gridSize + gridSize / 2,
        gridSize / 2 - 2,
        0,
        Math.PI * 2
    );
    ctx.fill();
    ctx.shadowBlur = 0;
    
    ctx.strokeStyle = 'rgba(0, 217, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= tileCount; i++) {
        ctx.beginPath();
        ctx.moveTo(i * gridSize, 0);
        ctx.lineTo(i * gridSize, canvas.height);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(0, i * gridSize);
        ctx.lineTo(canvas.width, i * gridSize);
        ctx.stroke();
    }
}

function placeFood() {
    let newFood;
    do {
        newFood = {
            x: Math.floor(Math.random() * tileCount),
            y: Math.floor(Math.random() * tileCount)
        };
    } while (snake.some(segment => segment.x === newFood.x && segment.y === newFood.y));
    
    food = newFood;
}

function gameOver() {
    clearInterval(gameLoop);
    gameLoop = null;
    gameStarted = false;
    
    if (score > highScore) {
        highScore = score;
        highScoreElement.textContent = highScore;
        localStorage.setItem('snakeHighScore', highScore);
    }
    
    finalScoreElement.textContent = score;
    gameOverElement.classList.add('active');
    startBtn.disabled = false;
    pauseBtn.disabled = true;
}

function startGame() {
    if (gameLoop) return;
    
    snake = [{ x: 10, y: 10 }];
    velocity = { x: 1, y: 0 };
    score = 0;
    scoreElement.textContent = score;
    isPaused = false;
    gameStarted = true;
    
    placeFood();
    gameOverElement.classList.remove('active');
    
    gameLoop = setInterval(drawGame, gameSpeed);
    startBtn.disabled = true;
    pauseBtn.disabled = false;
}

function togglePause() {
    isPaused = !isPaused;
    pauseBtn.textContent = isPaused ? 'Retomar' : 'Pausar';
    if (!isPaused) {
        drawGame();
    }
}

startBtn.addEventListener('click', startGame);
pauseBtn.addEventListener('click', togglePause);
restartBtn.addEventListener('click', () => {
    gameOverElement.classList.remove('active');
    startGame();
});

document.addEventListener('keydown', (e) => {
    if (!gameStarted) return;
    
    switch(e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
            if (velocity.y === 0) {
                velocity = { x: 0, y: -1 };
            }
            e.preventDefault();
            break;
        case 'ArrowDown':
        case 's':
        case 'S':
            if (velocity.y === 0) {
                velocity = { x: 0, y: 1 };
            }
            e.preventDefault();
            break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
            if (velocity.x === 0) {
                velocity = { x: -1, y: 0 };
            }
            e.preventDefault();
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            if (velocity.x === 0) {
                velocity = { x: 1, y: 0 };
            }
            e.preventDefault();
            break;
    }
});

drawGame();

const contactForm = document.getElementById('contactForm');
contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const message = document.getElementById('message').value;
    
    alert(`Obrigado pelo contato, ${name}! Em breve retornaremos sua mensagem.`);
    
    contactForm.reset();
});

const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');

hamburger.addEventListener('click', () => {
    navMenu.style.display = navMenu.style.display === 'flex' ? 'none' : 'flex';
});

const fadeObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, { threshold: 0.1 });

document.querySelectorAll('section').forEach(section => {
    section.style.opacity = '0';
    section.style.transform = 'translateY(30px)';
    section.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
    fadeObserver.observe(section);
});

window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const hero = document.querySelector('.hero');
    if (hero) {
        hero.style.transform = `translateY(${scrolled * 0.5}px)`;
    }
});

const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-link');

window.addEventListener('scroll', () => {
    let current = '';
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        if (pageYOffset >= sectionTop - 200) {
            current = section.getAttribute('id');
        }
    });
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${current}`) {
            link.classList.add('active');
        }
    });
});

document.querySelectorAll('.project-card').forEach(card => {
    card.addEventListener('click', function() {
        const projectTitle = this.querySelector('h3').textContent;
        alert(`Projeto: ${projectTitle}\n\nClique em ver detalhes!`);
    });
});

const style = document.createElement('style');
style.textContent = `
    @keyframes float {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-10px); }
    }
    
    .stat-item {
        animation: float 3s ease-in-out infinite;
    }
    
    .stat-item:nth-child(2) {
        animation-delay: 0.5s;
    }
    
    .stat-item:nth-child(3) {
        animation-delay: 1s;
    }
`;
document.head.appendChild(style);

console.log('Portfolio carregado com sucesso.');
console.log('Desenvolvido com HTML, CSS e JavaScript puro.');
console.log('Aproveite o jogo da cobrinha.');
