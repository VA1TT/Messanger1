// Конфигурация Supabase
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

// Инициализация Supabase
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let selectedUser = null;
let peerConnection = null;
let localStream = null;
let remoteStream = null;

// Замените эти значения на свои из Supabase Dashboard
console.log('ВАЖНО: Замените SUPABASE_URL и SUPABASE_ANON_KEY в supabase-config.js на свои значения!');