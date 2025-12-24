// Конфигурация Supabase
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
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
    // Проверяем сессию
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
        await loadUserProfile(session.user.id);
        showApp();
    } else {
        showAuth();
    }
}

async function loadUserProfile(userId) {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
    
    if (error) {
        console.error('Error loading profile:', error);
        return;
    }
    
    window.appState.currentUser = data;
}

function showApp() {
    document.getElementById('authSection').style.display = 'none';
    document.getElementById('appContainer').style.display = 'flex';
    applyTheme();
}

function showAuth() {
    document.getElementById('authSection').style.display = 'flex';
    document.getElementById('appContainer').style.display = 'none';
}

function applyTheme() {
    document.documentElement.setAttribute('data-theme', window.appState.theme);
}

// Экспорт
window.supabaseClient = supabase;
window.initApp = initApp;
window.showApp = showApp;
window.showAuth = showAuth;
window.applyTheme = applyTheme;

// Запуск при загрузке
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});
