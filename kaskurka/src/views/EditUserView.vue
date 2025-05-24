<template>
  <div class="form-view edit-user-view">
    <button @click="cancelEdit" class="back-button" :disabled="isLoading">
      ← Atpakaļ uz Lietotāju Pārvaldību
    </button>
    <h2>
      Rediģēt Lietotāju: {{ originalUserData.firstName }}
      {{ originalUserData.lastName }}
    </h2>

    <div v-if="initialLoadingError" class="error-message">
      {{ initialLoadingError }}
    </div>

    <form
      @submit.prevent="submitUpdateUser"
      class="edit-user-form"
      v-if="!initialLoadingError && user.email"
    >
      <div class="form-group">
        <label for="firstName"
          >Vārds: <span class="required-field">*</span></label
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

      <div class="form-group">
        <label for="lastName"
          >Uzvārds: <span class="required-field">*</span></label
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

      <div class="form-group">
        <label for="email"
          >E-pasts: <span class="required-field">*</span></label
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
        <label for="role">Loma: <span class="required-field">*</span></label>
        <select id="role" v-model="user.role" required :disabled="isLoading">
          <option value="student">Students</option>
          <option value="admin">Administrators</option>
        </select>
      </div>

      <hr class="form-divider" />
      <h3>Studiju Informācija (Studentiem)</h3>

      <div class="form-group">
        <label for="studyStartYear"
          >Mācību sākuma gads: <span class="required-field">*</span></label
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
        <small>Piemēram, {{ currentYear - 1 }}.</small>
      </div>

      <div class="form-group">
        <label for="group">Grupa: <span class="required-field">*</span></label>
        <input
          type="text"
          id="group"
          v-model="user.group"
          required
          maxlength="10"
          :disabled="isLoading"
        />
        <small>Piemēram, DT3 (līdz 10 rakstzīmēm).</small>
      </div>

      <div class="form-group">
        <label for="subgroup">Apakšgrupa:</label>
        <input
          type="text"
          id="subgroup"
          v-model="user.subgroup"
          maxlength="5"
          :disabled="isLoading"
        />
        <small>Piemēram, 1 vai P1 (līdz 5 rakstzīmēm).</small>
      </div>

      <hr class="form-divider" />
      <h3>Paroles Maiņa (Neobligāti)</h3>
      <div class="form-group">
        <label for="newPassword">Jaunā Parole:</label>
        <input
          type="password"
          id="newPassword"
          v-model="user.newPassword"
          :disabled="isLoading"
        />
        <small
          >Atstājiet tukšu, lai nemainītu paroli. Ja ievadāt, jāatbilst drošības
          prasībām.</small
        >
      </div>
      <div class="form-group" v-if="user.newPassword">
        <label for="confirmNewPassword">Apstiprināt Jauno Paroli:</label>
        <input
          type="password"
          id="confirmNewPassword"
          v-model="user.confirmNewPassword"
          :disabled="isLoading"
        />
      </div>

      <div v-if="successMessage" class="success-message">
        {{ successMessage }}
      </div>
      <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>

      <div class="form-actions">
        <button
          type="button"
          @click="cancelEdit"
          class="action-button secondary-action"
          :disabled="isLoading"
        >
          Atcelt
        </button>
        <span></span>
        <button type="submit" class="action-button" :disabled="isLoading">
          {{ isLoading ? "Saglabā..." : "Saglabāt Izmaiņas" }}
        </button>
      </div>
    </form>
  </div>
</template>

<script>
import axios from "axios";

export default {
  name: "EditUserView",
  props: {
    userIdToEdit: {
      type: String,
      required: true,
    },
  },
  data() {
    const currentYear = new Date().getFullYear();
    return {
      user: {
        // Form data
        firstName: "",
        lastName: "",
        email: "",
        role: "student",
        studyStartYear: currentYear,
        group: "",
        subgroup: "",
        newPassword: "",
        confirmNewPassword: "",
      },
      originalUserData: {}, // To display original name in title or compare changes
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
        this.originalUserData = { ...response.data }; // Keep a copy of original

        // Populate form fields
        this.user.firstName = response.data.firstName;
        this.user.lastName = response.data.lastName;
        this.user.email = response.data.email;
        this.user.role = response.data.role;
        this.user.studyStartYear =
          response.data.studyStartYear || this.currentYear;
        this.user.group = response.data.group || "";
        this.user.subgroup = response.data.subgroup || "";
        this.user.newPassword = ""; // Always clear password fields on load
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
        if (!this.user[field] && field !== "studyStartYear") {
          // String fields
          this.errorMessage =
            "Lūdzu, aizpildiet visus obligātos laukus ar zvaigznīti.";
          return false;
        }
        if (
          field === "studyStartYear" &&
          (this.user[field] === null ||
            this.user[field] === undefined ||
            this.user[field] === "")
        ) {
          this.errorMessage = "Lūdzu, norādiet mācību sākuma gadu.";
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

      // Password validation only if newPassword is provided
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
        subgroup: this.user.subgroup.trim(),
      };
      if (this.user.newPassword) {
        updateData.newPassword = this.user.newPassword; // Backend will hash it
      }

      try {
        const response = await axios.put(
          `/api/users/${this.userIdToEdit}`,
          updateData
        );
        this.successMessage = response.data.msg;
        // Update current user in localStorage if admin is editing themselves (and role changed)
        const loggedInUser = JSON.parse(localStorage.getItem("user"));
        if (loggedInUser && loggedInUser.id === this.userIdToEdit) {
          const updatedLoggedInUser = {
            ...loggedInUser,
            ...response.data.user,
          }; // Use user data from response
          localStorage.setItem("user", JSON.stringify(updatedLoggedInUser));
          // Note: App.vue's currentUser won't auto-update from this. A full re-login or specific event
          // would be needed if immediate App.vue currentUser update is critical after self-edit.
          // For now, the next login will pick up the new details.
          // If role changes for self, it might be better to force re-login or redirect.
        }

        // Slight delay before navigating back to allow user to see success message
        setTimeout(() => {
          this.$emit("userUpdateSuccess", this.successMessage);
        }, 1500);
      } catch (error) {
        if (error.response && error.response.data && error.response.data.msg) {
          this.errorMessage = error.response.data.msg;
        } else {
          this.errorMessage =
            "Kļūda atjauninot lietotāja datus. Lūdzu, mēģiniet vēlāk.";
        }
        console.error("User update error:", error);
      } finally {
        // Don't immediately turn off isLoading if success message is shown before navigation
        if (this.errorMessage) {
          this.isLoading = false;
        } else if (this.successMessage) {
          // isLoading will effectively be true until navigation
        } else {
          this.isLoading = false; // fallback
        }
      }
    },
  },
};
</script>

<style scoped>
/* Styles are largely global from .form-view */
.edit-user-view h2 {
  margin-top: 0;
  font-size: 1.5em; /* Slightly smaller to fit name */
  word-break: break-word;
}
.secondary-action {
  background-color: #6c757d;
}
.secondary-action:hover:not([disabled]) {
  background-color: #5a6268;
}
.form-divider {
  margin-top: 30px;
  margin-bottom: 20px;
  border: 0;
  border-top: 1px solid #eee;
}
.edit-user-form h3 {
  font-size: 1.1em;
  color: #34495e;
  margin-bottom: 15px;
  margin-top: 0;
  padding-bottom: 5px;
  border-bottom: 1px dotted #bdc3c7;
}
</style>
