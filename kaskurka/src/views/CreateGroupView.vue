<!-- kaskurka/src/views/CreateGroupView.vue -->
<template>
  <div class="form-view create-group-view">
    <button @click="goBackToAdminDashboard" class="back-button" :disabled="isLoading">
      ← Atpakaļ uz Admin Paneli
    </button>
    <h2>Izveidot Jaunu Grupu</h2>
    <form @submit.prevent="submitCreateGroup" class="create-group-form">
      <div class="form-group">
        <label for="groupName">Grupas Nosaukums: <span class="required-field">*</span></label>
        <input type="text" id="groupName" v-model="group.name" required maxlength="50" :disabled="isLoading" />
        <small>Piemēram, DT3-1, Programmešana P1 (līdz 50 rakstzīmēm)</small>
      </div>

      <div class="form-group">
        <label for="groupDescription">Grupas Apraksts (neobligāts):</label>
        <textarea id="groupDescription" v-model="group.description" maxlength="255" :disabled="isLoading"></textarea>
        <small>Īss apraksts par grupu (līdz 255 rakstzīmēm)</small>
      </div>

      <div class="form-group">
        <label for="studyYear">Mācību Gads (neobligāts):</label>
        <input type="text" id="studyYear" v-model="group.studyYear" placeholder="GGGG/GGGG" maxlength="9" :disabled="isLoading" />
        <small>Piemēram, 2023/2024 (līdz 9 rakstzīmēm)</small>
      </div>
      
      <div v-if="successMessage" class="success-message">{{ successMessage }}</div>
      <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>

      <div class="form-actions">
        <span></span> <!-- For spacing -->
        <button type="submit" class="action-button" :disabled="isLoading">
          {{ isLoading ? "Veido..." : "Izveidot Grupu" }}
        </button>
      </div>
    </form>
  </div>
</template>

<script>
import axios from 'axios';

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
            this.errorMessage = "Grupas nosaukums nedrīkst pārsniegt 50 rakstzīmes.";
            return false;
        }
        if (this.group.description.length > 255) {
            this.errorMessage = "Grupas apraksts nedrīkst pārsniegt 255 rakstzīmes.";
            return false;
        }
        if (this.group.studyYear && !/^\d{4}\/\d{4}$/.test(this.group.studyYear) && this.group.studyYear.length > 0) {
             if (this.group.studyYear.length > 9) { // Maxlength is on input, but good to double check
                this.errorMessage = "Mācību gads nedrīkst pārsniegt 9 rakstzīmes.";
                return false;
             }
             // Basic format check, could be more robust
             // this.errorMessage = "Mācību gadam jābūt formātā GGGG/GGGG, piemēram, 2023/2024.";
             // return false;
        }
        return true;
    },
    async submitCreateGroup() {
      if (!this.validateForm()) return;

      this.isLoading = true;
      this.errorMessage = "";
      this.successMessage = "";

      try {
        const response = await axios.post('/api/groups', this.group);
        this.successMessage = response.data.msg; // "Grupa veiksmīgi izveidota!"
        // Reset form
        this.group = { name: "", description: "", studyYear: "" };
        this.$emit('groupCreated', this.successMessage); // Notify App.vue to navigate
      } catch (error) {
        if (error.response && error.response.data && error.response.data.msg) {
          this.errorMessage = error.response.data.msg;
        } else {
          this.errorMessage = "Kļūda veidojot grupu. Lūdzu, mēģiniet vēlāk.";
        }
        console.error("Group creation error:", error);
      } finally {
        this.isLoading = false;
      }
    },
  },
};
</script>

<style scoped>
/* Styles are largely global from .form-view */
.create-group-view h2 {
    margin-top: 0; /* If back button pushes title down */
}
</style>