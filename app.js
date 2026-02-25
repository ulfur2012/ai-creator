// === AI Creator - Main App ===

// State
let currentView = 'gallery';
let currentCharacterId = null;
let characters = [];
let isSending = false;

// === Initialization ===
function init() {
    loadCharacters();
    loadSettings();
    showView('gallery');

    // Character count for personality textarea
    const textarea = document.getElementById('char-personality');
    if (textarea) {
        textarea.addEventListener('input', () => {
            document.getElementById('personality-count').textContent = textarea.value.length;
        });
    }
}

// === Data Management ===
function loadCharacters() {
    try {
        characters = JSON.parse(localStorage.getItem('characters') || '[]');
    } catch {
        characters = [];
    }
}

function saveCharacters() {
    localStorage.setItem('characters', JSON.stringify(characters));
}

function getCharacter(id) {
    return characters.find(c => c.id === id);
}

function getChatHistory(characterId) {
    try {
        return JSON.parse(localStorage.getItem(`chat_${characterId}`) || '[]');
    } catch {
        return [];
    }
}

function saveChatHistory(characterId, messages) {
    localStorage.setItem(`chat_${characterId}`, JSON.stringify(messages));
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// === View Navigation ===
function showView(viewName, skipHistory) {
    // Hide all views
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));

    // Show target view
    const view = document.getElementById(`view-${viewName}`);
    if (view) view.classList.add('active');

    // Update nav
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === viewName);
    });

    // Show/hide back button and nav
    const isChat = viewName === 'chat';
    document.getElementById('header-back').classList.toggle('hidden', !isChat);
    document.getElementById('bottom-nav').style.display = isChat ? 'none' : '';

    currentView = viewName;

    // Render view content
    switch (viewName) {
        case 'gallery': renderGallery(); break;
        case 'myais': renderMyAIs(); break;
        case 'create': resetCreateForm(); break;
        case 'settings': loadSettingsUI(); break;
        case 'chat': renderChat(); break;
    }
}

function goBack() {
    showView('myais');
}

// === Gallery View ===
function renderGallery() {
    const grid = document.getElementById('gallery-grid');
    const empty = document.getElementById('gallery-empty');
    const published = characters.filter(c => c.published);

    if (published.length === 0) {
        grid.classList.add('hidden');
        empty.classList.remove('hidden');
        return;
    }

    empty.classList.add('hidden');
    grid.classList.remove('hidden');
    grid.innerHTML = published.map(c => createCardHTML(c)).join('');
}

function filterGallery() {
    const query = document.getElementById('search-input').value.toLowerCase().trim();
    const grid = document.getElementById('gallery-grid');
    const empty = document.getElementById('gallery-empty');
    const published = characters.filter(c => c.published);

    const filtered = query
        ? published.filter(c => c.name.toLowerCase().includes(query) || c.personality.toLowerCase().includes(query))
        : published;

    if (filtered.length === 0 && published.length > 0) {
        grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;padding:40px 0;"><p>No results found</p></div>';
        empty.classList.add('hidden');
    } else if (filtered.length === 0) {
        grid.classList.add('hidden');
        empty.classList.remove('hidden');
    } else {
        empty.classList.add('hidden');
        grid.classList.remove('hidden');
        grid.innerHTML = filtered.map(c => createCardHTML(c)).join('');
    }
}

function createCardHTML(character) {
    const imgHTML = character.photo
        ? `<img class="card-image" src="${character.photo}" alt="${escapeHTML(character.name)}">`
        : `<div class="card-image-placeholder">${character.name.charAt(0).toUpperCase()}</div>`;

    const shortDesc = character.personality.length > 60
        ? character.personality.substring(0, 60) + '...'
        : character.personality;

    return `
        <div class="character-card" onclick="openChat('${character.id}')">
            ${imgHTML}
            <div class="card-body">
                <h4>${escapeHTML(character.name)}</h4>
                <p>${escapeHTML(shortDesc)}</p>
            </div>
        </div>
    `;
}

// === My AIs View ===
function renderMyAIs() {
    const list = document.getElementById('myais-list');
    const empty = document.getElementById('myais-empty');

    if (characters.length === 0) {
        list.classList.add('hidden');
        empty.classList.remove('hidden');
        return;
    }

    empty.classList.add('hidden');
    list.classList.remove('hidden');

    list.innerHTML = characters.map(c => {
        const avatarHTML = c.photo
            ? `<img class="list-card-avatar" src="${c.photo}" alt="${escapeHTML(c.name)}">`
            : `<div class="list-card-avatar-placeholder">${c.name.charAt(0).toUpperCase()}</div>`;

        const badgeHTML = c.published
            ? '<span class="badge badge-published">Published</span>'
            : '<span class="badge badge-draft">Draft</span>';

        return `
            <div class="list-card" onclick="openChat('${c.id}')">
                ${avatarHTML}
                <div class="list-card-info">
                    <h4>${escapeHTML(c.name)}</h4>
                    <p>${escapeHTML(c.personality.substring(0, 50))}${c.personality.length > 50 ? '...' : ''}</p>
                    ${badgeHTML}
                </div>
                <div class="list-card-actions" onclick="event.stopPropagation()">
                    <button title="${c.published ? 'Unpublish' : 'Publish'}" onclick="togglePublish('${c.id}')">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="${c.published ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                    <button title="Export" onclick="exportCharacter('${c.id}')">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    </button>
                    <button class="btn-delete" title="Delete" onclick="deleteCharacter('${c.id}')">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function togglePublish(id) {
    const character = getCharacter(id);
    if (!character) return;
    character.published = !character.published;
    saveCharacters();
    renderMyAIs();
    showToast(character.published ? 'Published!' : 'Unpublished', 'success');
}

function deleteCharacter(id) {
    const character = getCharacter(id);
    if (!character) return;

    showConfirm(
        'Delete Character',
        `Are you sure you want to delete "${character.name}"? This cannot be undone.`,
        () => {
            characters = characters.filter(c => c.id !== id);
            saveCharacters();
            localStorage.removeItem(`chat_${id}`);
            renderMyAIs();
            showToast('Character deleted', 'success');
        }
    );
}

// === Create View ===
let uploadedPhoto = null;

function resetCreateForm() {
    document.getElementById('create-form').reset();
    document.getElementById('personality-count').textContent = '0';
    uploadedPhoto = null;
    const preview = document.getElementById('photo-preview');
    preview.classList.remove('has-image');
    preview.innerHTML = `
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
        <span>Tap to add photo</span>
    `;
}

function handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Resize image to save localStorage space
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_SIZE = 400;
            let w = img.width;
            let h = img.height;

            if (w > h) {
                if (w > MAX_SIZE) { h = h * MAX_SIZE / w; w = MAX_SIZE; }
            } else {
                if (h > MAX_SIZE) { w = w * MAX_SIZE / h; h = MAX_SIZE; }
            }

            canvas.width = w;
            canvas.height = h;
            canvas.getContext('2d').drawImage(img, 0, 0, w, h);
            uploadedPhoto = canvas.toDataURL('image/jpeg', 0.8);

            // Update preview
            const preview = document.getElementById('photo-preview');
            preview.classList.add('has-image');
            preview.innerHTML = `<img src="${uploadedPhoto}" alt="Preview">`;
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function handleCreateCharacter(event) {
    event.preventDefault();

    const name = document.getElementById('char-name').value.trim();
    const personality = document.getElementById('char-personality').value.trim();
    const greeting = document.getElementById('char-greeting').value.trim();

    if (!name || !personality) {
        showToast('Please fill in name and personality', 'error');
        return;
    }

    const character = {
        id: generateId(),
        name,
        photo: uploadedPhoto,
        personality,
        greeting,
        published: false,
        createdAt: Date.now()
    };

    characters.push(character);
    saveCharacters();

    showToast('Character created!', 'success');
    showView('myais');
}

// === Chat View ===
function openChat(characterId) {
    currentCharacterId = characterId;
    showView('chat');
}

function renderChat() {
    const character = getCharacter(currentCharacterId);
    if (!character) {
        showView('gallery');
        return;
    }

    // Update header
    const avatar = document.getElementById('chat-avatar');
    if (character.photo) {
        avatar.src = character.photo;
        avatar.style.display = '';
    } else {
        avatar.style.display = 'none';
    }
    document.getElementById('chat-name').textContent = character.name;

    // Check if chat is ready (free provider needs no key, others do)
    const provider = localStorage.getItem('apiProvider') || 'free';
    const canChat = provider === 'free' || !!localStorage.getItem('apiKey');
    document.getElementById('chat-form').classList.toggle('hidden', !canChat);
    document.getElementById('chat-no-key').classList.toggle('hidden', canChat);

    // Load messages
    const messagesEl = document.getElementById('chat-messages');
    const history = getChatHistory(currentCharacterId);

    if (history.length === 0 && character.greeting) {
        // Add greeting as first message
        history.push({ role: 'assistant', content: character.greeting });
        saveChatHistory(currentCharacterId, history);
    }

    messagesEl.innerHTML = history.map(m =>
        `<div class="message message-${m.role === 'user' ? 'user' : 'ai'}">${escapeHTML(m.content)}</div>`
    ).join('');

    // Scroll to bottom
    messagesEl.scrollTop = messagesEl.scrollHeight;
}

async function handleSendMessage(event) {
    event.preventDefault();

    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text || isSending) return;

    const character = getCharacter(currentCharacterId);
    if (!character) return;

    // Add user message
    const history = getChatHistory(currentCharacterId);
    history.push({ role: 'user', content: text });
    saveChatHistory(currentCharacterId, history);

    // Render user message
    const messagesEl = document.getElementById('chat-messages');
    messagesEl.innerHTML += `<div class="message message-user">${escapeHTML(text)}</div>`;
    input.value = '';
    scrollToBottom();

    // Show typing indicator
    isSending = true;
    document.getElementById('chat-send-btn').disabled = true;
    messagesEl.innerHTML += `
        <div class="message message-typing" id="typing-indicator">
            <div class="typing-dots"><span></span><span></span><span></span></div>
        </div>
    `;
    scrollToBottom();

    try {
        const response = await API.sendMessage(history, character);

        // Remove typing indicator
        const typing = document.getElementById('typing-indicator');
        if (typing) typing.remove();

        // Add AI response
        history.push({ role: 'assistant', content: response });
        saveChatHistory(currentCharacterId, history);

        messagesEl.innerHTML += `<div class="message message-ai">${escapeHTML(response)}</div>`;
        scrollToBottom();
    } catch (error) {
        // Remove typing indicator
        const typing = document.getElementById('typing-indicator');
        if (typing) typing.remove();

        showToast(error.message || 'Failed to get response', 'error');

        // Remove the user message from history if AI failed
        history.pop();
        saveChatHistory(currentCharacterId, history);
    } finally {
        isSending = false;
        document.getElementById('chat-send-btn').disabled = false;
        document.getElementById('chat-input').focus();
    }
}

function scrollToBottom() {
    const el = document.getElementById('chat-messages');
    el.scrollTop = el.scrollHeight;
}

// === Settings ===
function loadSettings() {
    // Settings are loaded from localStorage on demand
}

function loadSettingsUI() {
    const provider = localStorage.getItem('apiProvider') || 'free';
    const apiKey = localStorage.getItem('apiKey') || '';
    const model = localStorage.getItem('model') || '';

    // Set provider radio
    const radio = document.querySelector(`input[name="provider"][value="${provider}"]`);
    if (radio) radio.checked = true;

    // Set API key
    document.getElementById('api-key-input').value = apiKey;

    // Show/hide API key section (not needed for free provider)
    document.getElementById('api-key-section').classList.toggle('hidden', provider === 'free');

    // Update model options visibility
    updateModelOptions(provider);

    // Set model
    if (model) {
        document.getElementById('model-select').value = model;
    }

    // Set short replies toggle (default: on)
    const shortReplies = localStorage.getItem('shortReplies') !== 'false';
    document.getElementById('short-replies-toggle').checked = shortReplies;
}

function handleProviderChange(provider) {
    localStorage.setItem('apiProvider', provider);
    updateModelOptions(provider);

    // Show/hide API key section
    document.getElementById('api-key-section').classList.toggle('hidden', provider === 'free');

    // Set default model for provider
    const defaults = { free: 'openai', gemini: 'gemini-2.0-flash', openai: 'gpt-4o', anthropic: 'claude-sonnet-4-6' };
    const defaultModel = defaults[provider] || 'openai';
    document.getElementById('model-select').value = defaultModel;
    localStorage.setItem('model', defaultModel);
}

function updateModelOptions(provider) {
    const freeGroup = document.getElementById('free-models');
    const geminiGroup = document.getElementById('gemini-models');
    const openaiGroup = document.getElementById('openai-models');
    const anthropicGroup = document.getElementById('anthropic-models');

    freeGroup.style.display = provider === 'free' ? '' : 'none';
    geminiGroup.style.display = provider === 'gemini' ? '' : 'none';
    openaiGroup.style.display = provider === 'openai' ? '' : 'none';
    anthropicGroup.style.display = provider === 'anthropic' ? '' : 'none';
}

function handleModelChange(model) {
    localStorage.setItem('model', model);
}

function handleShortRepliesChange(enabled) {
    localStorage.setItem('shortReplies', enabled ? 'true' : 'false');
}

function saveApiKey() {
    const key = document.getElementById('api-key-input').value.trim();
    if (!key) {
        showToast('Please enter an API key', 'error');
        return;
    }
    localStorage.setItem('apiKey', key);
    showToast('API key saved!', 'success');
}

function toggleKeyVisibility() {
    const input = document.getElementById('api-key-input');
    input.type = input.type === 'password' ? 'text' : 'password';
}

function clearAllData() {
    showConfirm(
        'Clear All Data',
        'This will delete all characters, chat history, and settings. This cannot be undone.',
        () => {
            localStorage.clear();
            characters = [];
            showView('gallery');
            showToast('All data cleared', 'success');
        }
    );
}

// === Export / Import ===
function exportCharacter(id) {
    const character = getCharacter(id);
    if (!character) return;

    const data = {
        ...character,
        exportedAt: Date.now(),
        version: 1
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${character.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Character exported!', 'success');
}

function importCharacter() {
    document.getElementById('import-input').click();
}

function handleImportFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);

            if (!data.name || !data.personality) {
                showToast('Invalid character file', 'error');
                return;
            }

            // Create new character from import
            const character = {
                id: generateId(),
                name: data.name,
                photo: data.photo || null,
                personality: data.personality,
                greeting: data.greeting || '',
                published: false,
                createdAt: Date.now()
            };

            characters.push(character);
            saveCharacters();
            renderMyAIs();
            showToast(`Imported "${character.name}"!`, 'success');
        } catch {
            showToast('Failed to import file', 'error');
        }
    };
    reader.readAsText(file);

    // Reset input so same file can be imported again
    event.target.value = '';
}

// === UI Helpers ===
function showToast(message, type = '') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type ? 'toast-' + type : ''}`;
    toast.classList.remove('hidden');

    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
        toast.classList.add('hidden');
    }, 2500);
}

function showConfirm(title, message, onConfirm) {
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-message').textContent = message;
    document.getElementById('confirm-overlay').classList.remove('hidden');

    const btn = document.getElementById('confirm-action');
    btn.onclick = () => {
        closeConfirm();
        onConfirm();
    };
}

function closeConfirm() {
    document.getElementById('confirm-overlay').classList.add('hidden');
}

function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// === Start ===
document.addEventListener('DOMContentLoaded', init);
