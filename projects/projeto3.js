console.log('Dashboard Analytics Project loaded');

// Simular atualização em tempo real
setInterval(() => {
    const activeSessionsElement = document.querySelector('.metric-card:nth-child(4) .metric-value');
    if (activeSessionsElement) {
        const currentValue = parseInt(activeSessionsElement.textContent);
        const newValue = currentValue + Math.floor(Math.random() * 20 - 10);
        activeSessionsElement.textContent = Math.max(newValue, 300);
    }
}, 3000);

// Animação de entrada suave
document.querySelectorAll('.project-section').forEach((section, index) => {
    section.style.animationDelay = `${index * 0.1}s`;
    section.classList.add('fade-in-up');
});