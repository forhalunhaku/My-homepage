// Favicon缓存
const faviconCache = {
    // 从localStorage加载缓存的图标
    load() {
        try {
            const cached = localStorage.getItem('faviconCache');
            return cached ? JSON.parse(cached) : {};
        } catch (e) {
            console.error('Error loading favicon cache:', e);
            return {};
        }
    },

    // 保存图标到缓存
    save(cache) {
        try {
            localStorage.setItem('faviconCache', JSON.stringify(cache));
        } catch (e) {
            console.error('Error saving favicon cache:', e);
        }
    },

    // 获取缓存的图标
    async get(url) {
        const cache = this.load();
        const domain = this.getDomain(url);
        
        // 如果缓存中有且未过期（7天），直接返回
        if (cache[domain] && cache[domain].timestamp > Date.now() - 7 * 24 * 60 * 60 * 1000) {
            return cache[domain].data;
        }

        // 否则重新获取
        try {
            const iconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
            const response = await fetch(iconUrl);
            const blob = await response.blob();
            const base64 = await this.blobToBase64(blob);
            
            // 更新缓存
            cache[domain] = {
                data: base64,
                timestamp: Date.now()
            };
            this.save(cache);
            
            return base64;
        } catch (e) {
            console.error('Error fetching favicon:', e);
            return 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🌐</text></svg>';
        }
    },

    // 获取域名
    getDomain(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname;
        } catch (e) {
            return url;
        }
    },

    // Blob转Base64
    blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }
};

// 获取网站favicon的函数
async function getFaviconUrl(url) {
    try {
        const urlObj = new URL(url);
        const domain = urlObj.hostname;
        const iconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
        
        try {
            const response = await fetch(iconUrl);
            if (!response.ok) throw new Error('Favicon fetch failed');
            return iconUrl;
        } catch (e) {
            console.error('Error fetching favicon:', e);
            return 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🌐</text></svg>';
        }
    } catch (e) {
        return 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🌐</text></svg>';
    }
}

// 从localStorage获取书签或使用默认值
let bookmarks = JSON.parse(localStorage.getItem('bookmarks')) || [
    { title: 'GitHub', url: 'https://github.com' },
    { title: 'Google', url: 'https://google.com' },
    { title: 'Stack Overflow', url: 'https://stackoverflow.com' },
    { title: 'YouTube', url: 'https://youtube.com' },
    { title: '哔哩哔哩', url: 'https://bilibili.com' },
    { title: '知乎', url: 'https://zhihu.com' }
];

// 保存到localStorage
function saveBookmarks() {
    localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
}

// 渲染书签
async function renderBookmarks() {
    const bookmarksContainer = document.querySelector('.bookmarks');
    if (!bookmarksContainer) return;
    
    bookmarksContainer.innerHTML = '';

    // 创建并添加书签元素
    for (let i = 0; i < bookmarks.length; i++) {
        const bookmark = bookmarks[i];
        const bookmarkElement = document.createElement('a');
        bookmarkElement.href = bookmark.url;
        bookmarkElement.className = 'bookmark-item';
        bookmarkElement.target = '_blank';
        bookmarkElement.style.opacity = '0';
        bookmarkElement.style.transform = 'translateY(20px)';
        
        const favicon = await getFaviconUrl(bookmark.url);
        
        bookmarkElement.innerHTML = `
            <div class="bookmark-icon">
                <img src="${favicon}" alt="${bookmark.title}" 
                     onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🌐</text></svg>'">
            </div>
            ${bookmark.title}
            <div class="edit-controls">
                <button class="edit-btn" onclick="editBookmark(${i})">✏️</button>
                <button class="delete-btn" onclick="deleteBookmark(${i})">❌</button>
            </div>
        `;
        
        // 阻止编辑和删除按钮的点击事件冒泡
        const editBtn = bookmarkElement.querySelector('.edit-btn');
        const deleteBtn = bookmarkElement.querySelector('.delete-btn');
        
        editBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
        });
        
        deleteBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
        });
        
        bookmarksContainer.appendChild(bookmarkElement);
        
        setTimeout(() => {
            bookmarkElement.style.transition = 'all 0.3s ease';
            bookmarkElement.style.opacity = '1';
            bookmarkElement.style.transform = 'translateY(0)';
        }, i * 50);
    }

    // 添加"添加书签"按钮
    const addButton = document.createElement('div');
    addButton.className = 'bookmark-item add-bookmark';
    addButton.style.opacity = '0';
    addButton.style.transform = 'translateY(20px)';
    addButton.onclick = showAddModal;
    addButton.innerHTML = `
        <div class="bookmark-icon">➕</div>
        添加书签
    `;
    
    bookmarksContainer.appendChild(addButton);
    
    setTimeout(() => {
        addButton.style.transition = 'all 0.3s ease';
        addButton.style.opacity = '1';
        addButton.style.transform = 'translateY(0)';
    }, bookmarks.length * 50);
}

// 删除书签
async function deleteBookmark(index) {
    const shouldDelete = await showConfirmDialog('确定要删除这个书签吗？');
    if (shouldDelete) {
        const bookmarkElements = document.querySelectorAll('.bookmark-item');
        const element = bookmarkElements[index];
        
        // 添加删除动画
        element.style.transform = 'scale(0.8)';
        element.style.opacity = '0';
        
        // 等待动画完成后删除
        setTimeout(() => {
            bookmarks.splice(index, 1);
            saveBookmarks();
            renderBookmarks();
        }, 300);
    }
}

// 自定义确认对话框
function showConfirmDialog(message) {
    return new Promise(resolve => {
        const dialog = document.createElement('div');
        dialog.className = 'modal';
        dialog.style.display = 'flex';
        dialog.style.opacity = '0';
        
        dialog.innerHTML = `
            <div class="modal-content" onclick="event.stopPropagation()">
                <h2>${message}</h2>
                <div class="modal-buttons">
                    <button class="modal-button cancel-button">取消</button>
                    <button class="modal-button save-button">确定</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        requestAnimationFrame(() => {
            dialog.style.opacity = '1';
        });
        
        const handleConfirm = () => {
            dialog.style.opacity = '0';
            setTimeout(() => {
                dialog.remove();
                resolve(true);
            }, 300);
        };
        
        const handleCancel = () => {
            dialog.style.opacity = '0';
            setTimeout(() => {
                dialog.remove();
                resolve(false);
            }, 300);
        };
        
        dialog.querySelector('.save-button').onclick = handleConfirm;
        dialog.querySelector('.cancel-button').onclick = handleCancel;
        dialog.onclick = handleCancel;
    });
}

// 显示添加书签模态框
function showAddModal() {
    const modal = document.getElementById('bookmarkModal');
    const titleInput = document.getElementById('modalTitle');
    const urlInput = document.getElementById('modalUrl');
    
    // 重置输入框
    titleInput.value = '';
    urlInput.value = '';
    
    // 显示模态框
    modal.style.display = 'flex';
    modal.style.opacity = '0';
    
    requestAnimationFrame(() => {
        modal.style.opacity = '1';
        titleInput.focus();
    });
}

// 关闭模态框
function closeModal(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    const modal = document.getElementById('bookmarkModal');
    modal.style.opacity = '0';
    
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
}

// 保存书签
function saveBookmark(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    const titleInput = document.getElementById('modalTitle');
    const urlInput = document.getElementById('modalUrl');
    
    const title = titleInput.value.trim();
    const url = urlInput.value.trim();
    
    if (!title || !url) {
        const input = !title ? titleInput : urlInput;
        input.classList.add('shake');
        setTimeout(() => input.classList.remove('shake'), 500);
        return;
    }
    
    // 确保URL包含协议
    const finalUrl = url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
    
    // 添加新书签
    bookmarks.push({ title, url: finalUrl });
    saveBookmarks();
    closeModal();
    renderBookmarks();
}

// 编辑书签
function editBookmark(index) {
    const bookmark = bookmarks[index];
    const titleInput = document.getElementById('modalTitle');
    const urlInput = document.getElementById('modalUrl');
    
    titleInput.value = bookmark.title;
    urlInput.value = bookmark.url;
    
    showAddModal();
    
    // 保存当前编辑的书签索引
    currentEditIndex = index;
}

// 搜索引擎相关功能
const searchForm = document.getElementById('searchForm');
const searchInput = searchForm.querySelector('.search-input');
const engineButtons = document.querySelectorAll('.search-engine-btn');

// 从localStorage获取上次使用的搜索引擎
const lastEngine = localStorage.getItem('lastSearchEngine') || 'baidu';

// 初始化搜索引擎
function initSearchEngine() {
    const lastEngineBtn = document.querySelector(`[data-engine="${lastEngine}"]`);
    if (lastEngineBtn) {
        setActiveEngine(lastEngineBtn);
    }
}

// 设置当前搜索引擎
function setActiveEngine(engineBtn) {
    // 移除其他按钮的active类
    engineButtons.forEach(btn => btn.classList.remove('active'));
    // 添加当前按钮的active类
    engineBtn.classList.add('active');
    
    // 更新表单属性
    const url = engineBtn.dataset.url;
    const param = engineBtn.dataset.param;
    searchForm.action = url;
    searchInput.name = param;
    
    // 更新placeholder
    const engineName = engineBtn.querySelector('span').textContent;
    searchInput.placeholder = `在 ${engineName} 中搜索...`;
    
    // 保存到localStorage
    localStorage.setItem('lastSearchEngine', engineBtn.dataset.engine);
    
    // 添加动画效果
    searchInput.style.transform = 'translateX(-10px)';
    searchInput.style.opacity = '0';
    setTimeout(() => {
        searchInput.style.transition = 'all 0.3s ease';
        searchInput.style.transform = 'translateX(0)';
        searchInput.style.opacity = '1';
    }, 50);
}

// 添加搜索引擎切换事件
engineButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        if (!btn.classList.contains('active')) {
            setActiveEngine(btn);
            // 聚焦到搜索框
            searchInput.focus();
        }
    });
});

// 搜索表单提交处理
searchForm.addEventListener('submit', (e) => {
    const query = searchInput.value.trim();
    if (!query) {
        e.preventDefault();
        // 显示错误动画
        searchInput.style.transition = 'transform 0.1s ease';
        searchInput.style.transform = 'translateX(10px)';
        setTimeout(() => {
            searchInput.style.transform = 'translateX(-10px)';
            setTimeout(() => {
                searchInput.style.transform = 'translateX(0)';
            }, 100);
        }, 100);
    }
});

// 初始化事件监听
document.addEventListener('DOMContentLoaded', async () => {
    // 渲染书签
    await renderBookmarks();
    
    // 初始化搜索引擎
    initSearchEngine();
    
    // 添加模态框关闭事件
    const modal = document.getElementById('bookmarkModal');
    modal.addEventListener('click', event => {
        if (event.target === modal) {
            closeModal();
        }
    });
    
    // 添加键盘事件监听
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && modal.style.display === 'flex') {
            closeModal();
        }
    });
});

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', async () => {
    // 渲染书签
    await renderBookmarks();
    
    // 初始化搜索引擎
    initSearchEngine();
    
    // 添加模态框关闭事件
    const modal = document.getElementById('bookmarkModal');
    modal.addEventListener('click', event => {
        if (event.target === modal) {
            closeModal();
        }
    });
    
    // 添加键盘事件监听
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && modal.style.display === 'flex') {
            closeModal();
        }
    });
});

// 更新时间显示
function updateTime() {
    const timeElement = document.getElementById('currentTime');
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    timeElement.textContent = `${hours}:${minutes}`;
}

// 初始化时间显示
updateTime();
setInterval(updateTime, 60000); // 每分钟更新一次

// 主题切换
const themeToggle = document.querySelector('.theme-toggle');
let isDarkTheme = true; // 默认深色主题

themeToggle.addEventListener('click', () => {
    isDarkTheme = !isDarkTheme;
    themeToggle.textContent = isDarkTheme ? '🌙' : '☀️';
    document.body.style.background = isDarkTheme 
        ? 'linear-gradient(135deg, #1a1c2c 0%, #4a4e69 100%)'
        : 'linear-gradient(135deg, #e0e0e0 0%, #ffffff 100%)';
    
    // 更新其他元素的颜色
    document.querySelectorAll('.container, .search-box, .bookmark-item').forEach(element => {
        element.style.color = isDarkTheme ? '#fff' : '#333';
        element.style.background = isDarkTheme 
            ? 'rgba(255, 255, 255, 0.05)'
            : 'rgba(0, 0, 0, 0.05)';
    });
});
