<template>
  <div class="login-view form-view card-style">
    <button @click="$emit('navigateHome')" class="back-button">
      <i class="fas fa-arrow-left"></i> Atpakaļ uz Sākumu
    </button>
    <h2 class="view-title">
      <i class="fas fa-sign-in-alt"></i> Pieslēgties Sistēmai
    </h2>
    <form @submit.prevent="handleLogin" class="login-form">
      <div class="form-group">
        <label for="email"
          ><i class="fas fa-envelope form-icon"></i> E-pasts:</label
        >
        <input
          type="email"
          id="email"
          v-model="email"
          required
          placeholder="ievadiet.epastu@piemers.lv"
          :disabled="isLoading"
        />
      </div>

      <div class="form-group">
        <label for="password"
          ><i class="fas fa-lock form-icon"></i> Parole:</label
        >
        <input
          type="password"
          id="password"
          v-model="password"
          required
          placeholder="••••••••"
          :disabled="isLoading"
        />
      </div>

      <div v-if="errorMessage" class="error-message">
        <i class="fas fa-exclamation-triangle"></i> {{ errorMessage }}
      </div>

      <div class="form-actions">
        <button
          type="submit"
          class="action-button primary-button login-submit-button"
          :disabled="isLoading"
        >
          <i class="fas fa-sign-in-alt"></i>
          {{ isLoading ? "Pieslēdzas..." : "Pieslēgties" }}
        </button>
      </div>
    </form>
    <p class="register-prompt">
      Nav vēl konta?
      <button
        @click="$emit('navigateToRegister')"
        class="link-button"
        :disabled="isLoading"
      >
        <i class="fas fa-user-plus"></i> Reģistrēties šeit
      </button>
    </p>
  </div>
</template>

<script>
import axios from "axios";

export default {
  name: "LoginView",
  data() {
    return {
      email: "",
      password: "",
      errorMessage: "",
      isLoading: false,
    };
  },
  methods: {
    async handleLogin() {
      this.errorMessage = "";
      this.isLoading = true;

      if (!this.email || !this.password) {
        this.errorMessage = "Lūdzu, ievadiet e-pastu un paroli.";
        this.isLoading = false;
        return;
      }

      try {
        const response = await axios.post("/api/auth/login", {
          email: this.email,
          password: this.password,
        });
        this.$emit("loginSuccess", response.data);
      } catch (error) {
        if (error.response && error.response.data && error.response.data.msg) {
          this.errorMessage = error.response.data.msg;
        } else if (error.request) {
          this.errorMessage =
            "Nevarēja sazināties ar serveri. Lūdzu, mēģiniet vēlāk.";
        } else {
          this.errorMessage = "Pieslēgšanās kļūda. Lūdzu, mēģiniet vēlāk.";
        }
        console.error("Login error:", error);
      } finally {
        this.isLoading = false;
      }
    },
  },
};
</script>

<style scoped>
/* .login-view inherits .form-view and .card-style from global */

.view-title {
  /* Re-using from DashboardView/RegisterView for consistency */
  color: var(--header-bg-color);
  margin: 0 0 1.5rem 0;
  font-size: 1.8rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
}

.form-icon {
  margin-right: 0.5em;
  color: var(--primary-color);
  opacity: 0.7;
}

.error-message .fas {
  margin-right: 0.5em;
}

.form-actions {
  justify-content: center; /* Center the login button */
  margin-top: 1.5rem;
}

.login-submit-button {
  min-width: 200px; /* Give login button a decent width */
}

.register-prompt {
  text-align: center;
  margin-top: 1.5rem;
  font-size: 0.95rem;
  color: var(--text-color);
}
.link-button {
  background: none;
  border: none;
  color: var(--link-color);
  cursor: pointer;
  text-decoration: none; /* Remove underline by default */
  padding: 0.25rem; /* Small padding for easier clicking */
  font-size: 1em; /* Match surrounding text */
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  transition: color 0.2s ease;
}
.link-button:hover:not([disabled]) {
  color: var(--link-hover-color);
  text-decoration: underline;
}
.link-button[disabled] {
  color: #bdc3c7;
  cursor: not-allowed;
  text-decoration: none;
}

@media (max-width: 600px) {
  .login-submit-button {
    width: 100%; /* Full width on mobile */
  }
}
</style>
