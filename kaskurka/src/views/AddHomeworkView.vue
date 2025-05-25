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

      <!-- File upload section removed -->

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
        // selectedFileObjects removed
        // existingFileAttachments removed
        customGroupId: "",
      },
      today: `${year}-${month}-${day}`,
      errorMessage: "",
      successMessage: "",
      isLoading: false,
      isLoadingInitialData: false,
      // newFilesSelected removed
      // clearExistingFiles removed
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
        // Simple cache check, could be more sophisticated
        // if (this.allSystemGroups.length > 0 && !this.itemIdToEdit) return;

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
        // selectedFileObjects: [], // Removed
        // existingFileAttachments: [], // Removed
        customGroupId:
          this.availableCustomGroups.length === 1
            ? this.availableCustomGroups[0]._id
            : "",
      };
      // this.newFilesSelected = false; // Removed
      // this.clearExistingFiles = false; // Removed
      this.successMessage = "";
      // File input reset not needed
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
        // this.homework.existingFileAttachments = data.fileAttachments || []; // Removed
        this.homework.customGroupId = data.customGroupId
          ? data.customGroupId.toString()
          : "";
        // this.homework.selectedFileObjects = []; // Removed
        // this.newFilesSelected = false; // Removed
        // this.clearExistingFiles = false; // Removed
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
    // handleFileUpload removed
    validateClientSideForm() {
      // Clear previous general validation messages
      if (
        this.errorMessage &&
        (this.errorMessage.startsWith("Lūdzu") ||
          this.errorMessage.startsWith("Saite") ||
          this.errorMessage.includes("rakstzīmes"))
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
      // Clear previous general validation errors if any were related to now-removed file logic
      if (
        this.errorMessage &&
        (this.errorMessage.startsWith("Lūdzu") ||
          this.errorMessage.startsWith("Saite") ||
          this.errorMessage.startsWith("Jūs varat") || // Example file error
          this.errorMessage.startsWith("Fails") || // Example file error
          this.errorMessage.includes("rakstzīmes"))
      ) {
        this.errorMessage = "";
      }
      this.successMessage = "";

      const homeworkData = {
        customGroupId: this.homework.customGroupId,
        subject: this.homework.subject,
        description: this.homework.description,
        dueDate: this.homework.dueDate,
        additionalInfo: this.homework.additionalInfo,
        links: this.homework.links,
      };

      // File related FormData logic removed

      try {
        let response;
        if (this.itemIdToEdit) {
          response = await axios.put(
            `/api/homework/${this.itemIdToEdit}`,
            homeworkData
          );
        } else {
          response = await axios.post("/api/homework", homeworkData);
        }
        this.successMessage =
          response.data.msg ||
          (this.itemIdToEdit
            ? "Mājasdarbs veiksmīgi atjaunināts!"
            : "Mājasdarbs veiksmīgi pievienots!");

        const previousCustomGroupId = this.homework.customGroupId;
        if (!this.itemIdToEdit) {
          this.resetForm();
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

/* File input specific styles removed */

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
