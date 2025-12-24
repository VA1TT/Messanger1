// Конфигурация Supabase - ЗАМЕНИТЕ НА СВОИ ДАННЫЕ!
const SUPABASE_URL = 'https://frkmacxtiwbpnxmaofxq.supabase.co'; // Замените на ваш URL
const SUPABASE_ANON_KEY = 'sb_publishable_rkaKOLf0E-2quUUztk84Fw_Y7esr1yJ'; // Замените на ваш ключ

// Инициализация Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let selectedUser = null;
let peerConnection = null;
let localStream = null;
let remoteStream = null;

// Экспортируем переменные
window.supabaseClient = supabase;
window.currentUser = currentUser;
window.selectedUser = selectedUser;
