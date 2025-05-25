<template>
  <div class="form-view create-group-view card-style">
    <button
      @click="goBackToAdminDashboard"
      class="back-button"
      :disabled="isLoading"
    >
      <i class="fas fa-arrow-left"></i> Atpakaļ uz Admin Paneli
    </button>
    <h2 class="view-title">
      <i class="fas fa-users-cog"></i> Izveidot Jaunu Grupu
    </h2>
    <form @submit.prevent="submitCreateGroup" class="create-group-form">
      <div class="form-group">
        <label for="groupName"
          ><i class="fas fa-tag form-icon"></i> Grupas Nosaukums:
          <span class="required-field">*</span></label
        >
        <input
          type="text"
          id="groupName"
          v-model="group.name"
          required
          maxlength="50"
          placeholder="Piem., DT3-1 vai RTU Datorzinātne"
          :disabled="isLoading"
        />
        <small>Unikāls nosaukums, līdz 50 rakstzīmēm.</small>
      </div>

      <div class="form-group">
        <label for="groupDescription"
          ><i class="fas fa-info-circle form-icon"></i> Grupas Apraksts
          (neobligāts):</label
        >
        <textarea
          id="groupDescription"
          v-model="group.description"
          maxlength="255"
          rows="3"
          placeholder="Īss apraksts par grupas mērķi vai saturu..."
          :disabled="isLoading"
        ></textarea>
        <small>Līdz 255 rakstzīmēm.</small>
      </div>

      <div class="form-group">
        <label for="studyYear"
          ><i class="fas fa-calendar-alt form-icon"></i> Mācību Gads
          (neobligāts):</label
        >
        <input
          type="text"
          id="studyYear"
          v-model="group.studyYear"
          placeholder="Piem., 2023/2024"
          maxlength="9"
          :disabled="isLoading"
        />
        <small>Formāts GGGG/GGGG, līdz 9 rakstzīmēm.</small>
      </div>

      <div v-if="successMessage" class="success-message">
        <i class="fas fa-check-circle"></i> {{ successMessage }}
      </div>
      <div v-if="errorMessage" class="error-message">
        <i class="fas fa-exclamation-triangle"></i> {{ errorMessage }}
      </div>

      <div class="form-actions">
        <button
          type="button"
          @click="goBackToAdminDashboard"
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
          <i class="fas fa-plus-circle"></i>
          {{ isLoading ? "Veido..." : "Izveidot Grupu" }}
        </button>
      </div>
    </form>
  </div>
</template>

<script>
import axios from "axios";

export default {
  name: "CreateGroupView",
  data() {
    return {
      group: {
        name: "",
        description: "",
        studyYear: "",
      },
      isLoading: false,
      errorMessage: "",
      successMessage: "",
    };
  },
  methods: {
    goBackToAdminDashboard() {
      this.$emit("navigateToAdminDashboard");
    },
    validateForm() {
      this.errorMessage = "";
      this.successMessage = "";
      if (!this.group.name.trim()) {
        this.errorMessage = "Grupas nosaukums ir obligāts lauks.";
        return false;
      }
      if (this.group.name.length > 50) {
        this.errorMessage =
          "Grupas nosaukums nedrīkst pārsniegt 50 rakstzīmes.";
        return false;
      }
      if (this.group.description.length > 255) {
        this.errorMessage =
          "Grupas apraksts nedrīkst pārsniegt 255 rakstzīmes.";
        return false;
      }
      if (
        this.group.studyYear &&
        !/^\d{4}\/\d{4}$/.test(this.group.studyYear) &&
        this.group.studyYear.length > 0
      ) {
        if (this.group.studyYear.length > 9) {
          this.errorMessage = "Mācību gads nedrīkst pārsniegt 9 rakstzīmes.";
          return false;
        }
        // Uncomment if strict format validation is desired for study year
        /*
         this.errorMessage =
           "Mācību gadam jābūt formātā GGGG/GGGG, piemēram, 2023/2024, vai jābūt tukšam.";
         return false;
         */
      }
      return true;
    },
    async submitCreateGroup() {
      if (!this.validateForm()) return;

      this.isLoading = true;
      this.errorMessage = "";
      this.successMessage = "";

      try {
        const response = await axios.post("/api/groups", this.group);
        this.successMessage = response.data.msg;
        this.group = { name: "", description: "", studyYear: "" }; // Reset form

        // Keep success message for a bit before navigating via App.vue
        setTimeout(() => {
          this.$emit("groupCreated", this.successMessage);
        }, 1500);
      } catch (error) {
        if (error.response && error.response.data && error.response.data.msg) {
          this.errorMessage = error.response.data.msg;
        } else {
          this.errorMessage = "Kļūda veidojot grupu. Lūdzu, mēģiniet vēlāk.";
        }
        console.error("Group creation error:", error);
      } finally {
        // Don't reset isLoading immediately if success message is shown,
        // as navigation will occur. Only reset on error.
        if (this.errorMessage) {
          this.isLoading = false;
        }
      }
    },
  },
};
</script>

<style scoped>
/* .create-group-view inherits .form-view and .card-style from global */

.view-title {
  /* Re-using for consistency */
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
.success-message .fas,
.error-message .fas {
  margin-right: 0.5em;
}

.form-actions {
  justify-content: space-between; /* Push cancel to left, submit to right */
}

@media (max-width: 600px) {
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
