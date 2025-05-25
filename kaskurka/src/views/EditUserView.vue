<template>
  <div class="form-view edit-user-view card-style">
    <button @click="cancelEdit" class="back-button" :disabled="isLoading">
      <i class="fas fa-arrow-left"></i> Atpakaļ uz Lietotāju Pārvaldību
    </button>
    <h2 class="view-title">
      <i class="fas fa-user-edit"></i> Rediģēt Lietotāju:
      <span class="user-original-name"
        >{{ originalUserData.firstName }} {{ originalUserData.lastName }}</span
      >
    </h2>

    <div v-if="initialLoadingError" class="error-message">
      <i class="fas fa-exclamation-triangle"></i> {{ initialLoadingError }}
    </div>

    <form
      @submit.prevent="submitUpdateUser"
      class="edit-user-form"
      v-if="!initialLoadingError && user.email"
    >
      <h3 class="form-section-title">
        <i class="fas fa-id-card"></i> Pamatinformācija
      </h3>
      <div class="form-row">
        <div class="form-group half-width">
          <label for="firstName"
            ><i class="fas fa-user form-icon"></i> Vārds:
            <span class="required-field">*</span></label
          >
          <input
            type="text"
            id="firstName"
            v-model="user.firstName"
            required
            maxlength="30"
            :disabled="isLoading"
          />
        </div>

        <div class="form-group half-width">
          <label for="lastName"
            ><i class="fas fa-user form-icon"></i> Uzvārds:
            <span class="required-field">*</span></label
          >
          <input
            type="text"
            id="lastName"
            v-model="user.lastName"
            required
            maxlength="30"
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
          v-model="user.email"
          required
          :disabled="isLoading"
        />
      </div>

      <div class="form-group">
        <label for="role"
          ><i class="fas fa-user-tag form-icon"></i> Loma:
          <span class="required-field">*</span></label
        >
        <select
          id="role"
          v-model="user.role"
          required
          :disabled="isLoading || originalUserData._id === currentAdminId"
        >
          <option value="student">Students</option>
          <option value="admin">Administrators</option>
        </select>
        <small v-if="originalUserData._id === currentAdminId"
          ><i class="fas fa-info-circle"></i> Administratoram nevar mainīt savu
          lomu.</small
        >
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
            v-model.number="user.studyStartYear"
            required
            :min="currentYear - 7"
            :max="currentYear + 1"
            :disabled="isLoading"
          />
        </div>

        <div class="form-group half-width">
          <label for="group"
            ><i class="fas fa-users form-icon"></i> Grupa:
            <span class="required-field">*</span></label
          >
          <input
            type="text"
            id="group"
            v-model="user.group"
            required
            maxlength="10"
            :disabled="isLoading"
          />
        </div>
      </div>

      <hr class="form-divider" />
      <h3 class="form-section-title">
        <i class="fas fa-key"></i> Paroles Maiņa (Neobligāti)
      </h3>
      <div class="form-row">
        <div class="form-group half-width">
          <label for="newPassword"
            ><i class="fas fa-lock form-icon"></i> Jaunā Parole:</label
          >
          <input
            type="password"
            id="newPassword"
            v-model="user.newPassword"
            placeholder="Atstājiet tukšu, ja nemaināt"
            :disabled="isLoading"
          />
        </div>
        <div class="form-group half-width" v-if="user.newPassword">
          <label for="confirmNewPassword"
            ><i class="fas fa-check-circle form-icon"></i> Apstiprināt
            Paroli:</label
          >
          <input
            type="password"
            id="confirmNewPassword"
            v-model="user.confirmNewPassword"
            :disabled="isLoading"
          />
        </div>
      </div>
      <small v-if="user.newPassword"
        >Parolei jābūt min. 8 rakstzīmes, ar lielo/mazo burtu un ciparu.</small
      >

      <div v-if="successMessage" class="success-message">
        <i class="fas fa-check-circle"></i> {{ successMessage }}
      </div>
      <div v-if="errorMessage" class="error-message">
        <i class="fas fa-exclamation-triangle"></i> {{ errorMessage }}
      </div>

      <div class="form-actions">
        <button
          type="button"
          @click="cancelEdit"
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
          <i class="fas fa-save"></i>
          {{ isLoading ? "Saglabā..." : "Saglabāt Izmaiņas" }}
        </button>
      </div>
    </form>
  </div>
</template>

<script>
// Script section remains the same as previously provided
import axios from "axios";

export default {
  name: "EditUserView",
  props: {
    userIdToEdit: {
      type: String,
      required: true,
    },
    currentAdminId: String, // To prevent admin from changing their own role
  },
  data() {
    const currentYear = new Date().getFullYear();
    return {
      user: {
        firstName: "",
        lastName: "",
        email: "",
        role: "student",
        studyStartYear: currentYear,
        group: "",
        newPassword: "",
        confirmNewPassword: "",
      },
      originalUserData: {},
      currentYear: currentYear,
      isLoading: false,
      initialLoadingError: "",
      errorMessage: "",
      successMessage: "",
    };
  },
  watch: {
    userIdToEdit: {
      immediate: true,
      handler(newVal) {
        if (newVal) {
          this.fetchUserDetails(newVal);
        } else {
          this.initialLoadingError = "Lietotāja ID nav norādīts rediģēšanai.";
        }
      },
    },
  },
  methods: {
    async fetchUserDetails(userId) {
      this.isLoading = true;
      this.initialLoadingError = "";
      this.errorMessage = "";
      this.successMessage = "";
      try {
        const response = await axios.get(`/api/users/${userId}`);
        this.originalUserData = { ...response.data };

        this.user.firstName = response.data.firstName;
        this.user.lastName = response.data.lastName;
        this.user.email = response.data.email;
        this.user.role = response.data.role;
        this.user.studyStartYear =
          response.data.studyStartYear || this.currentYear;
        this.user.group = response.data.group || "";
        this.user.newPassword = "";
        this.user.confirmNewPassword = "";
      } catch (error) {
        console.error("Error fetching user details:", error);
        this.initialLoadingError =
          error.response?.data?.msg ||
          "Kļūda ielādējot lietotāja datus rediģēšanai.";
        if (error.response?.status === 404) {
          setTimeout(() => this.$emit("cancelEditUser"), 3000);
        }
      } finally {
        this.isLoading = false;
      }
    },
    cancelEdit() {
      this.$emit("cancelEditUser");
    },
    validateForm() {
      this.errorMessage = "";
      this.successMessage = "";
      const requiredFields = [
        "firstName",
        "lastName",
        "email",
        "role",
        "studyStartYear",
        "group",
      ];
      for (const field of requiredFields) {
        if (
          !this.user[field] &&
          (typeof this.user[field] !== "number" ||
            this.user[field] === null ||
            this.user[field] === undefined ||
            this.user[field] === "")
        ) {
          this.errorMessage =
            "Lūdzu, aizpildiet visus obligātos laukus ar zvaigznīti.";
          return false;
        }
      }
      if (!/^\S+@\S+\.\S+$/.test(this.user.email)) {
        this.errorMessage = "Nepareizs e-pasta formāts.";
        return false;
      }
      if (!["student", "admin"].includes(this.user.role)) {
        this.errorMessage = "Nederīga lietotāja loma.";
        return false;
      }

      if (this.user.newPassword) {
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
        if (!passwordRegex.test(this.user.newPassword)) {
          this.errorMessage =
            "Jaunajai parolei jābūt vismaz 8 rakstzīmes garai un jāsatur vismaz viens lielais burts, viens mazais burts un viens cipars.";
          return false;
        }
        if (this.user.newPassword !== this.user.confirmNewPassword) {
          this.errorMessage = "Ievadītās jaunās paroles nesakrīt.";
          return false;
        }
      }
      return true;
    },
    async submitUpdateUser() {
      if (!this.validateForm()) return;

      this.isLoading = true;
      this.errorMessage = "";
      this.successMessage = "";

      const updateData = {
        firstName: this.user.firstName.trim(),
        lastName: this.user.lastName.trim(),
        email: this.user.email.trim().toLowerCase(),
        role: this.user.role,
        studyStartYear: parseInt(this.user.studyStartYear, 10),
        group: this.user.group.trim(),
      };
      if (this.user.newPassword) {
        updateData.newPassword = this.user.newPassword;
      }

      try {
        const response = await axios.put(
          `/api/users/${this.userIdToEdit}`,
          updateData
        );
        this.successMessage = response.data.msg;

        const loggedInUser = JSON.parse(localStorage.getItem("user"));
        if (loggedInUser && loggedInUser.id === this.userIdToEdit) {
          // If admin edits their own profile (excluding password change here for simplicity in local storage)
          const updatedDetailsForLocalStorage = { ...response.data.user };
          delete updatedDetailsForLocalStorage.password; // Never store password in localStorage

          const updatedLoggedInUser = {
            ...loggedInUser, // Keep existing JWT relevant fields like enrolledCustomGroups etc.
            firstName: updatedDetailsForLocalStorage.firstName,
            lastName: updatedDetailsForLocalStorage.lastName,
            email: updatedDetailsForLocalStorage.email,
            role: updatedDetailsForLocalStorage.role,
            studyStartYear: updatedDetailsForLocalStorage.studyStartYear,
            group: updatedDetailsForLocalStorage.group,
          };
          localStorage.setItem("user", JSON.stringify(updatedLoggedInUser));
          // Potentially emit an event to App.vue to refresh its own currentUser if needed
          // This is important if admin changes their own role, for example.
          if (this.refreshUser) {
            // Assuming refreshUser is injected
            await this.refreshUser();
          }
        }

        setTimeout(() => {
          this.$emit("userUpdateSuccess", this.successMessage);
        }, 1800);
      } catch (error) {
        if (error.response && error.response.data && error.response.data.msg) {
          this.errorMessage = error.response.data.msg;
        } else {
          this.errorMessage =
            "Kļūda atjauninot lietotāja datus. Lūdzu, mēģiniet vēlāk.";
        }
        console.error("User update error:", error);
      } finally {
        if (this.errorMessage) {
          this.isLoading = false;
        }
        // If success, isLoading will be true until navigation
      }
    },
  },
};
</script>

<style scoped>
/* .edit-user-view inherits .form-view and .card-style from global */
.edit-user-view {
  padding: 1.5rem;
}
.view-title {
  color: var(--header-bg-color);
  margin: 0 0 1.5rem 0;
  font-size: 1.8rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  text-align: center;
}
.view-title .user-original-name {
  color: var(--primary-color);
  font-weight: 500;
  font-size: 0.9em; /* Slightly smaller than main title */
  word-break: break-all;
}

.form-section-title {
  font-size: 1.2rem;
  color: var(--primary-color);
  margin-top: 2rem;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.form-section-title:first-of-type {
  margin-top: 0;
}

.form-icon {
  margin-right: 0.5em;
  color: var(--primary-color);
  opacity: 0.7;
}

.form-row {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.25rem;
}
.form-group.half-width {
  flex: 1;
  min-width: 0;
  margin-bottom: 0;
}

.form-divider {
  margin-top: 2rem;
  margin-bottom: 1.5rem;
  border: 0;
  border-top: 1px solid var(--border-color);
}
.form-group small .fas {
  margin-right: 0.3em;
  opacity: 0.8;
}

.success-message .fas,
.error-message .fas {
  margin-right: 0.5em;
}

.form-actions {
  justify-content: space-between;
  margin-top: 1.5rem;
}

@media (max-width: 768px) {
  /* Increased breakpoint for form-row stacking */
  .form-row {
    flex-direction: column;
    gap: 0;
    margin-bottom: 0;
  }
  .form-group.half-width {
    margin-bottom: 1.25rem;
  }
}

@media (max-width: 600px) {
  .form-actions {
    flex-direction: column-reverse;
  }
  .form-actions .action-button {
    width: 100%;
  }
  .form-actions .secondary-button {
    margin-bottom: 0.75rem;
  }
}
</style>
