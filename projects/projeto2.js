console.log('API RESTful Project loaded');

// Animação de endpoints
document.querySelectorAll('.endpoint').forEach((endpoint, index) => {
    endpoint.style.animationDelay = `${index * 0.1}s`;
    endpoint.classList.add('fade-in-up');
});