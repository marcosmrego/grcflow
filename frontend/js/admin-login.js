/* ===========================
   Platform Admin — Login
   =========================== */

const apiBase = window.location.hostname === 'localhost' ? 'http://localhost:3000' : '';

if (localStorage.getItem('grc_system_token')) {
    window.location.href = '/admin/companies.html';
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
            const res = await fetch(`${apiBase}/api/system/auth/login`, {
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
            localStorage.setItem('grc_system_token', data.data.token);
            localStorage.setItem('grc_system_user', JSON.stringify(data.data.user));
            window.location.href = '/admin/companies.html';
        } catch (err) {
            errorEl.textContent = err.message;
            errorEl.style.display = 'block';
            btn.textContent = 'Entrar';
            btn.disabled = false;
        }
    });
});
