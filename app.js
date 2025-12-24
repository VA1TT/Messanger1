// Основной файл приложения
let onlineUsers = new Map();

// Функции аутентификации
async function signup() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    const { data, error } = await supabase.auth.signUp({
        email: `${username}@messenger.com`,
        password: password,
        options: {
            data: {
                username: username
            }
        }
    });

    if (error) {
        alert('Ошибка регистрации: ' + error.message);
        return;
    }

    await login();
}

async function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    const { data, error } = await supabase.auth.signInWithPassword({
        email: `${username}@messenger.com`,
        password: password
    });

    if (error) {
        alert('Ошибка входа: ' + error.message);
        return;
    }

    currentUser = {
        id: data.user.id,
        username: username
    };

    // Добавляем пользователя в базу
    await supabase
        .from('users')
        .upsert({ id: currentUser.id, username: currentUser.username });

    showMainApp();
    loadOnlineUsers();
    setupRealtime();
}

async function logout() {
    await supabase.auth.signOut();
    currentUser = null;
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
    supabase
        .channel('messages')
        .on('postgres_changes', 
            { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'messages',
                filter: `receiver_id=eq.${currentUser.id}`
            }, 
            (payload) => {
                if (selectedUser && payload.new.sender_id === selectedUser.id) {
                    loadMessages();
                }
            }
        )
        .subscribe();
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

        // Здесь должна быть логика отправки offer через ваш сервер
        // Для упрощения используем alert для ручного обмена SDP
        alert(`Отправьте этот SDP выбранному пользователю:\n\n${JSON.stringify(offer)}`);

        // Кнопка для ввода ответа
        const answerSDP = prompt('Введите SDP ответ от другого пользователя:');
        if (answerSDP) {
            await peerConnection.setRemoteDescription(JSON.parse(answerSDP));
        }

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

// Обработка нажатия Enter для отправки сообщения
document.getElementById('messageInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// Проверяем авторизацию при загрузке
async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
        const { data: { user } } = await supabase.auth.getUser();
        currentUser = {
            id: user.id,
            username: user.user_metadata?.username || user.email.split('@')[0]
        };
        showMainApp();
        loadOnlineUsers();
        setupRealtime();
    }
}

// Инициализация при загрузке
window.onload = checkAuth;