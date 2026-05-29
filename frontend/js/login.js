const apiBase = window.location.hostname === 'localhost' ? 'http://localhost:3000' : '';

if (localStorage.getItem('grc_token')) {
    window.location.href = '/';
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('login-btn');
        const errorEl = document.getElementById('login-error');
        errorEl.style.display = 'none';
        btn.textContent = 'Entrando...';
        btn.disabled = true;

        try {
            const res = await fetch(`${apiBase}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: document.getElementById('email').value,
                    password: document.getElementById('password').value,
                }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error?.message || 'Credenciais inválidas');
            }
            localStorage.setItem('grc_token', data.data.token);
            localStorage.setItem('grc_user', JSON.stringify(data.data.user));
            window.location.href = '/';
        } catch (err) {
            errorEl.textContent = err.message;
            errorEl.style.display = 'block';
            btn.textContent = 'Entrar';
            btn.disabled = false;
        }
    });
});
