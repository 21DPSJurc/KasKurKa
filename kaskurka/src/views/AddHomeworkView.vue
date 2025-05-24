<!-- kaskurka/src/views/AddHomeworkView.vue -->
<template>
  <div class="form-view add-homework-view">
     <button @click="handleBackNavigation" class="back-button" :disabled="isLoading">
      ← {{ itemIdToEdit ? 'Atpakaļ uz Sarakstu' : 'Atpakaļ uz Paneli' }}
    </button>
    <h2>{{ itemIdToEdit ? 'Rediģēt Mājasdarbu' : 'Pievienot Jaunu Mājasdarbu' }}</h2>
    <form @submit.prevent="submitHomework" class="homework-form">
      <div class="form-group">
        <label for="subject">Mācību priekšmets: <span class="required-field">*</span></label>
        <input type="text" id="subject" v-model="homework.subject" required :disabled="isLoading" />
      </div>

      <div class="form-group">
        <label for="description">Detalizēts uzdevuma apraksts: <span class="required-field">*</span></label>
        <textarea id="description" v-model="homework.description" required :disabled="isLoading"></textarea>
      </div>

      <div class="form-group">
        <label for="dueDate">Izpildes termiņš: <span class="required-field">*</span></label>
        <input type="date" id="dueDate" v-model="homework.dueDate" required :min="today" :disabled="isLoading" />
      </div>

      <div class="form-group">
        <label for="additionalInfo">Papildus informācija (norādīts mutiski, u.c.):</label>
        <textarea id="additionalInfo" v-model="homework.additionalInfo" :disabled="isLoading"></textarea>
      </div>

      <div class="form-group">
        <label for="links">Saites uz nepieciešamajiem resursiem:</label>
        <textarea id="links" v-model="homework.links" placeholder="Katra saite jaunā rindā" :disabled="isLoading"></textarea>
        <small>Piemēram: https://example.com/resource1</small>
      </div>

      <div class="form-group">
        <label for="files">Faili (līdz 5 failiem, katrs līdz 5MB):</label>
        <input type="file" id="files" @change="handleFileUpload" multiple :disabled="isLoading" accept=".pdf,.doc,.docx,.zip,image/*,.txt,.ppt,.pptx,.xls,.xlsx"/>
        <small v-if="!itemIdToEdit">Pievienojiet jaunus failus.</small>
        <small v-if="itemIdToEdit">Pievienojot jaunus failus, tie aizstās esošos. Lai dzēstu visus failus, atzīmējiet zemāk.</small>
         
         <div v-if="itemIdToEdit && homework.existingFileAttachments && homework.existingFileAttachments.length > 0 && !newFilesSelected" class="existing-files-info">
            <strong>Esošie faili:</strong>
            <ul>
                <li v-for="(file, index) in homework.existingFileAttachments" :key="index">
                    {{ file.originalName }} ({{ (file.size / 1024).toFixed(2) }} KB)
                </li>
            </ul>
            <label><input type="checkbox" v-model="clearExistingFiles" :disabled="isLoading"> Dzēst visus esošos failus (ja nepievienojat jaunus)</label>
         </div>

         <ul v-if="homework.selectedFileObjects.length > 0" class="file-list">
            <li v-for="(file, index) in homework.selectedFileObjects" :key="index">
                {{ file.name }} ({{ (file.size / 1024).toFixed(2) }} KB)
            </li>
        </ul>
      </div>

      <div v-if="successMessage" class="success-message">{{ successMessage }}</div>
      <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>

      <div class="form-actions">
         <button v-if="itemIdToEdit" type="button" @click="cancelEdit" class="action-button secondary-action" :disabled="isLoading">Atcelt</button>
         <span></span>
        <button type="submit" class="action-button" :disabled="isLoading">
          {{ isLoading ? (itemIdToEdit ? "Saglabā..." : "Pievieno...") : (itemIdToEdit ? "Saglabāt Izmaiņas" : "Pievienot Mājasdarbu") }}
        </button>
      </div>
    </form>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: "AddHomeworkView",
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
      homework: {
        subject: "",
        description: "",
        dueDate: `${year}-${month}-${day}`,
        additionalInfo: "",
        links: "",
        selectedFileObjects: [], 
        existingFileAttachments: [], // To show current files when editing
      },
      today: `${year}-${month}-${day}`,
      errorMessage: "",
      successMessage: "",
      isLoading: false,
      newFilesSelected: false, // Flag to track if new files are chosen in edit mode
      clearExistingFiles: false, // Flag to clear files in edit mode without uploading new ones
    };
  },
  watch: {
    itemIdToEdit: {
      immediate: true, // Run on component creation if prop is already set
      handler(newVal) {
        if (newVal) {
          this.loadHomeworkForEditing(newVal);
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
        this.homework = {
            subject: "",
            description: "",
            dueDate: `${year}-${month}-${day}`,
            additionalInfo: "",
            links: "",
            selectedFileObjects: [],
            existingFileAttachments: [],
        };
        this.newFilesSelected = false;
        this.clearExistingFiles = false;
        this.errorMessage = "";
        this.successMessage = "";
        const fileInput = document.getElementById('files');
        if (fileInput) fileInput.value = null;
    },
    async loadHomeworkForEditing(itemId) {
      this.isLoading = true;
      this.errorMessage = "";
      this.successMessage = "";
      try {
        const response = await axios.get(`/api/homework/${itemId}`);
        const data = response.data;
        this.homework.subject = data.subject;
        this.homework.description = data.description;
        this.homework.dueDate = data.dueDate ? new Date(data.dueDate).toISOString().split('T')[0] : this.today;
        this.homework.additionalInfo = data.additionalInfo || "";
        this.homework.links = data.links ? data.links.join('\n') : "";
        this.homework.existingFileAttachments = data.fileAttachments || [];
        this.homework.selectedFileObjects = []; // Clear any previously selected files for new upload
        this.newFilesSelected = false;
        this.clearExistingFiles = false;
      } catch (error) {
        console.error("Error loading homework for editing:", error);
        this.errorMessage = error.response?.data?.msg || "Kļūda ielādējot mājasdarba datus rediģēšanai.";
        this.$emit('navigateToDashboard'); // Or navigate to list if error
      } finally {
        this.isLoading = false;
      }
    },
    handleBackNavigation() {
      if (this.itemIdToEdit) {
        this.$emit('cancelEdit'); // Signal to App.vue to go back to list or dashboard
      } else {
        this.$emit('navigateToDashboard');
      }
    },
    cancelEdit() {
        this.$emit('cancelEdit'); // Emits to App.vue
    },
    handleFileUpload(event) {
      this.homework.selectedFileObjects = Array.from(event.target.files);
      this.newFilesSelected = this.homework.selectedFileObjects.length > 0;
      this.errorMessage = ""; 
      this.successMessage = "";
      
      const MAX_TOTAL_FILES = 5;
      if (this.homework.selectedFileObjects.length > MAX_TOTAL_FILES) {
          this.errorMessage = `Jūs varat pievienot ne vairāk kā ${MAX_TOTAL_FILES} failus.`;
          this.homework.selectedFileObjects = []; 
          event.target.value = null; 
          this.newFilesSelected = false;
          return;
      }
      for (const file of this.homework.selectedFileObjects) {
        if (file.size > 5 * 1024 * 1024) { 
          this.errorMessage = `Fails "${file.name}" ir pārāk liels (Maks. 5MB).`;
          this.homework.selectedFileObjects = this.homework.selectedFileObjects.filter(f => f.name !== file.name);
          if(this.homework.selectedFileObjects.length === 0) {
            event.target.value = null;
            this.newFilesSelected = false;
          }
          return; 
        }
      }
    },
    validateClientSideForm() {
      // ... (validation as before) ...
      this.errorMessage = "";
      this.successMessage = "";
      if (!this.homework.subject.trim()) {
        this.errorMessage = "Mācību priekšmets ir obligāts lauks.";
        return false;
      }
      if (!this.homework.description.trim()) {
        this.errorMessage = "Uzdevuma apraksts ir obligāts lauks.";
        return false;
      }
      if (!this.homework.dueDate) {
        this.errorMessage = "Izpildes termiņš ir obligāts lauks.";
        return false;
      }
       if (this.homework.links.trim()) {
        const linksArray = this.homework.links.split('\n').filter(link => link.trim() !== '');
        for (const link of linksArray) {
          if (!link.startsWith('http://') && !link.startsWith('https://')) {
            this.errorMessage = `Saite "${link.substring(0,30)}..." nav korekta. Tai jāsākas ar http:// vai https://`;
            return false;
          }
        }
      }
      return true;
    },
    async submitHomework() {
      if (!this.validateClientSideForm()) return;
      
      this.isLoading = true;
      this.errorMessage = "";
      this.successMessage = "";

      const formData = new FormData();
      formData.append('subject', this.homework.subject);
      formData.append('description', this.homework.description);
      formData.append('dueDate', this.homework.dueDate);
      formData.append('additionalInfo', this.homework.additionalInfo);
      formData.append('links', this.homework.links);

      if (this.newFilesSelected) { // If new files are selected, upload them
          for (const file of this.homework.selectedFileObjects) {
            formData.append('files', file);
          }
      } else if (this.itemIdToEdit && this.clearExistingFiles) {
          formData.append('clearFiles', 'true'); // Signal backend to clear files
      }
      // If not newFilesSelected and not clearExistingFiles, backend won't touch files for PUT

      try {
        let response;
        if (this.itemIdToEdit) {
          response = await axios.put(`/api/homework/${this.itemIdToEdit}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        } else {
          response = await axios.post('/api/homework', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        }
        this.successMessage = response.data.msg || (this.itemIdToEdit ? "Mājasdarbs veiksmīgi atjaunināts!" : "Mājasdarbs veiksmīgi pievienots!");
        
        if (!this.itemIdToEdit) this.resetForm(); // Reset only if adding new
        
        this.$emit("itemActionSuccess", this.successMessage);

      } catch (error) {
        this.errorMessage = error.response?.data?.msg || "Darbības kļūda. Lūdzu, mēģiniet vēlāk.";
        console.error("Homework submission/update error:", error);
      } finally {
        this.isLoading = false;
      }
    },
  },
};
</script>

<style scoped>
/* Styles largely global. Specifics can go here if needed. */
.file-list { list-style-type: none; padding-left: 0; margin-top: 10px; }
.file-list li { background-color: #f9f9f9; border: 1px solid #eee; padding: 5px 10px; border-radius: 4px; margin-bottom: 5px; font-size: 0.9em; color: #555; }
.existing-files-info { margin-top: 10px; padding: 10px; background-color: #e9ecef; border-radius: 4px; font-size: 0.9em; }
.existing-files-info ul { margin-top: 5px; margin-bottom: 10px; padding-left: 20px; }
.existing-files-info label { font-weight: normal; display: flex; align-items: center; }
.existing-files-info input[type="checkbox"] { margin-right: 5px; }
.secondary-action { background-color: #6c757d; } /* Grey for cancel */
.secondary-action:hover { background-color: #5a6268; }
</style>