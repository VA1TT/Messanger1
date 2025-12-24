// Основной файл приложения Aqua Messenger
class AquaMessenger {
    constructor() {
        this.currentUser = null;
        this.selectedChat = null;
        this.onlineUsers = new Map();
        this.friends = new Map();
        this.activeCall = null;
        this.peerConnection = null;
        this.localStream = null;
        this.remoteStream = null;
        this.callTimer = null;
        this.callStartTime = null;
        this.isSidebarExpanded = false;
        
        this.initialize();
    }

    async initialize() {
        await this.checkAuth();
        this.setupEventListeners();
        this.setupRealtime();
        this.hidePreloader();
        
        if (this.currentUser) {
            this.loadFriends();
            this.loadChats();
            this.loadVideoPosts();
        }
    }

    async checkAuth() {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
            await this.loadUserProfile(session.user.id);
            this.showApp();
        } else {
            this.showAuth();
        }
    }

    async loadUserProfile(userId) {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
        
        if (!error && data) {
            this.currentUser = data;
            this.updateUI();
        }
    }

    // Аутентификация
    async login(username, password) {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: username.includes('@') ? username : `${username}@aqua.local`,
                password: password
            });

            if (error) throw error;
            
            await this.loadUserProfile(data.user.id);
            this.showApp();
            this.showNotification('Вход выполнен успешно!', 'success');
            
        } catch (error) {
            this.showNotification(error.message, 'error');
        }
    }

    async register(username, email, password) {
        try {
            const { data, error } = await supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: { username: username }
                }
            });

            if (error) throw error;
            
            this.showNotification('Регистрация успешна! Проверьте email.', 'success');
            this.switchToLogin();
            
        } catch (error) {
            this.showNotification(error.message, 'error');
        }
    }

    async logout() {
        await supabase.auth.signOut();
        this.currentUser = null;
        this.showAuth();
    }

    // Друзья
    async sendFriendRequest(toUserId) {
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

    // Остальные методы рендеринга и обработчики событий
    // ...
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    window.app = new AquaMessenger();
});
