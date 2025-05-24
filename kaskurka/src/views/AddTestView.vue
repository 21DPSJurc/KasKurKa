<!-- kaskurka/src/views/AddTestView.vue -->
<template>
  <div class="form-view add-test-view">
    <button @click="handleBackNavigation" class="back-button" :disabled="isLoading">
      ← {{ itemIdToEdit ? 'Atpakaļ uz Sarakstu' : 'Atpakaļ uz Paneli' }}
    </button>
    <h2>{{ itemIdToEdit ? 'Rediģēt Pārbaudes Darbu' : 'Pievienot Jaunu Pārbaudes Darbu' }}</h2>
    <form @submit.prevent="submitTest" class="test-form">
      <div class="form-group">
        <label for="subject">Mācību priekšmets: <span class="required-field">*</span></label>
        <input type="text" id="subject" v-model="test.subject" required :disabled="isLoading" />
      </div>

      <div class="form-group">
        <label for="eventDate">Norises datums: <span class="required-field">*</span></label>
        <input type="date" id="eventDate" v-model="test.eventDate" required :min="today" :disabled="isLoading" />
      </div>

      <div class="form-group">
        <label for="eventTime">Norises laiks:</label>
        <input type="time" id="eventTime" v-model="test.eventTime" :disabled="isLoading" />
        <small>Piemēram, 10:00</small>
      </div>

      <div class="form-group">
        <label for="topics">Pārbaudes darba tēmas:</label>
        <textarea id="topics" v-model="test.topics" placeholder="Piemēram: Funkcijas, Masīvi, Klases" :disabled="isLoading"></textarea>
      </div>
      
      <div class="form-group">
        <label for="format">Formāts:</label>
        <input type="text" id="format" v-model="test.format" placeholder="Piemēram: tests, eseja, prezentācija" :disabled="isLoading" />
      </div>

      <div class="form-group">
        <label for="additionalInfo">Cita būtiska informācija:</label>
        <textarea id="additionalInfo" v-model="test.additionalInfo" :disabled="isLoading"></textarea>
      </div>

      <div v-if="successMessage" class="success-message">{{ successMessage }}</div>
      <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>

      <div class="form-actions">
        <button v-if="itemIdToEdit" type="button" @click="cancelEdit" class="action-button secondary-action" :disabled="isLoading">Atcelt</button>
        <span></span>
        <button type="submit" class="action-button" :disabled="isLoading">
           {{ isLoading ? (itemIdToEdit ? "Saglabā..." : "Pievieno...") : (itemIdToEdit ? "Saglabāt Izmaiņas" : "Pievienot Pārbaudes Darbu") }}
        </button>
      </div>
    </form>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: "AddTestView",
  props: {
    itemIdToEdit: {
      type: String,
      default: null,
    },
  },
  data() {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');

    return {
      test: {
        subject: "",
        eventDate: `${year}-${month}-${day}`,
        eventTime: "",
        topics: "",
        format: "",
        additionalInfo: "",
      },
      today: `${year}-${month}-${day}`,
      errorMessage: "",
      successMessage: "",
      isLoading: false,
    };
  },
  watch: {
    itemIdToEdit: {
      immediate: true,
      handler(newVal) {
        if (newVal) {
          this.loadTestForEditing(newVal);
        } else {
          this.resetForm();
        }
      },
    },
  },
  methods: {
    resetForm() {
        const now = new Date();
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const day = now.getDate().toString().padStart(2, '0');
        this.test = {
            subject: "",
            eventDate: `${year}-${month}-${day}`,
            eventTime: "",
            topics: "",
            format: "",
            additionalInfo: "",
        };
        this.errorMessage = "";
        this.successMessage = "";
    },
    async loadTestForEditing(itemId) {
      this.isLoading = true;
      this.errorMessage = "";
      this.successMessage = "";
      try {
        const response = await axios.get(`/api/tests/${itemId}`);
        const data = response.data;
        this.test.subject = data.subject;
        this.test.eventDate = data.eventDate ? new Date(data.eventDate).toISOString().split('T')[0] : this.today;
        this.test.eventTime = data.eventTime || "";
        this.test.topics = data.topics || "";
        this.test.format = data.format || "";
        this.test.additionalInfo = data.additionalInfo || "";
      } catch (error) {
        console.error("Error loading test for editing:", error);
        this.errorMessage = error.response?.data?.msg || "Kļūda ielādējot pārbaudes darba datus rediģēšanai.";
        this.$emit('navigateToDashboard');
      } finally {
        this.isLoading = false;
      }
    },
    handleBackNavigation() {
      if (this.itemIdToEdit) {
        this.$emit('cancelEdit');
      } else {
        this.$emit('navigateToDashboard');
      }
    },
    cancelEdit() {
        this.$emit('cancelEdit');
    },
    validateClientSideForm() {
      // ... (validation as before) ...
      this.errorMessage = "";
      this.successMessage = "";
      if (!this.test.subject.trim()) {
        this.errorMessage = "Mācību priekšmets ir obligāts lauks.";
        return false;
      }
      if (!this.test.eventDate) {
        this.errorMessage = "Norises datums ir obligāts lauks.";
        return false;
      }
      if (this.test.eventTime && !/^\d{2}:\d{2}$/.test(this.test.eventTime) && this.test.eventTime.trim() !== '') {
        this.errorMessage = "Norādītais laiks nav korekts. Izmantojiet HH:MM formātu.";
        return false;
      }
      return true;
    },
    async submitTest() {
      if (!this.validateClientSideForm()) return;
      
      this.isLoading = true;
      this.errorMessage = "";
      this.successMessage = "";

      try {
        let response;
        if (this.itemIdToEdit) {
          response = await axios.put(`/api/tests/${this.itemIdToEdit}`, this.test);
        } else {
          response = await axios.post('/api/tests', this.test);
        }
        this.successMessage = response.data.msg || (this.itemIdToEdit ? "Pārbaudes darbs veiksmīgi atjaunināts!" : "Pārbaudes darbs veiksmīgi pievienots!");
        
        if (!this.itemIdToEdit) this.resetForm();
        
        this.$emit("itemActionSuccess", this.successMessage);

      } catch (error) {
         this.errorMessage = error.response?.data?.msg || "Darbības kļūda. Lūdzu, mēģiniet vēlāk.";
        console.error("Test submission/update error:", error);
      } finally {
        this.isLoading = false;
      }
    },
  },
};
</script>

<style scoped>
/* Styles largely global */
.secondary-action { background-color: #6c757d; }
.secondary-action:hover { background-color: #5a6268; }
</style>