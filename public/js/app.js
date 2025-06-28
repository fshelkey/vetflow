class VetFlowApp {
    constructor() {
        this.token = localStorage.getItem('vetflow_token');
        this.user = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.checkAuthStatus();
    }

    bindEvents() {
        // Login modal events
        document.getElementById('loginBtn').addEventListener('click', () => this.showLoginModal());
        document.getElementById('closeModal').addEventListener('click', () => this.hideLoginModal());
        document.getElementById('cancelLogin').addEventListener('click', () => this.hideLoginModal());
        document.getElementById('loginForm').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('logoutBtn').addEventListener('click', () => this.handleLogout());

        // Close modal when clicking outside
        document.getElementById('loginModal').addEventListener('click', (e) => {
            if (e.target.id === 'loginModal') {
                this.hideLoginModal();
            }
        });
    }

    async checkAuthStatus() {
        if (this.token) {
            try {
                const response = await fetch('/dashboard', {
                    headers: {
                        'Authorization': `Bearer ${this.token}`
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    this.user = { name: data.message.replace('Welcome to your dashboard, ', '') };
                    this.showDashboard();
                } else {
                    // Token is invalid, remove it
                    localStorage.removeItem('vetflow_token');
                    this.token = null;
                    this.showWelcome();
                }
            } catch (error) {
                console.error('Auth check failed:', error);
                localStorage.removeItem('vetflow_token');
                this.token = null;
                this.showWelcome();
            }
        } else {
            this.showWelcome();
        }
    }

    showLoginModal() {
        document.getElementById('loginModal').classList.remove('hidden');
        document.getElementById('email').focus();
    }

    hideLoginModal() {
        document.getElementById('loginModal').classList.add('hidden');
        document.getElementById('loginForm').reset();
        document.getElementById('loginError').classList.add('hidden');
        this.setLoginLoading(false);
    }

    setLoginLoading(loading) {
        const submitBtn = document.querySelector('#loginForm button[type="submit"]');
        const btnText = document.getElementById('loginBtnText');
        const spinner = document.getElementById('loginSpinner');

        if (loading) {
            submitBtn.disabled = true;
            btnText.textContent = 'Logging in...';
            spinner.classList.remove('hidden');
        } else {
            submitBtn.disabled = false;
            btnText.textContent = 'Login';
            spinner.classList.add('hidden');
        }
    }

    showError(message) {
        const errorDiv = document.getElementById('loginError');
        errorDiv.textContent = message;
        errorDiv.classList.remove('hidden');
    }

    async handleLogin(e) {
        e.preventDefault();
        this.setLoginLoading(true);

        const formData = new FormData(e.target);
        const email = formData.get('email');
        const password = formData.get('password');

        try {
            const response = await fetch('/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                this.token = data.access_token;
                localStorage.setItem('vetflow_token', this.token);
                this.hideLoginModal();
                await this.checkAuthStatus();
            } else {
                this.showError(data.error || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showError('Network error. Please try again.');
        } finally {
            this.setLoginLoading(false);
        }
    }

    handleLogout() {
        localStorage.removeItem('vetflow_token');
        this.token = null;
        this.user = null;
        this.showWelcome();
    }

    showWelcome() {
        document.getElementById('welcomeSection').classList.remove('hidden');
        document.getElementById('dashboardSection').classList.add('hidden');
        document.getElementById('loginBtn').classList.remove('hidden');
        document.getElementById('logoutBtn').classList.add('hidden');
    }

    showDashboard() {
        document.getElementById('welcomeSection').classList.add('hidden');
        document.getElementById('dashboardSection').classList.remove('hidden');
        document.getElementById('loginBtn').classList.add('hidden');
        document.getElementById('logoutBtn').classList.remove('hidden');

        if (this.user) {
            document.getElementById('welcomeMessage').textContent = `Welcome back, ${this.user.name}!`;
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new VetFlowApp();
});