// supabase-config.js
const SUPABASE_URL = 'https://frkmacxtiwbpnxmaofxq.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_rkaKOLf0E-2quUUztk84Fw_Y7esr1yJ';

// Инициализация Supabase
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
    }
});

// Состояние приложения
window.appState = {
    currentUser: null,
    selectedChat: null,
    onlineUsers: new Map(),
    friends: new Map(),
    activeCall: null,
    theme: localStorage.getItem('theme') || 'dark',
    animations: localStorage.getItem('animations') !== 'false'
};

// Инициализация
async function initApp() {
    console.log('Initializing app...');
    
    // Сначала прячем прелоадер
    const preloader = document.getElementById('preloader');
    if (preloader) {
        setTimeout(() => {
            preloader.style.display = 'none';
        }, 1000);
    }
    
    try {
        // Проверяем сессию
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        
        if (error) {
            console.error('Session error:', error);
            showAuth();
            return;
        }
        
        if (session && session.user) {
            console.log('User logged in:', session.user.email);
            await loadUserProfile(session.user.id);
            showApp();
        } else {
            console.log('No session found');
            showAuth();
        }
    } catch (error) {
        console.error('Init error:', error);
        showAuth();
    }
}

async function loadUserProfile(userId) {
    try {
        const { data, error } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
        
        if (error) {
            console.error('Error loading profile:', error);
            // Создаем тестовый профиль если нет в базе
            window.appState.currentUser = {
                id: userId,
                username: 'User',
                email: 'user@example.com'
            };
        } else {
            window.appState.currentUser = data;
        }
    } catch (error) {
        console.error('Profile load error:', error);
        window.appState.currentUser = {
            id: userId,
            username: 'User',
            email: 'user@example.com'
        };
    }
}

function showApp() {
    console.log('Showing app...');
    const authSection = document.getElementById('authSection');
    const appContainer = document.getElementById('appContainer');
    
    if (authSection) authSection.style.display = 'none';
    if (appContainer) {
        appContainer.style.display = 'flex';
        applyTheme();
        
        // Обновляем UI если есть пользователь
        if (window.appState.currentUser) {
            const usernameEl = document.getElementById('currentUsername');
            if (usernameEl && window.appState.currentUser.username) {
                usernameEl.textContent = window.appState.currentUser.username;
            }
        }
    }
}

function showAuth() {
    console.log('Showing auth...');
    const authSection = document.getElementById('authSection');
    const appContainer = document.getElementById('appContainer');
    const preloader = document.getElementById('preloader');
    
    if (preloader) preloader.style.display = 'none';
    if (appContainer) appContainer.style.display = 'none';
    if (authSection) authSection.style.display = 'flex';
}

function applyTheme() {
    const theme = window.appState.theme;
    if (theme && document.documentElement) {
        document.documentElement.setAttribute('data-theme', theme);
    }
}

// Функции аутентификации для использования в app.js
async function loginUser(email, password) {
    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) throw error;
        
        await loadUserProfile(data.user.id);
        showApp();
        return { success: true };
    } catch (error) {
        console.error('Login error:', error);
        return { success: false, error: error.message };
    }
}

async function registerUser(email, password, username) {
    try {
        const { data, error } = await supabaseClient.auth.signUp({
            email: email,
            password: password,
            options: {
                data: { username: username }
            }
        });
        
        if (error) throw error;
        
        return { success: true };
    } catch (error) {
        console.error('Register error:', error);
        return { success: false, error: error.message };
    }
}

async function logoutUser() {
    try {
        const { error } = await supabaseClient.auth.signOut();
        if (error) throw error;
        
        window.appState.currentUser = null;
        showAuth();
        return { success: true };
    } catch (error) {
        console.error('Logout error:', error);
        return { success: false, error: error.message };
    }
}

// Экспорт
window.supabaseClient = supabaseClient;
window.initApp = initApp;
window.showApp = showApp;
window.showAuth = showAuth;
window.applyTheme = applyTheme;
window.loginUser = loginUser;
window.registerUser = registerUser;
window.logoutUser = logoutUser;

// Добавляем fallback на случай ошибок
window.addEventListener('error', function(e) {
    console.error('Global error:', e.error);
    
    // Показываем форму входа если есть критическая ошибка
    const authSection = document.getElementById('authSection');
    const preloader = document.getElementById('preloader');
    
    if (preloader) preloader.style.display = 'none';
    if (authSection) authSection.style.display = 'flex';
});

// Запуск при загрузке
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, starting app...');
    
    // Добавляем небольшую задержку для стабильности
    setTimeout(() => {
        initApp();
    }, 500);
});
