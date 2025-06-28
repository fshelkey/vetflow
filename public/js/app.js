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
        // Registration modal events
        document.getElementById('registerBtn').addEventListener('click', () => this.showRegisterModal());
        document.getElementById('closeRegisterModal').addEventListener('click', () => this.hideRegisterModal());
        document.getElementById('cancelRegister').addEventListener('click', () => this.hideRegisterModal());
        document.getElementById('registerForm').addEventListener('submit', (e) => this.handleRegister(e));

        // Login modal events
        document.getElementById('loginBtn').addEventListener('click', () => this.showLoginModal());
        document.getElementById('closeModal').addEventListener('click', () => this.hideLoginModal());
        document.getElementById('cancelLogin').addEventListener('click', () => this.hideLoginModal());
        document.getElementById('loginForm').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('logoutBtn').addEventListener('click', () => this.handleLogout());

        // Close modals when clicking outside
        document.getElementById('registerModal').addEventListener('click', (e) => {
            if (e.target.id === 'registerModal') {
                this.hideRegisterModal();
            }
        });

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

    // Registration Modal Methods
    showRegisterModal() {
        document.getElementById('registerModal').classList.remove('hidden');
        document.getElementById('registerFullName').focus();
    }

    hideRegisterModal() {
        document.getElementById('registerModal').classList.add('hidden');
        document.getElementById('registerForm').reset();
        document.getElementById('registerError').classList.add('hidden');
        document.getElementById('registerSuccess').classList.add('hidden');
        this.setRegisterLoading(false);
    }

    setRegisterLoading(loading) {
        const submitBtn = document.querySelector('#registerForm button[type="submit"]');
        const btnText = document.getElementById('registerBtnText');
        const spinner = document.getElementById('registerSpinner');

        if (loading) {
            submitBtn.disabled = true;
            btnText.textContent = 'Creating Account...';
            spinner.classList.remove('hidden');
        } else {
            submitBtn.disabled = false;
            btnText.textContent = 'Create Account';
            spinner.classList.add('hidden');
        }
    }

    showRegisterError(message) {
        const errorDiv = document.getElementById('registerError');
        errorDiv.textContent = message;
        errorDiv.classList.remove('hidden');
        document.getElementById('registerSuccess').classList.add('hidden');
    }

    showRegisterSuccess(message) {
        const successDiv = document.getElementById('registerSuccess');
        successDiv.textContent = message;
        successDiv.classList.remove('hidden');
        document.getElementById('registerError').classList.add('hidden');
    }

    async handleRegister(e) {
        e.preventDefault();
        this.setRegisterLoading(true);

        const formData = new FormData(e.target);
        const fullName = formData.get('fullName');
        const email = formData.get('email');
        const password = formData.get('password');

        try {
            const response = await fetch('/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ fullName, email, password })
            });

            const data = await response.json();

            if (response.ok) {
                this.showRegisterSuccess('Admin account created successfully! You can now login.');
                // Clear form and switch to login after a delay
                setTimeout(() => {
                    this.hideRegisterModal();
                    this.showLoginModal();
                    // Pre-fill email in login form
                    document.getElementById('email').value = email;
                }, 2000);
            } else {
                this.showRegisterError(data.error || 'Registration failed');
            }
        } catch (error) {
            console.error('Registration error:', error);
            this.showRegisterError('Network error. Please try again.');
        } finally {
            this.setRegisterLoading(false);
        }
    }

    // Login Modal Methods
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
        document.getElementById('registerBtn').classList.remove('hidden');
        document.getElementById('loginBtn').classList.remove('hidden');
        document.getElementById('logoutBtn').classList.add('hidden');
    }

    showDashboard() {
        document.getElementById('welcomeSection').classList.add('hidden');
        document.getElementById('dashboardSection').classList.remove('hidden');
        document.getElementById('registerBtn').classList.add('hidden');
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