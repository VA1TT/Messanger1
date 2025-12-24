// Основной файл приложения
let onlineUsers = new Map();
let authState = 'login'; // 'login' или 'signup'

// Переключение между логином и регистрацией
function toggleAuthMode() {
    const loginForm = document.getElementById('loginForm');
    const toggleBtn = document.getElementById('toggleAuthBtn');
    
    if (authState === 'login') {
        authState = 'signup';
        document.getElementById('authTitle').textContent = 'Регистрация';
        document.getElementById('submitAuthBtn').textContent = 'Зарегистрироваться';
        toggleBtn.textContent = 'Уже есть аккаунт? Войти';
        document.getElementById('authNote').style.display = 'block';
    } else {
        authState = 'login';
        document.getElementById('authTitle').textContent = 'Вход';
        document.getElementById('submitAuthBtn').textContent = 'Войти';
        toggleBtn.textContent = 'Нет аккаунта? Зарегистрироваться';
        document.getElementById('authNote').style.display = 'none';
    }
}

// Основная функция аутентификации
async function handleAuth() {
    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const authError = document.getElementById('authError');

    // Очищаем предыдущие ошибки
    authError.textContent = '';
    authError.style.display = 'none';

    // Валидация
    if (!username || username.length < 3) {
        showError('Имя пользователя должно быть не менее 3 символов');
        return;
    }

    if (authState === 'signup' && !validateEmail(email)) {
        showError('Введите корректный email');
        return;
    }

    if (!password || password.length < 6) {
        showError('Пароль должен быть не менее 6 символов');
        return;
    }

    try {
        if (authState === 'signup') {
            await signup(username, email, password);
        } else {
            await login(username, password);
        }
    } catch (error) {
        showError(error.message);
    }
}

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function showError(message) {
    const authError = document.getElementById('authError');
    authError.textContent = message;
    authError.style.display = 'block';
}

async function signup(username, email, password) {
    console.log('Регистрация:', { username, email });
    
    // Проверяем, существует ли пользователь с таким username
    const { data: existingUser } = await supabase
        .from('users')
        .select('username')
        .eq('username', username)
        .single();

    if (existingUser) {
        throw new Error('Пользователь с таким именем уже существует');
    }

    // Регистрируем пользователя в Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
            data: {
                username: username
            }
        }
    });

    if (authError) {
        throw new Error('Ошибка регистрации: ' + authError.message);
    }

    console.log('Пользователь зарегистрирован:', authData);
    
    if (authData.user) {
        // Добавляем пользователя в таблицу users
        const { error: dbError } = await supabase
            .from('users')
            .insert({
                id: authData.user.id,
                username: username,
                email: email
            });

        if (dbError && !dbError.message.includes('duplicate key')) {
            console.error('Ошибка добавления в базу:', dbError);
        }

        // Автоматически входим после регистрации
        await login(username, password);
    }
}

async function login(username, password) {
    console.log('Вход:', username);
    
    // Сначала проверяем, есть ли пользователь в нашей таблице
    const { data: userData } = await supabase
        .from('users')
        .select('email')
        .eq('username', username)
        .single();

    let loginEmail = userData?.email || `${username}@messenger.local`;

    // Пробуем войти
    const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: password
    });

    if (error) {
        // Если не получилось, пробуем с дефолтным email
        if (loginEmail !== `${username}@messenger.local`) {
            const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
                email: `${username}@messenger.local`,
                password: password
            });
            
            if (retryError) {
                throw new Error('Неверное имя пользователя или пароль');
            }
            
            currentUser = {
                id: retryData.user.id,
                username: username,
                email: retryData.user.email
            };
        } else {
            throw new Error('Неверное имя пользователя или пароль');
        }
    } else {
        currentUser = {
            id: data.user.id,
            username: data.user.user_metadata?.username || username,
            email: data.user.email
        };
    }

    console.log('Вход выполнен:', currentUser);
    showMainApp();
    loadOnlineUsers();
    setupRealtime();
}

async function logout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error('Ошибка выхода:', error);
    }
    
    currentUser = null;
    selectedUser = null;
    hideMainApp();
}

// Интерфейс
function showMainApp() {
    document.getElementById('authSection').style.display = 'none';
    document.getElementById('mainSection').style.display = 'flex';
    document.getElementById('currentUsername').textContent = currentUser.username;
}

function hideMainApp() {
    document.getElementById('authSection').style.display = 'flex';
    document.getElementById('mainSection').style.display = 'none';
    
    // Сбрасываем форму
    document.getElementById('username').value = '';
    document.getElementById('email').value = '';
    document.getElementById('password').value = '';
    document.getElementById('authError').style.display = 'none';
    authState = 'login';
    document.getElementById('authTitle').textContent = 'Вход';
    document.getElementById('submitAuthBtn').textContent = 'Войти';
    document.getElementById('toggleAuthBtn').textContent = 'Нет аккаунта? Зарегистрироваться';
    document.getElementById('authNote').style.display = 'none';
}

// Работа с пользователями
async function loadOnlineUsers() {
    const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .neq('id', currentUser.id);

    if (error) {
        console.error('Ошибка загрузки пользователей:', error);
        return;
    }

    const onlineUsersList = document.getElementById('onlineUsers');
    onlineUsersList.innerHTML = '';

    users.forEach(user => {
        const li = document.createElement('li');
        li.textContent = user.username;
        li.onclick = () => selectUser(user);
        onlineUsersList.appendChild(li);
        onlineUsers.set(user.id, user);
    });
}

function selectUser(user) {
    selectedUser = user;
    document.getElementById('chatWithUser').textContent = `Чат с ${user.username}`;
    document.getElementById('callBtn').disabled = false;
    document.getElementById('messageInput').disabled = false;
    document.getElementById('sendBtn').disabled = false;
    
    // Убираем выделение у всех пользователей
    document.querySelectorAll('#onlineUsers li').forEach(li => {
        li.classList.remove('active');
    });
    
    // Добавляем выделение выбранному
    document.querySelectorAll('#onlineUsers li').forEach(li => {
        if (li.textContent === user.username) {
            li.classList.add('active');
        }
    });
    
    loadMessages();
}

// Чат
async function loadMessages() {
    if (!selectedUser) return;

    const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${selectedUser.id}),and(sender_id.eq.${selectedUser.id},receiver_id.eq.${currentUser.id})`)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Ошибка загрузки сообщений:', error);
        return;
    }

    const chatMessages = document.getElementById('chatMessages');
    chatMessages.innerHTML = '';

    messages.forEach(msg => {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${msg.sender_id === currentUser.id ? 'sent' : 'received'}`;
        messageDiv.textContent = msg.content;
        chatMessages.appendChild(messageDiv);
    });

    chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function sendMessage() {
    const input = document.getElementById('messageInput');
    const message = input.value.trim();

    if (!message || !selectedUser) return;

    const { error } = await supabase
        .from('messages')
        .insert({
            sender_id: currentUser.id,
            receiver_id: selectedUser.id,
            content: message
        });

    if (error) {
        console.error('Ошибка отправки сообщения:', error);
        return;
    }

    input.value = '';
    loadMessages();
}

// Настройка realtime
function setupRealtime() {
    // Подписка на новые сообщения
    const channel = supabase
        .channel('messages')
        .on('postgres_changes', 
            { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'messages',
                filter: `receiver_id=eq.${currentUser.id}`
            }, 
            (payload) => {
                console.log('Новое сообщение:', payload);
                if (selectedUser && payload.new.sender_id === selectedUser.id) {
                    loadMessages();
                } else if (payload.new.sender_id !== currentUser.id) {
                    // Уведомление о новом сообщении от другого пользователя
                    showNotification(payload.new.sender_id);
                }
            }
        )
        .subscribe();

    // Подписка на изменения пользователей
    supabase
        .channel('online-users')
        .on('postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'users'
            },
            () => {
                loadOnlineUsers();
            }
        )
        .subscribe();
}

function showNotification(senderId) {
    const sender = onlineUsers.get(senderId);
    if (sender) {
        if (Notification.permission === 'granted') {
            new Notification(`Новое сообщение от ${sender.username}`);
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    new Notification(`Новое сообщение от ${sender.username}`);
                }
            });
        }
    }
}

// WebRTC звонки
async function startCall() {
    if (!selectedUser) {
        alert('Выберите пользователя для звонка');
        return;
    }

    try {
        document.querySelector('.call-section').style.display = 'flex';
        document.getElementById('callBtn').disabled = true;
        document.getElementById('hangupBtn').disabled = false;

        // Получаем медиапоток
        localStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });

        document.getElementById('localVideo').srcObject = localStream;

        // Создаем peer connection
        peerConnection = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        });

        // Добавляем локальный поток
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });

        // Получаем удаленный поток
        peerConnection.ontrack = (event) => {
            if (!remoteStream) {
                remoteStream = new MediaStream();
                document.getElementById('remoteVideo').srcObject = remoteStream;
            }
            event.streams[0].getTracks().forEach(track => {
                remoteStream.addTrack(track);
            });
        };

        // Создаем предложение
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);

        // Отправляем offer через Supabase Realtime
        const channel = supabase.channel(`call-${selectedUser.id}`);

        channel.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                channel.send({
                    type: 'broadcast',
                    event: 'offer',
                    payload: {
                        from: currentUser.id,
                        offer: offer
                    }
                });
            }
        });

        // Ждем ответ
        const { data } = await supabase
            .channel(`call-${currentUser.id}`)
            .on('broadcast', { event: 'answer' }, (payload) => {
                if (payload.payload.from === selectedUser.id) {
                    peerConnection.setRemoteDescription(payload.payload.answer);
                }
            })
            .subscribe();

    } catch (error) {
        console.error('Ошибка начала звонка:', error);
        alert('Не удалось начать звонок: ' + error.message);
        hangUp();
    }
}

function hangUp() {
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }

    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }

    if (remoteStream) {
        remoteStream.getTracks().forEach(track => track.stop());
        remoteStream = null;
    }

    document.getElementById('localVideo').srcObject = null;
    document.getElementById('remoteVideo').srcObject = null;
    document.querySelector('.call-section').style.display = 'none';
    document.getElementById('callBtn').disabled = false;
    document.getElementById('hangupBtn').disabled = true;
}

function toggleMute() {
    if (localStream) {
        const audioTrack = localStream.getAudioTracks()[0];
        audioTrack.enabled = !audioTrack.enabled;
        document.getElementById('muteBtn').textContent = 
            audioTrack.enabled ? '🔇 Выключить звук' : '🔈 Включить звук';
    }
}

function toggleVideo() {
    if (localStream) {
        const videoTrack = localStream.getVideoTracks()[0];
        videoTrack.enabled = !videoTrack.enabled;
        document.getElementById('videoBtn').textContent = 
            videoTrack.enabled ? '📹 Выключить видео' : '📹 Включить видео';
    }
}

// Обработчики событий
function initEventListeners() {
    // Отправка сообщения по Enter
    document.getElementById('messageInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    // Авторизация по Enter
    document.getElementById('password').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleAuth();
        }
    });

    // Инициализация кнопок
    document.getElementById('submitAuthBtn').onclick = handleAuth;
    document.getElementById('toggleAuthBtn').onclick = toggleAuthMode;
    document.getElementById('callBtn').onclick = startCall;
    document.getElementById('hangupBtn').onclick = hangUp;
    document.getElementById('muteBtn').onclick = toggleMute;
    document.getElementById('videoBtn').onclick = toggleVideo;
}

// Проверяем авторизацию при загрузке
async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
        const { data: { user } } = await supabase.auth.getUser();
        
        // Получаем username из таблицы users
        const { data: userData } = await supabase
            .from('users')
            .select('username')
            .eq('id', user.id)
            .single();

        currentUser = {
            id: user.id,
            username: userData?.username || user.email?.split('@')[0] || 'Пользователь',
            email: user.email
        };

        console.log('Автоматический вход:', currentUser);
        showMainApp();
        loadOnlineUsers();
        setupRealtime();
    }
}

// Инициализация при загрузке
window.onload = function() {
    initEventListeners();
    checkAuth();
    
    // Запрашиваем разрешение на уведомления
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
};
