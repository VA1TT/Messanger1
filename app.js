// app.js - НАЧАЛО ФАЙЛА
console.log('app.js loaded');

// Основные функции приложения
function showNotification(message, type = 'info') {
    console.log('Notification:', message);
    // Простая реализация
    alert(message);
}

// Функции для друзей
async function sendFriendRequest(toUserId) {
    console.log('Sending friend request to:', toUserId);
    showNotification('Запрос в друзья отправлен');
}

async function acceptFriendRequest(requestId) {
    console.log('Accepting friend request:', requestId);
    showNotification('Запрос в друзья принят');
}

async function rejectFriendRequest(requestId) {
    console.log('Rejecting friend request:', requestId);
    showNotification('Запрос в друзья отклонен');
}

// Обработчики событий
document.addEventListener('DOMContentLoaded', function() {
    console.log('App initialized');
    
    // Простой вход для теста
    const loginBtn = document.querySelector('#loginForm button[type="submit"]');
    if (loginBtn) {
        loginBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Login clicked');
            // Тестовый вход
            document.getElementById('authSection').style.display = 'none';
            document.getElementById('appContainer').style.display = 'flex';
        });
    }
    
    // Кнопка выхода
    const logoutBtn = document.querySelector('.btn-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            console.log('Logout clicked');
            document.getElementById('appContainer').style.display = 'none';
            document.getElementById('authSection').style.display = 'flex';
        });
    }
    
    // Переключение табов аутентификации
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tab = this.getAttribute('data-tab');
            console.log('Tab clicked:', tab);
            
            // Обновляем активные табы
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // Переключаем формы
            document.querySelectorAll('.form-content').forEach(form => {
                form.classList.remove('active');
            });
            
            if (tab === 'login') {
                document.getElementById('loginForm').classList.add('active');
                document.getElementById('authTitle').textContent = 'Вход';
            } else {
                document.getElementById('registerForm').classList.add('active');
                document.getElementById('authTitle').textContent = 'Регистрация';
            }
        });
    });
});
