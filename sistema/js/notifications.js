// Sistema de Notificações
class NotificationSystem {
    constructor() {
        this.container = this.createContainer();
        this.notifications = [];
        this.maxNotifications = 3;
    }

    createContainer() {
        const container = document.createElement('div');
        container.className = 'notifications-container';
        document.body.appendChild(container);
        return container;
    }

    show(type, title, message, duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        const icon = this.getIconForType(type);
        
        notification.innerHTML = `
            <i class="${icon}"></i>
            <div class="notification-content">
                <div class="notification-title">${title}</div>
                <div class="notification-message">${message}</div>
            </div>
        `;

        this.container.appendChild(notification);
        this.notifications.push(notification);

        // Remover notificações antigas se exceder o limite
        while (this.notifications.length > this.maxNotifications) {
            const oldNotification = this.notifications.shift();
            oldNotification.remove();
        }

        // Remover após a duração especificada
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => {
                notification.remove();
                this.notifications = this.notifications.filter(n => n !== notification);
            }, 500);
        }, duration);
    }

    getIconForType(type) {
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-times-circle',
            warning: 'fas fa-exclamation-circle',
            info: 'fas fa-info-circle'
        };
        return icons[type] || icons.info;
    }
}

// Sistema de Lembretes de Pontos Pendentes
class PendingPointsReminder {
    constructor() {
        this.banner = null;
        this.checkInterval = 30 * 60 * 1000; // 30 minutos
        this.lastCheck = 0;
    }

    createBanner(message) {
        if (this.banner) {
            this.banner.remove();
        }

        this.banner = document.createElement('div');
        this.banner.className = 'pending-points-banner';
        this.banner.innerHTML = `
            <i class="fas fa-clock"></i>
            <span>${message}</span>
        `;
        document.body.appendChild(this.banner);
    }

    async checkPendingPoints() {
        const now = Date.now();
        if (now - this.lastCheck < this.checkInterval) {
            return;
        }
        this.lastCheck = now;

        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const response = await fetch('http://localhost:3000/registros/hoje', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) return;

            const registros = await response.json();
            const pendencia = this.verificarPendencia(registros);
            
            if (pendencia) {
                this.createBanner(pendencia);
            } else if (this.banner) {
                this.banner.remove();
                this.banner = null;
            }
        } catch (error) {
            console.error('Erro ao verificar pontos pendentes:', error);
        }
    }

    verificarPendencia(registros) {
        if (!registros || registros.length === 0) {
            return '⏰ Você tem pontos pendentes hoje! (Nenhum registro)';
        }

        const ultimoRegistro = registros[registros.length - 1];
        const tiposPendentes = {
            entrada: 'Saída ou Almoço',
            almoco: 'Retorno',
            retorno: 'Saída',
            intervalo_inicio: 'Intervalo Fim'
        };

        if (tiposPendentes[ultimoRegistro.tipoPonto]) {
            return `⏰ Você tem pontos pendentes hoje! (Próximo: ${tiposPendentes[ultimoRegistro.tipoPonto]})`;
        }

        return null;
    }

    startChecking() {
        this.checkPendingPoints();
        setInterval(() => this.checkPendingPoints(), this.checkInterval);
    }
}

// Manual do Usuário Rápido
class QuickManual {
    constructor() {
        this.createButton();
        this.createContent();
        this.setupEventListeners();
    }

    createButton() {
        this.button = document.createElement('div');
        this.button.className = 'quick-manual';
        this.button.innerHTML = `
            <button class="quick-manual-button">
                <i class="fas fa-question"></i>
            </button>
        `;
        document.body.appendChild(this.button);
    }

    createContent() {
        this.content = document.createElement('div');
        this.content.className = 'quick-manual-content';
        this.content.innerHTML = `
            <h3>Como Registrar seu Ponto</h3>
            <ul>
                <li><i class="fas fa-clock"></i> 08:00 - Entrada</li>
                <li><i class="fas fa-utensils"></i> 12:00 - Almoço</li>
                <li><i class="fas fa-undo"></i> 13:00 - Retorno</li>
                <li><i class="fas fa-home"></i> 18:00 - Saída</li>
            </ul>
            <p><small>Intervalos opcionais: Início → Fim</small></p>
        `;
        this.button.appendChild(this.content);
    }

    setupEventListeners() {
        this.button.addEventListener('click', (e) => {
            if (e.target.closest('.quick-manual-button')) {
                this.content.classList.toggle('show');
            }
        });

        document.addEventListener('click', (e) => {
            if (!this.button.contains(e.target)) {
                this.content.classList.remove('show');
            }
        });

        // Auto-fechar após 10 segundos
        this.button.addEventListener('mouseenter', () => {
            clearTimeout(this.closeTimeout);
        });

        this.button.addEventListener('mouseleave', () => {
            this.closeTimeout = setTimeout(() => {
                this.content.classList.remove('show');
            }, 10000);
        });
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    window.notificationSystem = new NotificationSystem();
    window.pendingPointsReminder = new PendingPointsReminder();
    window.quickManual = new QuickManual();

    // Iniciar verificação de pontos pendentes
    window.pendingPointsReminder.startChecking();
}); 