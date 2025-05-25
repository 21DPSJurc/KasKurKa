<template>
  <div class="register-view form-view card-style">
    <button @click="$emit('navigateHome')" class="back-button">
      <i class="fas fa-arrow-left"></i> Atpakaļ uz Sākumu
    </button>
    <h2 class="view-title">
      <i class="fas fa-user-plus"></i> Izveidot Jaunu Kontu
    </h2>
    <form @submit.prevent="handleRegister" class="register-form">
      <div class="form-row">
        <div class="form-group half-width">
          <label for="firstName"
            ><i class="fas fa-user-edit form-icon"></i> Vārds:
            <span class="required-field">*</span></label
          >
          <input
            type="text"
            id="firstName"
            v-model="formData.firstName"
            required
            maxlength="30"
            placeholder="Jānis"
            :disabled="isLoading"
          />
        </div>

        <div class="form-group half-width">
          <label for="lastName"
            ><i class="fas fa-user-edit form-icon"></i> Uzvārds:
            <span class="required-field">*</span></label
          >
          <input
            type="text"
            id="lastName"
            v-model="formData.lastName"
            required
            maxlength="30"
            placeholder="Bērziņš"
            :disabled="isLoading"
          />
        </div>
      </div>

      <div class="form-group">
        <label for="email"
          ><i class="fas fa-envelope form-icon"></i> E-pasts:
          <span class="required-field">*</span></label
        >
        <input
          type="email"
          id="email"
          v-model="formData.email"
          required
          placeholder="piemers@epasts.lv"
          :disabled="isLoading"
        />
      </div>

      <div class="form-row">
        <div class="form-group half-width">
          <label for="password"
            ><i class="fas fa-lock form-icon"></i> Parole:
            <span class="required-field">*</span></label
          >
          <input
            type="password"
            id="password"
            v-model="formData.password"
            required
            placeholder="••••••••"
            :disabled="isLoading"
          />
          <small>Min. 8 rakstzīmes, lielais/mazais burts, cipars.</small>
        </div>

        <div class="form-group half-width">
          <label for="confirmPassword"
            ><i class="fas fa-check-circle form-icon"></i> Apstiprināt Paroli:
            <span class="required-field">*</span></label
          >
          <input
            type="password"
            id="confirmPassword"
            v-model="formData.confirmPassword"
            required
            placeholder="••••••••"
            :disabled="isLoading"
          />
        </div>
      </div>

      <hr class="form-divider" />
      <h3 class="form-section-title">
        <i class="fas fa-graduation-cap"></i> Studiju Informācija
      </h3>

      <div class="form-row">
        <div class="form-group half-width">
          <label for="studyStartYear"
            ><i class="fas fa-calendar-alt form-icon"></i> Mācību sākuma gads:
            <span class="required-field">*</span></label
          >
          <input
            type="number"
            id="studyStartYear"
            v-model.number="formData.studyStartYear"
            required
            :min="currentYear - 7"
            :max="currentYear + 1"
            :placeholder="currentYear.toString()"
            :disabled="isLoading"
          />
          <small
            >Gadam jābūt starp {{ currentYear - 7 }} un
            {{ currentYear + 1 }}.</small
          >
        </div>

        <div class="form-group half-width">
          <label for="group"
            ><i class="fas fa-users form-icon"></i> Grupa:
            <span class="required-field">*</span></label
          >
          <input
            type="text"
            id="group"
            v-model="formData.group"
            required
            maxlength="10"
            placeholder="Piem. DT3-1"
            :disabled="isLoading"
          />
          <small>Līdz 10 rakstzīmēm.</small>
        </div>
      </div>

      <div v-if="errorMessage" class="error-message">
        <i class="fas fa-exclamation-triangle"></i> {{ errorMessage }}
      </div>

      <div class="form-actions">
        <button
          type="button"
          @click="$emit('navigateHome')"
          class="action-button secondary-button"
          :disabled="isLoading"
        >
          <i class="fas fa-times"></i> Atcelt
        </button>
        <button
          type="submit"
          class="action-button primary-button"
          :disabled="isLoading"
        >
          <i class="fas fa-user-plus"></i>
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
        studyStartYear: currentYear, // Default to current year
        group: "",
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
        if (
          !this.formData[field] &&
          (typeof this.formData[field] !== "number" ||
            this.formData[field] === null)
        ) {
          this.errorMessage =
            "Lūdzu, aizpildiet visus obligātos laukus ar zvaigznīti.";
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
        this.formData.studyStartYear < this.currentYear - 7 ||
        this.formData.studyStartYear > this.currentYear + 1
      ) {
        this.errorMessage = `Mācību sākuma gadam jābūt starp ${
          this.currentYear - 7
        } un ${this.currentYear + 1}.`;
        this.isLoading = false;
        return;
      }

      if (this.formData.group.length > 10) {
        this.errorMessage =
          "Grupas nosaukums nedrīkst pārsniegt 10 rakstzīmes.";
        this.isLoading = false;
        return;
      }

      try {
        // eslint-disable-next-line no-unused-vars
        const { confirmPassword: _confirmPassword, ...apiData } = this.formData;
        const response = await axios.post("/api/auth/register", apiData);
        console.log("Registration API response:", response.data);
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
/* .register-view inherits .form-view and .card-style from global */

.view-title {
  /* Re-using from DashboardView for consistency */
  color: var(--header-bg-color);
  margin: 0 0 1.5rem 0;
  font-size: 1.8rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
}

.form-row {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.25rem; /* Same as .form-group */
}
.form-group.half-width {
  flex: 1;
  min-width: 0; /* Allows flex items to shrink properly */
  margin-bottom: 0; /* Margin is on .form-row now */
}

.form-icon {
  margin-right: 0.5em;
  color: var(--primary-color);
  opacity: 0.7;
}

.form-divider {
  margin-top: 2rem;
  margin-bottom: 1.5rem;
  border: 0;
  border-top: 1px solid var(--border-color);
}

.form-section-title {
  font-size: 1.1rem;
  color: var(--header-bg-color);
  margin-bottom: 1rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.form-section-title .fas {
  color: var(--secondary-color);
}

.error-message .fas {
  margin-right: 0.5em;
}

.form-actions {
  justify-content: space-between; /* Push cancel to left, submit to right */
}

@media (max-width: 600px) {
  .form-row {
    flex-direction: column;
    gap: 0; /* Remove gap, .form-group will handle margin */
    margin-bottom: 0;
  }
  .form-group.half-width {
    margin-bottom: 1.25rem; /* Add margin back for stacked items */
  }
  .form-actions {
    flex-direction: column-reverse; /* Primary button on top on mobile */
  }
  .form-actions .action-button {
    width: 100%;
  }
  .form-actions .secondary-button {
    /* Cancel button */
    margin-bottom: 0.75rem;
  }
}
</style>
