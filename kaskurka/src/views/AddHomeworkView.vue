<template>
  <div class="form-view add-homework-view card-style">
    <button
      @click="handleBackNavigation"
      class="back-button"
      :disabled="isLoading || isLoadingInitialData"
    >
      <i class="fas fa-arrow-left"></i>
      {{ itemIdToEdit ? "Atpakaļ uz Sarakstu" : "Atpakaļ uz Paneli" }}
    </button>
    <h2 class="view-title">
      <i :class="itemIdToEdit ? 'fas fa-edit' : 'fas fa-plus-circle'"></i>
      {{ itemIdToEdit ? "Rediģēt Mājasdarbu" : "Pievienot Jaunu Mājasdarbu" }}
    </h2>

    <div v-if="isLoadingInitialData" class="loading-indicator">
      <i class="fas fa-spinner fa-spin"></i> Notiek datu ielāde...
    </div>
    <div v-else-if="!canAddOrEditLogic" class="error-message">
      <i class="fas fa-exclamation-triangle"></i> {{ addEditNotAllowedMessage }}
    </div>

    <form
      @submit.prevent="submitHomework"
      class="homework-form"
      v-if="canAddOrEditLogic && !isLoadingInitialData"
    >
      <div class="form-group">
        <label for="customGroupId"
          ><i class="fas fa-users form-icon"></i> Grupa (kam redzams
          mājasdarbs): <span class="required-field">*</span></label
        >
        <select
          id="customGroupId"
          v-model="homework.customGroupId"
          required
          :disabled="isLoading || availableCustomGroups.length === 0"
        >
          <option disabled value="">Izvēlieties grupu</option>
          <option
            v-for="group in availableCustomGroups"
            :key="group._id"
            :value="group._id"
          >
            {{ group.name }}
          </option>
        </select>
        <small
          v-if="
            currentUser &&
            currentUser.role === 'student' &&
            availableCustomGroups.length === 0
          "
          class="info-text"
          ><i class="fas fa-info-circle"></i> Jums jābūt vismaz vienas grupas
          dalībniekam.</small
        >
        <small
          v-if="
            currentUser &&
            currentUser.role === 'admin' &&
            availableCustomGroups.length === 0
          "
          class="info-text"
          ><i class="fas fa-info-circle"></i> Nav pieejamu grupu sistēmā. Lūdzu,
          izveidojiet grupu.</small
        >
      </div>

      <div class="form-group">
        <label for="subject"
          ><i class="fas fa-book form-icon"></i> Mācību priekšmets:
          <span class="required-field">*</span></label
        >
        <input
          type="text"
          id="subject"
          v-model="homework.subject"
          required
          maxlength="50"
          placeholder="Piem., Programmēšanas pamati"
          :disabled="isLoading"
        />
        <small>Līdz 50 rakstzīmēm.</small>
      </div>

      <div class="form-group">
        <label for="description"
          ><i class="fas fa-file-alt form-icon"></i> Detalizēts uzdevuma
          apraksts: <span class="required-field">*</span></label
        >
        <textarea
          id="description"
          v-model="homework.description"
          required
          maxlength="1000"
          rows="4"
          placeholder="Aprakstiet uzdevumu šeit..."
          :disabled="isLoading"
        ></textarea>
        <small>Līdz 1000 rakstzīmēm.</small>
      </div>

      <div class="form-group">
        <label for="dueDate"
          ><i class="fas fa-calendar-check form-icon"></i> Izpildes termiņš:
          <span class="required-field">*</span></label
        >
        <input
          type="date"
          id="dueDate"
          v-model="homework.dueDate"
          required
          :min="today"
          :disabled="isLoading"
        />
      </div>

      <hr class="form-divider" />
      <h3 class="form-section-title">
        <i class="fas fa-paperclip"></i> Papildus Informācija un Resursi
      </h3>

      <div class="form-group">
        <label for="additionalInfo"
          ><i class="fas fa-info-circle form-icon"></i> Papildus informācija
          (mutiski norādīts, u.c.):</label
        >
        <textarea
          id="additionalInfo"
          v-model="homework.additionalInfo"
          rows="3"
          placeholder="Jebkādas papildu piezīmes vai norādes..."
          :disabled="isLoading"
        ></textarea>
      </div>

      <div class="form-group">
        <label for="links"
          ><i class="fas fa-link form-icon"></i> Saites uz resursiem:</label
        >
        <textarea
          id="links"
          v-model="homework.links"
          rows="3"
          placeholder="Katra saite jaunā rindā, piem., https://example.com"
          :disabled="isLoading"
        ></textarea>
      </div>

      <div class="form-group">
        <label for="files"
          ><i class="fas fa-folder-open form-icon"></i> Pievienot Failus (līdz 5
          failiem, katrs līdz 5MB):</label
        >
        <input
          type="file"
          id="files"
          @change="handleFileUpload"
          multiple
          :disabled="isLoading"
          accept=".pdf,.doc,.docx,.zip,image/*,.txt,.ppt,.pptx,.xls,.xlsx,.rar"
          class="file-input-styled"
        />
        <small v-if="itemIdToEdit" class="info-text"
          ><i class="fas fa-info-circle"></i> Pievienojot jaunus failus, tie
          aizstās esošos.</small
        >

        <div
          v-if="
            itemIdToEdit &&
            homework.existingFileAttachments &&
            homework.existingFileAttachments.length > 0 &&
            !newFilesSelected
          "
          class="existing-files-display"
        >
          <strong><i class="fas fa-archive"></i> Esošie faili:</strong>
          <ul class="file-list">
            <li
              v-for="(file, index) in homework.existingFileAttachments"
              :key="index"
              class="file-list-item existing"
            >
              <i class="fas fa-file"></i> {{ file.originalName }}
              <span class="file-size"
                >({{ (file.size / 1024).toFixed(2) }} KB)</span
              >
            </li>
          </ul>
          <label class="clear-files-label"
            ><input
              type="checkbox"
              v-model="clearExistingFiles"
              :disabled="isLoading"
            />
            Dzēst visus esošos failus</label
          >
        </div>

        <div
          v-if="homework.selectedFileObjects.length > 0"
          class="selected-files-display"
        >
          <strong
            ><i class="fas fa-folder-plus"></i> Atlasītie jaunie faili:</strong
          >
          <ul class="file-list">
            <li
              v-for="(file, index) in homework.selectedFileObjects"
              :key="index"
              class="file-list-item new"
            >
              <i class="fas fa-file-medical"></i> {{ file.name }}
              <span class="file-size"
                >({{ (file.size / 1024).toFixed(2) }} KB)</span
              >
            </li>
          </ul>
        </div>
      </div>

      <div v-if="successMessage" class="success-message">
        <i class="fas fa-check-circle"></i> {{ successMessage }}
      </div>
      <div v-if="errorMessage" class="error-message">
        <i class="fas fa-exclamation-triangle"></i> {{ errorMessage }}
      </div>

      <div class="form-actions">
        <button
          v-if="itemIdToEdit"
          type="button"
          @click="cancelEdit"
          class="action-button secondary-button"
          :disabled="isLoading"
        >
          <i class="fas fa-times"></i> Atcelt
        </button>
        <span v-else></span>
        <!-- Spacer for alignment -->
        <button
          type="submit"
          class="action-button primary-button"
          :disabled="isLoading || !canAddOrEditLogic"
        >
          <i :class="itemIdToEdit ? 'fas fa-save' : 'fas fa-plus-circle'"></i>
          {{
            isLoading
              ? itemIdToEdit
                ? "Saglabā..."
                : "Pievieno..."
              : itemIdToEdit
              ? "Saglabāt Izmaiņas"
              : "Pievienot Mājasdarbu"
          }}
        </button>
      </div>
    </form>
  </div>
</template>

<script>
// Script section remains largely the same as provided in the previous step
// Only minor adjustments for consistency if needed
import axios from "axios";

export default {
  name: "AddHomeworkView",
  props: {
    itemIdToEdit: {
      type: String,
      default: null,
    },
    currentUser: {
      type: Object,
      required: true,
    },
  },
  inject: ["refreshUser"],
  data() {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const day = now.getDate().toString().padStart(2, "0");

    return {
      homework: {
        subject: "",
        description: "",
        dueDate: `${year}-${month}-${day}`,
        additionalInfo: "",
        links: "",
        selectedFileObjects: [],
        existingFileAttachments: [],
        customGroupId: "",
      },
      today: `${year}-${month}-${day}`,
      errorMessage: "",
      successMessage: "",
      isLoading: false,
      isLoadingInitialData: false,
      newFilesSelected: false,
      clearExistingFiles: false,
      allSystemGroups: [],
    };
  },
  computed: {
    availableCustomGroups() {
      if (!this.currentUser) return [];
      if (this.currentUser.role === "admin") {
        return this.allSystemGroups;
      }
      return this.currentUser.enrolledCustomGroupsDetails || [];
    },
    canAddOrEditLogic() {
      if (!this.currentUser) return false;
      if (this.itemIdToEdit) return true;

      if (this.currentUser.role === "admin") {
        return this.allSystemGroups.length > 0;
      }
      if (this.currentUser.role === "student") {
        return (
          this.currentUser.enrolledCustomGroupsDetails &&
          this.currentUser.enrolledCustomGroupsDetails.length > 0
        );
      }
      return false;
    },
    addEditNotAllowedMessage() {
      if (this.itemIdToEdit) return "";
      if (
        this.currentUser &&
        this.currentUser.role === "admin" &&
        this.allSystemGroups.length === 0 &&
        !this.isLoadingInitialData
      ) {
        return "Lai pievienotu mājasdarbu, vispirms sistēmā ir jāizveido vismaz viena grupa.";
      }
      if (
        this.currentUser &&
        this.currentUser.role === "student" &&
        (!this.currentUser.enrolledCustomGroupsDetails ||
          this.currentUser.enrolledCustomGroupsDetails.length === 0) &&
        !this.isLoadingInitialData
      ) {
        return "Lai pievienotu mājasdarbu, Jums ir jābūt dalībniekam vismaz vienā grupā. Ja nesen tikāt pievienots, mēģiniet pārlādēt lapu vai doties atpakaļ uz paneli un atgriezties šeit.";
      }
      if (!this.isLoadingInitialData)
        return "Jums nav tiesību pievienot jaunus mājasdarbus.";
      return "Notiek datu ielāde...";
    },
  },
  watch: {
    itemIdToEdit(newVal, oldVal) {
      if (newVal !== oldVal && !this.isLoadingInitialData) {
        this.handleIdOrUserChange();
      }
    },
  },
  async mounted() {
    await this.performInitialSetup();
  },
  methods: {
    async performInitialSetup() {
      this.isLoadingInitialData = true;
      this.errorMessage = "";
      try {
        if (this.refreshUser) {
          await this.refreshUser();
        }
        await this.handleIdOrUserChange();
      } catch (error) {
        console.error("Error during initial setup of AddHomeworkView:", error);
        this.errorMessage =
          "Kļūda ielādējot nepieciešamos datus. " + (error.message || "");
      } finally {
        this.isLoadingInitialData = false;
      }
    },
    async handleIdOrUserChange() {
      if (this.currentUser && this.currentUser.role === "admin") {
        await this.fetchAllSystemGroups();
      }

      if (this.itemIdToEdit) {
        await this.loadHomeworkForEditing(this.itemIdToEdit);
      } else {
        this.resetForm();
      }
    },
    async fetchAllSystemGroups() {
      if (this.currentUser && this.currentUser.role === "admin") {
        if (this.allSystemGroups.length > 0 && !this.itemIdToEdit) {
          /* simple cache */
        }

        try {
          const response = await axios.get("/api/groups");
          this.allSystemGroups = response.data;
        } catch (error) {
          console.error("Error fetching all groups for admin:", error);
          this.errorMessage = "Kļūda ielādējot grupu sarakstu administratoram.";
        }
      }
    },
    resetForm() {
      const now = new Date();
      const year = now.getFullYear();
      const month = (now.getMonth() + 1).toString().padStart(2, "0");
      const day = now.getDate().toString().padStart(2, "0");
      this.homework = {
        subject: "",
        description: "",
        dueDate: `${year}-${month}-${day}`,
        additionalInfo: "",
        links: "",
        selectedFileObjects: [],
        existingFileAttachments: [],
        customGroupId:
          this.availableCustomGroups.length === 1
            ? this.availableCustomGroups[0]._id
            : "",
      };
      this.newFilesSelected = false;
      this.clearExistingFiles = false;
      this.successMessage = "";
      const fileInput = document.getElementById("files");
      if (fileInput) fileInput.value = null;
    },
    async loadHomeworkForEditing(itemId) {
      this.isLoading = true;
      this.successMessage = "";
      try {
        const response = await axios.get(`/api/homework/${itemId}`);
        const data = response.data;
        this.homework.subject = data.subject;
        this.homework.description = data.description;
        this.homework.dueDate = data.dueDate
          ? new Date(data.dueDate).toISOString().split("T")[0]
          : this.today;
        this.homework.additionalInfo = data.additionalInfo || "";
        this.homework.links = data.links ? data.links.join("\n") : "";
        this.homework.existingFileAttachments = data.fileAttachments || [];
        this.homework.customGroupId = data.customGroupId
          ? data.customGroupId.toString()
          : "";
        this.homework.selectedFileObjects = [];
        this.newFilesSelected = false;
        this.clearExistingFiles = false;
      } catch (error) {
        console.error("Error loading homework for editing:", error);
        this.errorMessage =
          error.response?.data?.msg ||
          "Kļūda ielādējot mājasdarba datus rediģēšanai. " +
            (this.errorMessage || "");
        if (error.response?.status === 403 || error.response?.status === 404) {
          setTimeout(() => this.$emit("navigateToDashboard"), 2000);
        }
      } finally {
        this.isLoading = false;
      }
    },
    handleBackNavigation() {
      if (this.itemIdToEdit) {
        this.$emit("cancelEdit");
      } else {
        this.$emit("navigateToDashboard");
      }
    },
    cancelEdit() {
      this.$emit("cancelEdit");
    },
    handleFileUpload(event) {
      this.homework.selectedFileObjects = Array.from(event.target.files);
      this.newFilesSelected = this.homework.selectedFileObjects.length > 0;
      // Keep existing general error message, but clear file-specific ones.
      if (
        this.errorMessage &&
        (this.errorMessage.startsWith("Jūs varat") ||
          this.errorMessage.startsWith("Fails"))
      ) {
        this.errorMessage = "";
      }
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
          this.homework.selectedFileObjects =
            this.homework.selectedFileObjects.filter(
              (f) => f.name !== file.name
            );
          if (this.homework.selectedFileObjects.length === 0) {
            event.target.value = null;
            this.newFilesSelected = false;
          }
          return;
        }
      }
    },
    validateClientSideForm() {
      if (
        (this.errorMessage && this.errorMessage.startsWith("Lūdzu")) ||
        this.errorMessage.startsWith("Saite")
      ) {
        this.errorMessage = "";
      }
      this.successMessage = "";

      if (!this.homework.customGroupId) {
        this.errorMessage =
          "Lūdzu, izvēlieties grupu, kurai pievienot mājasdarbu.";
        return false;
      }
      if (!this.homework.subject.trim()) {
        this.errorMessage = "Mācību priekšmets ir obligāts lauks.";
        return false;
      }
      if (this.homework.subject.trim().length > 50) {
        this.errorMessage =
          "Mācību priekšmeta nosaukums nedrīkst pārsniegt 50 rakstzīmes.";
        return false;
      }
      if (!this.homework.description.trim()) {
        this.errorMessage = "Uzdevuma apraksts ir obligāts lauks.";
        return false;
      }
      if (this.homework.description.trim().length > 1000) {
        this.errorMessage =
          "Uzdevuma apraksts nedrīkst pārsniegt 1000 rakstzīmes.";
        return false;
      }
      if (!this.homework.dueDate) {
        this.errorMessage = "Izpildes termiņš ir obligāts lauks.";
        return false;
      }
      if (this.homework.links.trim()) {
        const linksArray = this.homework.links
          .split("\n")
          .map((link) => link.trim())
          .filter((link) => link.trim() !== "");
        for (const link of linksArray) {
          if (!link.startsWith("http://") && !link.startsWith("https://")) {
            this.errorMessage = `Saite "${link.substring(
              0,
              30
            )}..." nav korekta. Tai jāsākas ar http:// vai https://`;
            return false;
          }
        }
      }
      return true;
    },
    async submitHomework() {
      if (!this.validateClientSideForm()) return;

      this.isLoading = true;
      if (
        this.errorMessage &&
        (this.errorMessage.startsWith("Lūdzu") ||
          this.errorMessage.startsWith("Saite") ||
          this.errorMessage.startsWith("Jūs varat") ||
          this.errorMessage.startsWith("Fails") ||
          this.errorMessage.includes("rakstzīmes"))
      ) {
        this.errorMessage = "";
      }
      this.successMessage = "";

      const formData = new FormData();
      formData.append("customGroupId", this.homework.customGroupId);
      formData.append("subject", this.homework.subject);
      formData.append("description", this.homework.description);
      formData.append("dueDate", this.homework.dueDate);
      formData.append("additionalInfo", this.homework.additionalInfo);
      formData.append("links", this.homework.links);

      if (this.newFilesSelected) {
        for (const file of this.homework.selectedFileObjects) {
          formData.append("files", file);
        }
      } else if (this.itemIdToEdit && this.clearExistingFiles) {
        formData.append("clearFiles", "true");
      }

      try {
        let response;
        if (this.itemIdToEdit) {
          response = await axios.put(
            `/api/homework/${this.itemIdToEdit}`,
            formData,
            {
              headers: { "Content-Type": "multipart/form-data" },
            }
          );
        } else {
          response = await axios.post("/api/homework", formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        }
        this.successMessage =
          response.data.msg ||
          (this.itemIdToEdit
            ? "Mājasdarbs veiksmīgi atjaunināts!"
            : "Mājasdarbs veiksmīgi pievienots!");

        const previousCustomGroupId = this.homework.customGroupId; // Save before reset
        if (!this.itemIdToEdit) {
          this.resetForm();
          // Restore customGroupId if it's still valid
          if (
            this.availableCustomGroups.some(
              (g) => g._id === previousCustomGroupId
            )
          ) {
            this.homework.customGroupId = previousCustomGroupId;
          }
        }

        setTimeout(() => {
          this.$emit("itemActionSuccess", this.successMessage);
        }, 1500);
      } catch (error) {
        this.errorMessage =
          error.response?.data?.msg || "Darbības kļūda. Lūdzu, mēģiniet vēlāk.";
        console.error(
          "Homework submission/update error:",
          error.response ? error.response.data : error
        );
      } finally {
        if (this.errorMessage) {
          this.isLoading = false;
        }
        // If success, isLoading will be handled by navigation/timeout
      }
    },
  },
};
</script>

<style scoped>
/* .add-homework-view inherits .form-view and .card-style from global */
.view-title {
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

.file-input-styled {
  /* Can add custom styling for file input if browser defaults are not desired */
  /* For example, using ::file-selector-button pseudo-element */
}

.existing-files-display,
.selected-files-display {
  margin-top: 1rem;
  padding: 0.75rem;
  background-color: #f8f9fa; /* Light background for file list areas */
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
}
.existing-files-display strong,
.selected-files-display strong {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: var(--text-color);
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.existing-files-display strong .fas,
.selected-files-display strong .fas {
  color: var(--secondary-color);
}

.file-list {
  list-style-type: none;
  padding-left: 0;
  margin-top: 0.5rem;
}
.file-list-item {
  background-color: var(--card-bg-color);
  border: 1px solid #e9ecef;
  padding: 0.5rem 0.75rem;
  border-radius: var(--border-radius);
  margin-bottom: 0.3rem;
  font-size: 0.9em;
  color: #495057;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.file-list-item .fas {
  color: var(--primary-color);
}
.file-list-item.existing .fas {
  color: var(--info-color);
}
.file-list-item.new .fas {
  color: var(--success-color);
}
.file-size {
  font-size: 0.85em;
  color: #6c757d;
  margin-left: auto; /* Pushes size to the right */
}

.clear-files-label {
  display: flex;
  align-items: center;
  margin-top: 0.75rem;
  font-size: 0.9em;
  color: var(--text-color);
}
.clear-files-label input[type="checkbox"] {
  margin-right: 0.5rem;
  width: 15px;
  height: 15px;
}

.info-text {
  /* For small informative texts under inputs/selects */
  display: flex !important;
  align-items: center;
  gap: 0.3rem;
  font-style: italic;
}
.info-text .fas {
  font-size: 0.9em; /* Slightly smaller icon */
}

.success-message .fas,
.error-message .fas {
  margin-right: 0.5em;
}

.form-actions {
  justify-content: space-between;
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
