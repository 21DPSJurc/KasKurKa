<!-- kaskurka/src/views/RegisterView.vue -->
<template>
  <div class="register-view form-view">
    <button @click="$emit('navigateHome')" class="back-button">
      ← Atpakaļ
    </button>
    <h2>Reģistrācija</h2>
    <form @submit.prevent="handleRegister" class="register-form">
      <div class="form-group">
        <label for="firstName"
          >Vārds: <span class="required-field">*</span></label
        >
        <input
          type="text"
          id="firstName"
          v-model="formData.firstName"
          required
          maxlength="30"
        />
      </div>

      <div class="form-group">
        <label for="lastName"
          >Uzvārds: <span class="required-field">*</span></label
        >
        <input
          type="text"
          id="lastName"
          v-model="formData.lastName"
          required
          maxlength="30"
        />
      </div>

      <div class="form-group">
        <label for="email"
          >E-pasts: <span class="required-field">*</span></label
        >
        <input type="email" id="email" v-model="formData.email" required />
      </div>

      <div class="form-group">
        <label for="password"
          >Parole: <span class="required-field">*</span></label
        >
        <input
          type="password"
          id="password"
          v-model="formData.password"
          required
        />
        <small
          >Minimālais garums 8 rakstzīmes, vismaz viens lielais burts, viens
          mazais burts un viens cipars.</small
        >
      </div>

      <div class="form-group">
        <label for="confirmPassword"
          >Apstiprināt Paroli: <span class="required-field">*</span></label
        >
        <input
          type="password"
          id="confirmPassword"
          v-model="formData.confirmPassword"
          required
        />
      </div>

      <div class="form-group">
        <label for="studyStartYear"
          >Mācību sākuma gads: <span class="required-field">*</span></label
        >
        <input
          type="number"
          id="studyStartYear"
          v-model.number="formData.studyStartYear"
          required
          :min="currentYear - 4"
          :max="currentYear"
        />
        <small
          >Piemēram, {{ currentYear - 1 }}. Gadam jābūt starp
          {{ currentYear - 4 }} un {{ currentYear }}.</small
        >
      </div>

      <div class="form-group">
        <label for="group">Grupa: <span class="required-field">*</span></label>
        <input
          type="text"
          id="group"
          v-model="formData.group"
          required
          maxlength="10" 
        />
        <small>Piemēram, DT3 vai DP2-1 (līdz 10 rakstzīmēm).</small>
      </div>

      <!-- Removed Subgroup Field
      <div class="form-group">
        <label for="subgroup">Apakšgrupa (nav obligāts):</label>
        <input
          type="text"
          id="subgroup"
          v-model="formData.subgroup"
          maxlength="2"
        />
        <small>Piemēram, 4 (līdz 2 rakstzīmēm).</small>
      </div>
      -->

      <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>
      <!-- successMessage is handled by App.vue alert for now -->

      <div class="form-actions">
        <span></span>
        <button type="submit" class="action-button" :disabled="isLoading">
          {{ isLoading ? "Reģistrējas..." : "Reģistrēties" }}
        </button>
      </div>
    </form>
  </div>
</template>

<script>
import axios from "axios";

export default {
  name: "RegisterView",
  data() {
    const currentYear = new Date().getFullYear();
    return {
      formData: {
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        confirmPassword: "",
        studyStartYear: null,
        group: "",
        // subgroup: "", // Removed subgroup
      },
      currentYear: currentYear,
      errorMessage: "",
      isLoading: false,
    };
  },
  methods: {
    async handleRegister() {
      this.errorMessage = "";
      this.isLoading = true;

      // Client-side validation (from specification 2.2.1)
      const requiredFields = [
        "firstName",
        "lastName",
        "email",
        "password",
        "confirmPassword",
        "studyStartYear",
        "group",
      ];
      for (const field of requiredFields) {
        if (!this.formData[field] && field !== "studyStartYear") {
          this.errorMessage =
            "Lūdzu, aizpildiet visus obligātos laukus ar zvaigznīti.";
          this.isLoading = false;
          return;
        }
        if (
          field === "studyStartYear" &&
          (this.formData[field] === null || this.formData[field] === undefined)
        ) {
          this.errorMessage = "Lūdzu, izvēlieties mācību sākuma gadu.";
          this.isLoading = false;
          return;
        }
      }

      if (!/^\S+@\S+\.\S+$/.test(this.formData.email)) {
        this.errorMessage = "Nepareizs e-pasta formāts.";
        this.isLoading = false;
        return;
      }

      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
      if (!passwordRegex.test(this.formData.password)) {
        this.errorMessage =
          "Parolei jābūt vismaz 8 rakstzīmes garai un jāsatur vismaz viens lielais burts, viens mazais burts un viens cipars.";
        this.isLoading = false;
        return;
      }

      if (this.formData.password !== this.formData.confirmPassword) {
        this.errorMessage = "Ievadītās paroles nesakrīt.";
        this.isLoading = false;
        return;
      }

      if (
        this.formData.studyStartYear < this.currentYear - 7 || // Increased range as per EditUserView
        this.formData.studyStartYear > this.currentYear + 1
      ) {
        this.errorMessage = `Mācību sākuma gadam jābūt starp ${
          this.currentYear - 7
        } un ${this.currentYear + 1}.`;
        this.isLoading = false;
        return;
      }

      if (this.formData.group.length > 10) { // Maxlength updated
        this.errorMessage = "Grupas nosaukums nedrīkst pārsniegt 10 rakstzīmes.";
        this.isLoading = false;
        return;
      }
      // Subgroup validation removed

      try {
        // Prepare data for API, exclude confirmPassword
        // eslint-disable-next-line no-unused-vars
        const { confirmPassword: _confirmPassword, ...apiData } = this.formData;

        const response = await axios.post("/api/auth/register", apiData);

        console.log("Registration API response:", response.data);
        // App.vue will show the success alert via `registrationSuccess` event
        this.$emit("registrationSuccess");
      } catch (error) {
        if (error.response && error.response.data && error.response.data.msg) {
          this.errorMessage = error.response.data.msg;
        } else {
          this.errorMessage = "Reģistrācijas kļūda. Lūdzu, mēģiniet vēlāk.";
        }
        console.error("Registration error:", error);
      } finally {
        this.isLoading = false;
      }
    },
  },
};
</script>

<style scoped>
/* Styles are mostly global from App.vue */
.register-view h2 {
  margin-top: 0;
}
.register-form .action-button {
  width: auto;
}
@media (max-width: 600px) {
  .register-form .action-button {
    width: 100%;
  }
}
</style>