function initAuth() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
}

async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    if (!username || !password) {
        showMessage('Vui lòng nhập đầy đủ thông tin!');
        return;
    }

    const result = await apiRequest('/auth/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
    });

    if (result.success) {
        const { user, access_token } = result.data;
        
        saveToStorage(StorageKeys.CURRENT_USER, {
            id: user.id,
            username: user.username
        });
        saveToStorage(StorageKeys.ACCESS_TOKEN, access_token);
        
        showMessage('Đăng nhập thành công!');
        redirectTo('home.html');
    } else {
        showMessage(result.error || 'Tên đăng nhập hoặc mật khẩu không đúng!');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (!username || !password || !confirmPassword) {
        showMessage('Vui lòng nhập đầy đủ thông tin!');
        return;
    }

    if (password !== confirmPassword) {
        showMessage('Mật khẩu xác nhận không khớp!');
        return;
    }

    if (password.length < 6) {
        showMessage('Mật khẩu phải có ít nhất 6 ký tự!');
        return;
    }

    const result = await apiRequest('/auth/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
    });

    if (result.success) {
        showMessage('Đăng ký thành công! Vui lòng đăng nhập.');
        redirectTo('index.html');
    } else {
        showMessage(result.error || 'Đăng ký thất bại!');
    }
}

document.addEventListener('DOMContentLoaded', initAuth);

