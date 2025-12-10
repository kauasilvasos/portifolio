// Dados de produtos simulados
const mockProducts = [
    { id: 1, name: 'Notebook Dell', quantity: 150, price: 3999.90, status: 'Ativo' },
    { id: 2, name: 'Mouse Logitech', quantity: 45, price: 149.90, status: 'Baixo Estoque' },
    { id: 3, name: 'Teclado Mecânico', quantity: 320, price: 799.90, status: 'Ativo' },
    { id: 4, name: 'Monitor 27"', quantity: 8, price: 1999.90, status: 'Crítico' },
    { id: 5, name: 'Webcam 4K', quantity: 250, price: 599.90, status: 'Ativo' },
    { id: 6, name: 'Headset Gamer', quantity: 75, price: 449.90, status: 'Ativo' },
    { id: 7, name: 'SSD 1TB', quantity: 12, price: 599.90, status: 'Crítico' },
    { id: 8, name: 'Memória RAM 16GB', quantity: 180, price: 299.90, status: 'Ativo' },
];

// Renderizar tabela de produtos
function renderProductsTable() {
    const tbody = document.getElementById('productsTable');
    
    if (!tbody) {
        console.error('Elemento productsTable não encontrado');
        return;
    }
    
    tbody.innerHTML = ''; // Limpar tabela
    
    mockProducts.forEach(product => {
        const row = document.createElement('tr');
        let statusClass = 'status-active';
        
        if (product.status === 'Baixo Estoque') {
            statusClass = 'status-warning';
        } else if (product.status === 'Crítico') {
            statusClass = 'status-critical';
        }
        
        row.innerHTML = `
            <td>${product.id}</td>
            <td>${product.name}</td>
            <td>${product.quantity}</td>
            <td>R$ ${product.price.toFixed(2)}</td>
            <td><span class="status ${statusClass}">${product.status}</span></td>
        `;
        tbody.appendChild(row);
    });
}

// Adicionar estilos para os status
function addStatusStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .status {
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 0.85rem;
            font-weight: 600;
        }
        
        .status-active {
            background: rgba(52, 211, 153, 0.2);
            color: #34d399;
            border: 1px solid #34d399;
        }
        
        .status-warning {
            background: rgba(245, 158, 11, 0.2);
            color: #f59e0b;
            border: 1px solid #f59e0b;
        }
        
        .status-critical {
            background: rgba(239, 68, 68, 0.2);
            color: #ef4444;
            border: 1px solid #ef4444;
        }
    `;
    document.head.appendChild(style);
}

// Animação de entrada suave
function animateSections() {
    document.querySelectorAll('.project-section').forEach((section, index) => {
        section.style.opacity = '0';
        section.style.transform = 'translateY(20px)';
        section.style.transition = `opacity 0.6s ease, transform 0.6s ease`;
        section.style.transitionDelay = `${index * 0.1}s`;
        
        setTimeout(() => {
            section.style.opacity = '1';
            section.style.transform = 'translateY(0)';
        }, 10);
    });
}

// Inicializar página
document.addEventListener('DOMContentLoaded', () => {
    console.log('Sistema de Gerenciamento carregado');
    addStatusStyles();
    renderProductsTable();
    animateSections();
    
    // Simular atualização de dados a cada 5 segundos
    setInterval(() => {
        mockProducts.forEach(product => {
            if (Math.random() > 0.7) {
                product.quantity = Math.max(0, product.quantity + Math.floor(Math.random() * 20 - 10));
                
                // Atualizar status baseado na quantidade
                if (product.quantity === 0) {
                    product.status = 'Indisponível';
                } else if (product.quantity < 20) {
                    product.status = 'Crítico';
                } else if (product.quantity < 50) {
                    product.status = 'Baixo Estoque';
                } else {
                    product.status = 'Ativo';
                }
            }
        });
        renderProductsTable();
    }, 5000);
});