const apiBase = window.location.hostname === 'localhost' ? 'http://localhost:3000' : '';

if (localStorage.getItem('grc_token')) {
    window.location.href = '/';
}

document.addEventListener('DOMContentLoaded', () => {
    const demoBtn = document.getElementById('btn-demo');
    const demoErrorEl = document.getElementById('demo-error');

    demoBtn.addEventListener('click', async () => {
        demoErrorEl.style.display = 'none';
        demoBtn.textContent = 'Carregando...';
        demoBtn.disabled = true;

        try {
            const res = await fetch(`${apiBase}/api/demo/login`, { method: 'POST' });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error?.message || 'Demonstração indisponível no momento.');
            }
            localStorage.setItem('grc_token', data.data.token);
            localStorage.setItem('grc_user', JSON.stringify(data.data.user));
            window.location.href = '/';
        } catch (err) {
            demoErrorEl.textContent = err.message;
            demoErrorEl.style.display = 'block';
            demoBtn.textContent = 'Ver demonstração';
            demoBtn.disabled = false;
        }
    });

    const leadForm = document.getElementById('lead-form-el');
    const leadErrorEl = document.getElementById('lead-error');
    const leadSuccessEl = document.getElementById('lead-success');
    const leadSubmitBtn = document.getElementById('lead-submit-btn');

    leadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        leadErrorEl.style.display = 'none';
        leadSuccessEl.style.display = 'none';
        leadSubmitBtn.textContent = 'Enviando...';
        leadSubmitBtn.disabled = true;

        try {
            const res = await fetch(`${apiBase}/api/leads`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: document.getElementById('name').value,
                    email: document.getElementById('email').value,
                    companyName: document.getElementById('companyName').value,
                    phone: document.getElementById('phone').value,
                    message: document.getElementById('message').value,
                    source: 'landing_page',
                }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error?.message || 'Não foi possível enviar seu contato.');
            }
            leadForm.reset();
            leadSuccessEl.style.display = 'block';
        } catch (err) {
            leadErrorEl.textContent = err.message;
            leadErrorEl.style.display = 'block';
        } finally {
            leadSubmitBtn.textContent = 'Enviar';
            leadSubmitBtn.disabled = false;
        }
    });
});
