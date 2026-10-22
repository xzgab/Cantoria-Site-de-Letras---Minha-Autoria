/* ==========================================================================
   Cantoria — Login e criação de conta
   ========================================================================== */

(function () {
  "use strict";

  function getRedirect() {
    const params = new URLSearchParams(window.location.search);
    const target = params.get("redirect");
    if (!target) return "";
    /* Permite apenas caminhos relativos seguros */
    if (/^https?:|^\/\//i.test(target)) return "";
    return target;
  }

  function setError(el, message) {
    if (!el) return;
    if (message) {
      el.textContent = message;
      el.hidden = false;
    } else {
      el.textContent = "";
      el.hidden = true;
    }
  }

  function showTab(tab) {
    const loginForm = document.getElementById("login-form");
    const registerForm = document.getElementById("register-form");
    const tabLogin = document.getElementById("tab-login");
    const tabRegister = document.getElementById("tab-register");
    const title = document.getElementById("auth-title");
    const subtitle = document.getElementById("auth-subtitle");

    const isRegister = tab === "register";
    if (loginForm) loginForm.hidden = isRegister;
    if (registerForm) registerForm.hidden = !isRegister;
    if (tabLogin) tabLogin.classList.toggle("active", !isRegister);
    if (tabRegister) tabRegister.classList.toggle("active", isRegister);

    if (title) title.textContent = isRegister ? "Crie sua conta" : "Bem-vindo de volta";
    if (subtitle) {
      subtitle.textContent = isRegister
        ? "É rápido e gratuito: envie letras e acompanhe suas contribuições."
        : "Entre para enviar letras e acompanhar suas contribuições.";
    }
    setError(document.getElementById("login-error"), "");
    setError(document.getElementById("register-error"), "");
  }

  function finishLogin(user) {
    UI.toast("Bem-vindo, " + user.name.split(" ")[0] + "!", "success");
    const redirect = getRedirect();
    const fallback = user.role === "admin" ? "admin.html" : "index.html";
    setTimeout(function () {
      window.location.href = redirect || fallback;
    }, 500);
  }

  document.addEventListener("DOMContentLoaded", function () {
    /* Se já está logado, não faz sentido ficar aqui */
    const current = Store.getCurrentUser();
    if (current) {
      const redirect = getRedirect();
      UI.toast("Você já está conectado como " + current.name + ".", "info");
      setTimeout(function () {
        window.location.href = redirect || "index.html";
      }, 900);
    }

    const params = new URLSearchParams(window.location.search);
    showTab(params.get("tab") === "register" ? "register" : "login");

    const tabLogin = document.getElementById("tab-login");
    const tabRegister = document.getElementById("tab-register");
    if (tabLogin) tabLogin.addEventListener("click", function () { showTab("login"); });
    if (tabRegister) tabRegister.addEventListener("click", function () { showTab("register"); });

    /* ---------- Login ---------- */
    const loginForm = document.getElementById("login-form");
    if (loginForm) {
      loginForm.addEventListener("submit", function (e) {
        e.preventDefault();
        const email = document.getElementById("l-email");
        const password = document.getElementById("l-password");
        const errorEl = document.getElementById("login-error");
        const button = loginForm.querySelector('button[type="submit"]');

        setError(errorEl, "");

        if (!email.value.trim() || !password.value) {
          setError(errorEl, "Preencha o e-mail e a senha.");
          return;
        }

        if (button) { button.disabled = true; button.textContent = "Entrando..."; }

        const result = Store.login(email.value, password.value);
        if (!result.ok) {
          setError(errorEl, result.error);
          if (button) { button.disabled = false; button.textContent = "Entrar"; }
          password.value = "";
          password.focus();
          return;
        }

        finishLogin(result.user);
      });
    }

    /* ---------- Registro ---------- */
    const registerForm = document.getElementById("register-form");
    if (registerForm) {
      registerForm.addEventListener("submit", function (e) {
        e.preventDefault();
        const name = document.getElementById("r-name");
        const email = document.getElementById("r-email");
        const password = document.getElementById("r-password");
        const password2 = document.getElementById("r-password2");
        const errorEl = document.getElementById("register-error");
        const button = registerForm.querySelector('button[type="submit"]');

        setError(errorEl, "");

        if (!name.value.trim() || !email.value.trim() || !password.value) {
          setError(errorEl, "Preencha todos os campos.");
          return;
        }
        if (password.value.length < 6) {
          setError(errorEl, "A senha deve ter pelo menos 6 caracteres.");
          return;
        }
        if (password.value !== password2.value) {
          setError(errorEl, "As senhas não coincidem.");
          password2.classList.add("invalid");
          return;
        }
        password2.classList.remove("invalid");

        if (button) { button.disabled = true; button.textContent = "Criando conta..."; }

        const result = Store.register({
          name: name.value,
          email: email.value,
          password: password.value
        });

        if (!result.ok) {
          setError(errorEl, result.error);
          if (button) { button.disabled = false; button.textContent = "Criar minha conta"; }
          return;
        }

        UI.toast("Conta criada com sucesso!", "success");
        finishLogin(result.user);
      });

      const password2 = document.getElementById("r-password2");
      if (password2) {
        password2.addEventListener("input", function () { password2.classList.remove("invalid"); });
      }
    }
  });
})();
