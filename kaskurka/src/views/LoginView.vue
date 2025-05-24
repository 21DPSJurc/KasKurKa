<template>
  <div class="login-view form-view">
    <button @click="$emit('navigateHome')" class="back-button">
      ← Atpakaļ
    </button>
    <h2>Pieslēgšanās</h2>
    <form @submit.prevent="handleLogin" class="login-form">
      <div class="form-group">
        <label for="email">E-pasts:</label>
        <input type="email" id="email" v-model="email" required :disabled="isLoading" />
      </div>

      <div class="form-group">
        <label for="password">Parole:</label>
        <input type="password" id="password" v-model="password" required :disabled="isLoading" />
      </div>

      <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>

      <div class="form-actions">
        <span></span> 
        <button type="submit" class="action-button" :disabled="isLoading">
          {{ isLoading ? "Pieslēdzas..." : "Pieslēgties" }}
        </button>
      </div>
    </form>
    <p class="register-prompt">
      Nav vēl konta?
      <button @click="$emit('navigateToRegister')" class="link-button" :disabled="isLoading">
        Reģistrēties
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
        this.errorMessage = "Lūdzu, ievadiet e-pastu un paroli."; // Spec 2.2.2 error
        this.isLoading = false;
        return;
      }

      try {
        const response = await axios.post("/api/auth/login", {
          email: this.email,
          password: this.password,
        });
        
        // On successful login, response.data will contain token and user object
        // console.log("Login successful:", response.data);
        this.$emit("loginSuccess", response.data); // Pass token and user object to App.vue

      } catch (error) {
        if (error.response && error.response.data && error.response.data.msg) {
          this.errorMessage = error.response.data.msg;
        } else if (error.request) {
          this.errorMessage = "Nevarēja sazināties ar serveri. Lūdzu, mēģiniet vēlāk.";
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
/* Most styles are now global in App.vue under .form-view, .form-group etc. */
.login-view h2 {
  margin-top: 0; 
}
.register-prompt {
  text-align: center;
  margin-top: 20px;
  font-size: 0.9em;
}
.link-button {
  background: none;
  border: none;
  color: #3498db;
  cursor: pointer;
  text-decoration: underline;
  padding: 0;
  font-size: 1em; 
}
.link-button:hover {
  color: #2980b9;
}
.link-button[disabled] {
  color: #bdc3c7;
  cursor: not-allowed;
  text-decoration: none;
}

.login-form .action-button {
  width: auto; 
}
@media (max-width: 600px) {
  .login-form .action-button {
     width: 100%; 
  }
}
</style>