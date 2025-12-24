// supabase-config.js - САМАЯ ПРОСТАЯ РАБОЧАЯ ВЕРСИЯ
const SUPABASE_URL = 'https://frkmacxtiwbpnxmaofxq.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_rkaKOLf0E-2quUUztk84Fw_Y7esr1yJ';

// Простая инициализация без сложных параметров
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Прячем прелоадер и показываем форму входа
setTimeout(() => {
    const preloader = document.getElementById('preloader');
    const authSection = document.getElementById('authSection');
    
    if (preloader) preloader.style.display = 'none';
    if (authSection) authSection.style.display = 'flex';
    
    console.log('App ready for login');
}, 1500);

// Экспорт
window.supabaseClient = supabaseClient;
