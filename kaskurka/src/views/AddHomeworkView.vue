<template>
  <div class="form-view add-homework-view">
    <button
      @click="handleBackNavigation"
      class="back-button"
      :disabled="isLoading"
    >
      ← {{ itemIdToEdit ? "Atpakaļ uz Sarakstu" : "Atpakaļ uz Paneli" }}
    </button>
    <h2>
      {{ itemIdToEdit ? "Rediģēt Mājasdarbu" : "Pievienot Jaunu Mājasdarbu" }}
    </h2>

    <div v-if="isLoadingInitialData" class="loading-message">
      Notiek datu ielāde...
    </div>
    <div v-else-if="!canAddOrEditLogic" class="error-message">
      {{ addEditNotAllowedMessage }}
    </div>

    <form
      @submit.prevent="submitHomework"
      class="homework-form"
      v-if="canAddOrEditLogic && !isLoadingInitialData"
    >
      <div class="form-group">
        <label for="customGroupId"
          >Grupa (kam redzams mājasdarbs):
          <span class="required-field">*</span></label
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
          >Jums jābūt vismaz vienas grupas dalībniekam, lai pievienotu
          mājasdarbu. Mēģiniet vēlreiz ielādēt lapu vai sazinieties ar
          administratoru, ja nesen tikāt pievienots jaunai grupai.</small
        >
        <small
          v-if="
            currentUser &&
            currentUser.role === 'admin' &&
            availableCustomGroups.length === 0
          "
          >Nav pieejamu grupu sistēmā. Lūdzu, izveidojiet grupu vispirms.</small
        >
      </div>

      <div class="form-group">
        <label for="subject"
          >Mācību priekšmets: <span class="required-field">*</span></label
        >
        <input
          type="text"
          id="subject"
          v-model="homework.subject"
          required
          :disabled="isLoading"
        />
      </div>

      <div class="form-group">
        <label for="description"
          >Detalizēts uzdevuma apraksts:
          <span class="required-field">*</span></label
        >
        <textarea
          id="description"
          v-model="homework.description"
          required
          :disabled="isLoading"
        ></textarea>
      </div>

      <div class="form-group">
        <label for="dueDate"
          >Izpildes termiņš: <span class="required-field">*</span></label
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

      <div class="form-group">
        <label for="additionalInfo"
          >Papildus informācija (norādīts mutiski, u.c.):</label
        >
        <textarea
          id="additionalInfo"
          v-model="homework.additionalInfo"
          :disabled="isLoading"
        ></textarea>
      </div>

      <div class="form-group">
        <label for="links">Saites uz nepieciešamajiem resursiem:</label>
        <textarea
          id="links"
          v-model="homework.links"
          placeholder="Katra saite jaunā rindā"
          :disabled="isLoading"
        ></textarea>
        <small>Piemēram: https://example.com/resource1</small>
      </div>

      <div class="form-group">
        <label for="files">Faili (līdz 5 failiem, katrs līdz 5MB):</label>
        <input
          type="file"
          id="files"
          @change="handleFileUpload"
          multiple
          :disabled="isLoading"
          accept=".pdf,.doc,.docx,.zip,image/*,.txt,.ppt,.pptx,.xls,.xlsx"
        />
        <small v-if="!itemIdToEdit">Pievienojiet jaunus failus.</small>
        <small v-if="itemIdToEdit"
          >Pievienojot jaunus failus, tie aizstās esošos. Lai dzēstu visus
          failus, atzīmējiet zemāk.</small
        >

        <div
          v-if="
            itemIdToEdit &&
            homework.existingFileAttachments &&
            homework.existingFileAttachments.length > 0 &&
            !newFilesSelected
          "
          class="existing-files-info"
        >
          <strong>Esošie faili:</strong>
          <ul>
            <li
              v-for="(file, index) in homework.existingFileAttachments"
              :key="index"
            >
              {{ file.originalName }} ({{ (file.size / 1024).toFixed(2) }} KB)
            </li>
          </ul>
          <label
            ><input
              type="checkbox"
              v-model="clearExistingFiles"
              :disabled="isLoading"
            />
            Dzēst visus esošos failus (ja nepievienojat jaunus)</label
          >
        </div>

        <ul v-if="homework.selectedFileObjects.length > 0" class="file-list">
          <li
            v-for="(file, index) in homework.selectedFileObjects"
            :key="index"
          >
            {{ file.name }} ({{ (file.size / 1024).toFixed(2) }} KB)
          </li>
        </ul>
      </div>

      <div v-if="successMessage" class="success-message">
        {{ successMessage }}
      </div>
      <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>

      <div class="form-actions">
        <button
          v-if="itemIdToEdit"
          type="button"
          @click="cancelEdit"
          class="action-button secondary-action"
          :disabled="isLoading"
        >
          Atcelt
        </button>
        <span></span>
        <button
          type="submit"
          class="action-button"
          :disabled="isLoading || !canAddOrEditLogic"
        >
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
  inject: ["refreshUser"], // Inject the refresh method from App.vue
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
      allSystemGroups: [], // For admin to select from
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
      // Renamed from canAddOrEdit to avoid conflict with potential method
      if (!this.currentUser) return false;
      if (this.itemIdToEdit) return true; // Can always attempt to edit if ID provided

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
    // Watch for itemIdToEdit changes after initial mount
    itemIdToEdit(newVal, oldVal) {
      if (newVal !== oldVal && !this.isLoadingInitialData) {
        // Avoid running during initial mount if already handled
        this.handleIdOrUserChange();
      }
    },
    // Watch for currentUser changes after initial mount (e.g., unlikely, but for robustness)
    // currentUser(newVal, oldVal) {
    //   if (newVal && newVal.id !== oldVal?.id && !this.isLoadingInitialData) {
    //      this.handleIdOrUserChange();
    //   }
    // }
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
          await this.refreshUser(); // Ensures App.vue's currentUser is fresh
        }
        // currentUser prop is now updated
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
      // This method is called after currentUser is fresh.
      // It fetches additional data (like all groups for admin) and sets up the form.
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
      // Formerly part of fetchRequiredDataForForm
      if (this.currentUser && this.currentUser.role === "admin") {
        // Only fetch if not already loaded or if a refresh is needed
        if (this.allSystemGroups.length > 0 && !this.itemIdToEdit) {
          /* simple cache */
        }

        try {
          const response = await axios.get("/api/groups");
          this.allSystemGroups = response.data;
        } catch (error) {
          console.error("Error fetching all groups for admin:", error);
          this.errorMessage = "Kļūda ielādējot grupu sarakstu administratoram.";
          // Potentially re-throw or handle more gracefully
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
      // Do not clear general errorMessage here as it might be from initial load
      // this.errorMessage = "";
      this.successMessage = "";
      const fileInput = document.getElementById("files");
      if (fileInput) fileInput.value = null;
    },
    async loadHomeworkForEditing(itemId) {
      this.isLoading = true; // Use general isLoading for item-specific loading
      // this.errorMessage = ""; // Keep existing error messages if any from parent loading
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
            (this.errorMessage || ""); // Append to existing errors
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
      this.errorMessage = ""; // Clear file-specific errors
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
          return; // Stop on first oversized file
        }
      }
    },
    validateClientSideForm() {
      // Clear only submission-related error message
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
      if (!this.homework.description.trim()) {
        this.errorMessage = "Uzdevuma apraksts ir obligāts lauks.";
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
      // Clear only form-specific error messages before submission attempt
      if (
        this.errorMessage &&
        (this.errorMessage.startsWith("Lūdzu") ||
          this.errorMessage.startsWith("Saite") ||
          this.errorMessage.startsWith("Jūs varat") ||
          this.errorMessage.startsWith("Fails"))
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

        if (!this.itemIdToEdit) {
          const previousCustomGroupId = this.homework.customGroupId;
          this.resetForm();
          if (
            this.availableCustomGroups.some(
              (g) => g._id === previousCustomGroupId
            )
          ) {
            this.homework.customGroupId = previousCustomGroupId;
          }
        }

        // Delay navigation to allow user to see success message
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
        this.isLoading = false;
      }
    },
  },
};
</script>

<style scoped>
.file-list {
  list-style-type: none;
  padding-left: 0;
  margin-top: 10px;
}
.file-list li {
  background-color: #f9f9f9;
  border: 1px solid #eee;
  padding: 5px 10px;
  border-radius: 4px;
  margin-bottom: 5px;
  font-size: 0.9em;
  color: #555;
}
.existing-files-info {
  margin-top: 10px;
  padding: 10px;
  background-color: #e9ecef;
  border-radius: 4px;
  font-size: 0.9em;
}
.existing-files-info ul {
  margin-top: 5px;
  margin-bottom: 10px;
  padding-left: 20px;
}
.existing-files-info label {
  font-weight: normal;
  display: flex;
  align-items: center;
}
.existing-files-info input[type="checkbox"] {
  margin-right: 5px;
}
.secondary-action {
  background-color: #6c757d;
}
.secondary-action:hover {
  background-color: #5a6268;
}
.loading-message {
  text-align: center;
  padding: 20px;
  color: #555;
}
</style>
