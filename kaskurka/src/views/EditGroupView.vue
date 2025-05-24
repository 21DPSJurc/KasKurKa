<template>
  <div class="form-view edit-group-view">
    <button @click="cancelEdit" class="back-button" :disabled="isLoading">
      ← Atpakaļ uz Grupu Pārvaldību
    </button>
    <h2>Rediģēt Grupu</h2>
    <form
      @submit.prevent="submitUpdateGroup"
      class="edit-group-form"
      v-if="!initialLoadingError"
    >
      <div class="form-group">
        <label for="groupName"
          >Grupas Nosaukums: <span class="required-field">*</span></label
        >
        <input
          type="text"
          id="groupName"
          v-model="group.name"
          required
          maxlength="50"
          :disabled="isLoading"
        />
        <small>Piemēram, DT3-1, Programmešana P1 (līdz 50 rakstzīmēm)</small>
      </div>

      <div class="form-group">
        <label for="groupDescription">Grupas Apraksts:</label>
        <textarea
          id="groupDescription"
          v-model="group.description"
          maxlength="255"
          :disabled="isLoading"
        ></textarea>
        <small
          >Īss apraksts par grupu (līdz 255 rakstzīmēm). Atstājiet tukšu, lai
          saglabātu esošo, ja tas nav definēts.</small
        >
      </div>

      <div class="form-group">
        <label for="studyYear">Mācību Gads:</label>
        <input
          type="text"
          id="studyYear"
          v-model="group.studyYear"
          placeholder="GGGG/GGGG"
          maxlength="9"
          :disabled="isLoading"
        />
        <small
          >Piemēram, 2023/2024 (līdz 9 rakstzīmēm). Atstājiet tukšu, lai
          saglabātu esošo, ja tas nav definēts.</small
        >
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
    <div v-if="initialLoadingError" class="error-message">
      {{ initialLoadingError }}
    </div>
  </div>
</template>

<script>
import axios from "axios";

export default {
  name: "EditGroupView",
  props: {
    groupIdToEdit: {
      type: String,
      required: true,
    },
  },
  data() {
    return {
      group: {
        name: "",
        description: "",
        studyYear: "",
        // Store original name to check if it changed for unique validation
        originalName: "",
      },
      isLoading: false,
      initialLoadingError: "", // For errors during initial data fetch
      errorMessage: "", // For errors during form submission
      successMessage: "",
    };
  },
  watch: {
    groupIdToEdit: {
      immediate: true, // Run on component creation if prop is already set
      handler(newVal) {
        if (newVal) {
          this.fetchGroupDetails(newVal);
        } else {
          // This case should ideally not happen if routing is correct
          this.initialLoadingError = "Grupas ID nav norādīts rediģēšanai.";
        }
      },
    },
  },
  methods: {
    async fetchGroupDetails(groupId) {
      this.isLoading = true;
      this.initialLoadingError = "";
      this.errorMessage = "";
      this.successMessage = "";
      try {
        const response = await axios.get(`/api/groups/details/${groupId}`);
        this.group.name = response.data.name;
        this.group.originalName = response.data.name; // Store original for validation
        this.group.description = response.data.description || ""; // Ensure it's a string
        this.group.studyYear = response.data.studyYear || ""; // Ensure it's a string
      } catch (error) {
        console.error("Error fetching group details:", error);
        this.initialLoadingError =
          error.response?.data?.msg ||
          "Kļūda ielādējot grupas datus rediģēšanai.";
        // Optionally emit an event to navigate away if group not found
        if (error.response?.status === 404) {
          setTimeout(() => this.$emit("cancelEditGroup"), 3000); // Go back if group not found
        }
      } finally {
        this.isLoading = false;
      }
    },
    cancelEdit() {
      this.$emit("cancelEditGroup"); // Signal to App.vue to navigate back
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
      if (this.group.description && this.group.description.length > 255) {
        this.errorMessage =
          "Grupas apraksts nedrīkst pārsniegt 255 rakstzīmes.";
        return false;
      }
      // For studyYear, backend handles if it's empty as "keep old".
      // Here we only check length if a value is provided.
      if (this.group.studyYear && this.group.studyYear.length > 9) {
        this.errorMessage = "Mācību gads nedrīkst pārsniegt 9 rakstzīmes.";
        return false;
      }
      // Optional: More robust validation for GGGG/GGGG format if studyYear is not empty
      // if (this.group.studyYear && !/^\d{4}\/\d{4}$/.test(this.group.studyYear)) {
      //   this.errorMessage = "Mācību gadam jābūt formātā GGGG/GGGG vai tukšam.";
      //   return false;
      // }
      return true;
    },
    async submitUpdateGroup() {
      if (!this.validateForm()) return;

      this.isLoading = true;
      this.errorMessage = "";
      this.successMessage = "";

      // Data to send for update. Backend will handle empty strings for description/studyYear appropriately (keep old or set to empty).
      const updateData = {
        name: this.group.name.trim(),
        description: this.group.description.trim(),
        studyYear: this.group.studyYear.trim(),
      };

      try {
        const response = await axios.put(
          `/api/groups/${this.groupIdToEdit}`,
          updateData
        );
        this.successMessage = response.data.msg;
        this.$emit("groupUpdateSuccess", this.successMessage); // Notify App.vue
      } catch (error) {
        if (error.response && error.response.data && error.response.data.msg) {
          this.errorMessage = error.response.data.msg;
        } else {
          this.errorMessage = "Kļūda atjauninot grupu. Lūdzu, mēģiniet vēlāk.";
        }
        console.error("Group update error:", error);
      } finally {
        this.isLoading = false;
      }
    },
  },
};
</script>

<style scoped>
/* Styles are largely global from .form-view */
.edit-group-view h2 {
  margin-top: 0; /* If back button pushes title down */
}
.secondary-action {
  background-color: #6c757d; /* Grey for cancel */
}
.secondary-action:hover:not([disabled]) {
  background-color: #5a6268;
}
</style>
