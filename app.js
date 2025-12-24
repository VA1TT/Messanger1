// Основной файл приложения Aqua Messenger

console.log('App starting...');

// Простые функции для демо
function login() {
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    
    if (!username || !password) {
        showNotification('Заполните все поля', 'error');
        return;
    }
    
    // Тестовый вход
    window.currentUser = {
        id: 'user-' + Date.now(),
        username: username,
        avatar_url: 'https://i.pravatar.cc/150?img=' + Math.floor(Math.random() * 70)
    };
    
    document.getElementById('authSection').style.display = 'none';
    document.getElementById('appContainer').style.display = 'flex';
    
    // Сохраняем для обновления страницы
    localStorage.setItem('demoUser', JSON.stringify(window.currentUser));
    
    showNotification('Вход выполнен успешно!', 'success');
    initApp();
}

function register() {
    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirm = document.getElementById('registerConfirmPassword').value;
    
    if (password !== confirm) {
        showNotification('Пароли не совпадают', 'error');
        return;
    }
    
    // Тестовая регистрация
    window.currentUser = {
        id: 'user-' + Date.now(),
        username: username,
        email: email,
        avatar_url: 'https://i.pravatar.cc/150?img=' + Math.floor(Math.random() * 70)
    };
    
    document.getElementById('authSection').style.display = 'none';
    document.getElementById('appContainer').style.display = 'flex';
    
    localStorage.setItem('demoUser', JSON.stringify(window.currentUser));
    
    showNotification('Регистрация успешна!', 'success');
    initApp();
}

function showNotification(message, type) {
    const toast = document.getElementById('notificationToast');
    const messageEl = document.getElementById('toastMessage');
    
    if (!toast || !messageEl) {
        console.log(message);
        return;
    }
    
    messageEl.textContent = message;
    toast.className = `notification-toast ${type}`;
    toast.style.display = 'block';
    
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

function logout() {
    window.currentUser = null;
    localStorage.removeItem('demoUser');
    
    document.getElementById('appContainer').style.display = 'none';
    document.getElementById('authSection').style.display = 'flex';
    
    showNotification('Выход выполнен', 'info');
}

function initApp() {
    if (!window.currentUser) return;
    
    // Обновляем интерфейс
    const usernameEl = document.getElementById('currentUsername');
    const avatarEl = document.getElementById('currentAvatar');
    
    if (usernameEl) usernameEl.textContent = window.currentUser.username;
    if (avatarEl) avatarEl.src = window.currentUser.avatar_url;
    
    // Прячем прелоадер
    document.getElementById('preloader').style.display = 'none';
    
    console.log('App initialized for:', window.currentUser.username);
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded');
    
    // Проверяем сохраненного пользователя
    const savedUser = localStorage.getItem('demoUser');
    if (savedUser) {
        try {
            window.currentUser = JSON.parse(savedUser);
            document.getElementById('preloader').style.display = 'none';
            document.getElementById('authSection').style.display = 'none';
            document.getElementById('appContainer').style.display = 'flex';
            initApp();
        } catch (e) {
            console.error('Error parsing saved user:', e);
            localStorage.removeItem('demoUser');
        }
    } else {
        // Показываем форму входа через 1 секунду
        setTimeout(() => {
            document.getElementById('preloader').style.display = 'none';
            document.getElementById('authSection').style.display = 'flex';
        }, 1000);
    }
    
    // Вешаем обработчики
    const loginBtn = document.querySelector('#loginForm button[type="submit"]');
    const registerBtn = document.querySelector('#registerForm button[type="submit"]');
    
    if (loginBtn) {
        loginBtn.addEventListener('click', function(e) {
            e.preventDefault();
            login();
        });
    }
    
    if (registerBtn) {
        registerBtn.addEventListener('click', function(e) {
            e.preventDefault();
            register();
        });
    }
    
    // Обработчики табов
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tab = this.getAttribute('data-tab');
            
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
    
    // Кнопки показа пароля
    document.querySelectorAll('.show-password').forEach(btn => {
        btn.addEventListener('click', function() {
            const inputId = this.getAttribute('data-input');
            const input = document.getElementById(inputId);
            const icon = this.querySelector('i');
            
            if (input.type === 'password') {
                input.type = 'text';
                icon.className = 'fas fa-eye-slash';
            } else {
                input.type = 'password';
                icon.className = 'fas fa-eye';
            }
        });
    });
});

    // Друзья
async function sendFriendRequest(toUserId) {
        const { error } = await supabase
            .from('friend_requests')
            .insert({
                from_user: this.currentUser.id,
                to_user: toUserId,
                status: 'pending'
            });

        if (!error) {
            this.showNotification('Запрос в друзья отправлен', 'success');
        }
    }

    async acceptFriendRequest(requestId) {
        const { error } = await supabase
            .from('friend_requests')
            .update({ status: 'accepted' })
            .eq('id', requestId);

        if (!error) {
            this.loadFriends();
            this.showNotification('Запрос в друзья принят', 'success');
        }
    }

    // Чат
    async sendMessage(content, file = null) {
        if (!this.selectedChat || (!content && !file)) return;

        const messageData = {
            chat_id: this.selectedChat.id,
            sender_id: this.currentUser.id,
            content: content
        };

        if (file) {
            // Загрузка файла
            const filePath = `chat-files/${this.selectedChat.id}/${Date.now()}_${file.name}`;
            const { data: fileData, error: uploadError } = await supabase.storage
                .from('files')
                .upload(filePath, file);

            if (!uploadError) {
                const { data: urlData } = supabase.storage
                    .from('files')
                    .getPublicUrl(filePath);

                messageData.file_url = urlData.publicUrl;
                messageData.file_type = file.type;
                messageData.file_name = file.name;
                messageData.file_size = file.size;
            }
        }

        const { error } = await supabase
            .from('messages')
            .insert(messageData);

        if (!error) {
            this.scrollToBottom();
        }
    }

    async clearChat() {
        if (!this.selectedChat) return;

        if (confirm('Очистить всю историю чата?')) {
            const { error } = await supabase
                .from('messages')
                .update({ is_deleted: true })
                .eq('chat_id', this.selectedChat.id);

            if (!error) {
                this.loadMessages();
                this.showNotification('Чат очищен', 'success');
            }
        }
    }

    // Звонки
    async startCall(userId, type = 'video') {
        if (!userId) return;

        this.showCallModal(userId, type);
        
        // Здесь должна быть логика WebRTC
        // Для демонстрации используем имитацию
        setTimeout(() => {
            this.acceptCall(userId, type);
        }, 3000);
    }

    async acceptCall(callerId, type) {
        this.hideCallModal();
        
        if (type === 'video') {
            this.startVideoCall(callerId);
        } else {
            this.startVoiceCall(callerId);
        }

        this.startCallTimer();
        
        // Сохраняем информацию о звонке
        await supabase
            .from('calls')
            .insert({
                caller_id: callerId,
                receiver_id: this.currentUser.id,
                call_type: type,
                status: 'in_progress',
                started_at: new Date()
            });
    }

    async endCall() {
        if (this.activeCall) {
            // Останавливаем медиапотоки
            if (this.localStream) {
                this.localStream.getTracks().forEach(track => track.stop());
            }
            
            if (this.peerConnection) {
                this.peerConnection.close();
            }

            clearInterval(this.callTimer);
            
            // Обновляем информацию о звонке
            const duration = Math.floor((Date.now() - this.callStartTime) / 1000);
            
            await supabase
                .from('calls')
                .update({
                    status: 'completed',
                    ended_at: new Date(),
                    duration: duration
                })
                .eq('id', this.activeCall.id);

            this.activeCall = null;
            this.hideVideoCall();
        }
    }

    // Scroll (видео)
    async uploadVideo(file) {
        if (file.size > 15 * 1024 * 1024) {
            this.showNotification('Видео должно быть меньше 15 МБ', 'error');
            return;
        }

        // Проверяем лимит 1 видео в день
        const today = new Date().toISOString().split('T')[0];
        const { data: todayVideos } = await supabase
            .from('video_posts')
            .select('id')
            .eq('user_id', this.currentUser.id)
            .gte('created_at', today)
            .lt('created_at', new Date(today + 'T23:59:59').toISOString());

        if (todayVideos.length > 0) {
            this.showNotification('Можно загружать только 1 видео в день', 'error');
            return;
        }

        // Загружаем видео
        const filePath = `videos/${this.currentUser.id}/${Date.now()}_${file.name}`;
        const { data: fileData, error: uploadError } = await supabase.storage
            .from('videos')
            .upload(filePath, file);

        if (!uploadError) {
            // Создаем миниатюру
            const video = document.createElement('video');
            video.src = URL.createObjectURL(file);
            
            video.onloadeddata = async () => {
                const canvas = document.createElement('canvas');
                canvas.width = 320;
                canvas.height = 180;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                
                const thumbnailBlob = await new Promise(resolve => 
                    canvas.toBlob(resolve, 'image/jpeg')
                );

                const thumbPath = `thumbnails/${this.currentUser.id}/${Date.now()}_thumb.jpg`;
                const { data: thumbData } = await supabase.storage
                    .from('videos')
                    .upload(thumbPath, thumbnailBlob);

                const { data: thumbUrl } = supabase.storage
                    .from('videos')
                    .getPublicUrl(thumbPath);

                // Сохраняем информацию о видео
                const { error: dbError } = await supabase
                    .from('video_posts')
                    .insert({
                        user_id: this.currentUser.id,
                        video_url: fileData.path,
                        thumbnail_url: thumbUrl.publicUrl,
                        description: file.name
                    });

                if (!dbError) {
                    this.showNotification('Видео загружено успешно!', 'success');
                    this.loadVideoPosts();
                }
            };
        }
    }

    // Настройки
    async updateProfile(updates) {
        const { error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', this.currentUser.id);

        if (!error) {
            Object.assign(this.currentUser, updates);
            this.updateUI();
            this.showNotification('Профиль обновлен', 'success');
        }
    }

    async uploadAvatar(file) {
        const filePath = `avatars/${this.currentUser.id}/${Date.now()}_${file.name}`;
        const { data, error } = await supabase.storage
            .from('avatars')
            .upload(filePath, file);

        if (!error) {
            const { data: urlData } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            await this.updateProfile({ avatar_url: urlData.publicUrl });
        }
    }

    // UI методы
    showNotification(message, type = 'info') {
        const toast = document.getElementById('notificationToast');
        const messageEl = document.getElementById('toastMessage');
        
        messageEl.textContent = message;
        toast.className = `notification-toast ${type}`;
        toast.style.display = 'block';
        
        setTimeout(() => {
            toast.style.display = 'none';
        }, 3000);
    }

    hidePreloader() {
        setTimeout(() => {
            document.getElementById('preloader').classList.add('hidden');
        }, 1000);
    }

    toggleSidebar() {
        this.isSidebarExpanded = !this.isSidebarExpanded;
        const sidebar = document.getElementById('leftSidebar');
        sidebar.classList.toggle('expanded', this.isSidebarExpanded);
    }

    switchTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        
        if (this.currentUser) {
            this.updateProfile({ theme: theme });
        }
    }

    // Инициализация WebRTC
    async initializeWebRTC() {
        try {
            this.localStream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });
            
            document.getElementById('localVideo').srcObject = this.localStream;
            
            this.peerConnection = new RTCPeerConnection({
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' }
                ]
            });
            
            this.localStream.getTracks().forEach(track => {
                this.peerConnection.addTrack(track, this.localStream);
            });
            
            this.peerConnection.ontrack = (event) => {
                if (!this.remoteStream) {
                    this.remoteStream = new MediaStream();
                    document.getElementById('remoteVideo').srcObject = this.remoteStream;
                }
                event.streams[0].getTracks().forEach(track => {
                    this.remoteStream.addTrack(track);
                });
            };
            
        } catch (error) {
            console.error('WebRTC initialization failed:', error);
            this.showNotification('Ошибка доступа к камере/микрофону', 'error');
        }
    }

    // Дополнительные методы для загрузки данных
    async loadFriends() {
        const { data, error } = await supabase
            .from('friends')
            .select(`
                friend:profiles!friends_friend_id_fkey(*)
            `)
            .eq('user_id', this.currentUser.id);

        if (!error) {
            this.friends.clear();
            data.forEach(item => {
                this.friends.set(item.friend.id, item.friend);
            });
            this.renderFriends();
        }
    }

    async loadChats() {
        const { data, error } = await supabase
            .from('chat_members')
            .select(`
                chat:chats(*),
                last_message:messages!chat_id(content, created_at)
            `)
            .eq('user_id', this.currentUser.id)
            .order('last_message.created_at', { ascending: false });

        if (!error) {
            this.renderChats(data);
        }
    }

    async loadMessages(chatId) {
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('chat_id', chatId)
            .order('created_at', { ascending: true });

        if (!error) {
            this.renderMessages(data);
        }
    }

    async loadVideoPosts() {
        const { data, error } = await supabase
            .from('video_posts')
            .select(`
                *,
                user:profiles(username, avatar_url)
            `)
            .order('created_at', { ascending: false })
            .limit(20);

        if (!error) {
            this.renderVideoPosts(data);
        }
    }

    // Рендеринг
    renderFriends() {
        const friendsAvatars = document.getElementById('friendsAvatars');
        const friendsList = document.getElementById('friendsListExpanded');
        
        // Очистка
        friendsAvatars.innerHTML = '';
        
        // Создание элементов
        this.friends.forEach(friend => {
            // Аватарка в свернутом виде
            const avatarEl = document.createElement('div');
            avatarEl.className = 'friend-avatar';
            avatarEl.innerHTML = `
                <img src="${friend.avatar_url || 'default-avatar.png'}" alt="${friend.username}">
            `;
            friendsAvatars.appendChild(avatarEl);
        });
    }

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
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    window.app = new AquaMessenger();
});
