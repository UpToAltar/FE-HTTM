function initHome() {
    requireAuth();
    
    initUpload();
    initVideoList();
    initLogout();
}

function initUpload() {
    const uploadBox = document.getElementById('uploadBox');
    const videoInput = document.getElementById('videoInput');
    const selectVideoBtn = document.getElementById('selectVideoBtn');

    selectVideoBtn.addEventListener('click', () => {
        videoInput.click();
    });

    videoInput.addEventListener('change', handleFileSelect);

    uploadBox.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadBox.classList.add('drag-over');
    });

    uploadBox.addEventListener('dragleave', () => {
        uploadBox.classList.remove('drag-over');
    });

    uploadBox.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadBox.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileUpload(files[0]);
        }
    });
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        handleFileUpload(file);
    }
}

async function handleFileUpload(file) {
    const maxSize = 100 * 1024 * 1024;
    const allowedTypes = ['video/mp4', 'video/webm', 'video/x-msvideo', 'image/jpeg', 'image/png', 'image/jpg'];
    
    if (!allowedTypes.includes(file.type)) {
        showMessage('Chỉ hỗ trợ file MP4, WebM, AVI hoặc ảnh JPG, PNG!');
        return;
    }
    
    if (file.size > maxSize) {
        showMessage('File không được vượt quá 100MB!');
        return;
    }

    const formData = new FormData();
    formData.append('file', file);

    showLoading(true);

    try {
        const token = getFromStorage(StorageKeys.ACCESS_TOKEN);
        const response = await fetch(`${API_BASE_URL}/videos/upload`, {
            method: 'POST',
            headers: {
                ...(token && { 'Authorization': `Bearer ${token}` })
            },
            body: formData
        });

        const data = await response.json();

        showLoading(false);

        if (response.ok) {
            showMessage('Upload thành công!');
            await loadVideoList();
            
            if (data.detected_plates && data.detected_plates.length > 0) {
                showPlatesModal(data.detected_plates, file.name);
            } else {
                showMessage('Không phát hiện biển số xe nào!');
            }
        } else {
            showMessage(data.detail || data.message || 'Upload thất bại!');
        }
    } catch (error) {
        showLoading(false);
        showMessage('Có lỗi xảy ra khi upload: ' + error.message);
    }
}

function showLoading(show) {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (show) {
        loadingOverlay.classList.add('active');
    } else {
        loadingOverlay.classList.remove('active');
    }
}

function showPlatesModal(plates, filename) {
    const modal = document.getElementById('platesModal');
    const platesGrid = document.getElementById('platesGrid');
    
    if (plates.length === 0) {
        platesGrid.innerHTML = '<div class="no-plates">Không phát hiện biển số xe nào</div>';
    } else {
        platesGrid.innerHTML = plates.map((plate, index) => {
            const confidence = (plate.confidence * 100).toFixed(2);
            let confidenceClass = 'confidence-low';
            if (plate.confidence >= 0.8) confidenceClass = 'confidence-high';
            else if (plate.confidence >= 0.5) confidenceClass = 'confidence-medium';
            
            return `
                <div class="plate-item">
                    <div class="plate-header">
                        <div class="plate-number">${plate.plate_number || 'N/A'}</div>
                        <div class="confidence-badge ${confidenceClass}">
                            ${confidence}%
                        </div>
                    </div>
                    <div class="plate-details">
                        <div class="plate-detail">
                            <strong>Timestamp:</strong> ${plate.timestamp ? plate.timestamp.toFixed(2) : 'N/A'}s
                        </div>
                        <div class="plate-detail">
                            <strong>Frame:</strong> ${plate.frame_number || 'N/A'}
                        </div>
                        <div class="plate-detail">
                            <strong>Crop Path:</strong> ${plate.crop_path || 'N/A'}
                        </div>
                        <div class="plate-detail">
                            <strong>BBox:</strong> ${plate.bbox ? plate.bbox.join(', ') : 'N/A'}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    modal.classList.add('active');
}

function closeModal() {
    const modal = document.getElementById('platesModal');
    modal.classList.remove('active');
}

async function initVideoList() {
    await loadVideoList();
}

async function loadVideoList() {
    const result = await apiRequest('/videos/', {
        method: 'GET'
    });

    if (result.success) {
        renderVideoList(result.data);
    } else {
        showMessage('Không thể tải danh sách video: ' + result.error);
        renderVideoList([]);
    }
}

function renderVideoList(videos) {
    const tbody = document.getElementById('videoTableBody');
    const videoCount = document.getElementById('videoCount');
    const currentUser = getFromStorage(StorageKeys.CURRENT_USER);
    
    videoCount.textContent = videos.length;
    
    if (videos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px; color: #9ca3af;">Chưa có video nào</td></tr>';
        return;
    }
    
    tbody.innerHTML = videos.map(video => {
        const canDownloadLog = video.status === 'completed' && video.log_path;
        const downloadBtnText = canDownloadLog ? 'Tải Log' : 'Đang xử lý...';
        const downloadBtnDisabled = !canDownloadLog ? 'disabled' : '';
        
        return `
            <tr>
                <td>${video.id}</td>
                <td>${currentUser.id}</td>
                <td>${video.filename}</td>
                <td>${video.filepath}</td>
                <td><span class="status-badge status-${video.status}">${getStatusText(video.status)}</span></td>
                <td>${formatDate(video.created_at)}</td>
                <td>
                    <div class="actions">
                        <button class="btn btn-download" 
                                onclick="downloadLog(${video.id}, '${video.filename}')" 
                                ${downloadBtnDisabled}>
                            ${downloadBtnText}
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function getStatusText(status) {
    const statusMap = {
        'completed': 'completed',
        'processing': 'processing',
        'pending': 'pending',
        'failed': 'failed'
    };
    return statusMap[status] || status;
}

async function downloadLog(videoId, originalFilename) {
    try {
        showMessage('Đang chuẩn bị tải xuống...');
        
        const token = getFromStorage(StorageKeys.ACCESS_TOKEN);
        const response = await fetch(`${API_BASE_URL}/logs/download/${videoId}`, {
            method: 'GET',
            headers: {
                ...(token && { 'Authorization': `Bearer ${token}` })
            }
        });

        if (!response.ok) {
            const error = await response.json();
            showMessage(error.detail || 'Không thể tải xuống file log');
            return;
        }

        // Lấy tên file từ header hoặc tạo tên mặc định
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = `log_${videoId}.zip`;
        
        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
            if (filenameMatch && filenameMatch[1]) {
                filename = filenameMatch[1].replace(/['"]/g, '');
            }
        }

        // Tạo blob và download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        showMessage('Tải xuống thành công!');
    } catch (error) {
        console.error('Download error:', error);
        showMessage('Có lỗi xảy ra khi tải xuống: ' + error.message);
    }
}

function initLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    logoutBtn.addEventListener('click', handleLogout);
}

function handleLogout() {
    removeFromStorage(StorageKeys.CURRENT_USER);
    removeFromStorage(StorageKeys.ACCESS_TOKEN);
    showMessage('Đã đăng xuất!');
    redirectTo('index.html');
}

document.addEventListener('DOMContentLoaded', initHome);


