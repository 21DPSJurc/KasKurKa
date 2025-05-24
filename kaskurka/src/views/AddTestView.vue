<template>
  <div class="form-view add-test-view">
    <button
      @click="handleBackNavigation"
      class="back-button"
      :disabled="isLoading"
    >
      ← {{ itemIdToEdit ? "Atpakaļ uz Sarakstu" : "Atpakaļ uz Paneli" }}
    </button>
    <h2>
      {{
        itemIdToEdit
          ? "Rediģēt Pārbaudes Darbu"
          : "Pievienot Jaunu Pārbaudes Darbu"
      }}
    </h2>

    <div v-if="isLoadingInitialData" class="loading-message">
      Notiek datu ielāde...
    </div>
    <div v-else-if="!canAddOrEditLogic" class="error-message">
      {{ addEditNotAllowedMessage }}
    </div>

    <form
      @submit.prevent="submitTest"
      class="test-form"
      v-if="canAddOrEditLogic && !isLoadingInitialData"
    >
      <div class="form-group">
        <label for="customGroupIdTest"
          >Grupa (kam redzams pārbaudes darbs):
          <span class="required-field">*</span></label
        >
        <select
          id="customGroupIdTest"
          v-model="test.customGroupId"
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
          >Jums jābūt vismaz vienas grupas dalībniekam, lai pievienotu pārbaudes
          darbu. Mēģiniet vēlreiz ielādēt lapu vai sazinieties ar
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
          v-model="test.subject"
          required
          maxlength="50"
          :disabled="isLoading"
        />
        <small>Līdz 50 rakstzīmēm.</small>
      </div>

      <div class="form-group">
        <label for="eventDate"
          >Norises datums: <span class="required-field">*</span></label
        >
        <input
          type="date"
          id="eventDate"
          v-model="test.eventDate"
          required
          :min="today"
          :disabled="isLoading"
        />
      </div>

      <div class="form-group">
        <label for="eventTime">Norises laiks:</label>
        <input
          type="time"
          id="eventTime"
          v-model="test.eventTime"
          :disabled="isLoading"
        />
        <small>Piemēram, 10:00</small>
      </div>

      <div class="form-group">
        <label for="topics">Pārbaudes darba tēmas/apraksts:</label>
        <textarea
          id="topics"
          v-model="test.topics"
          placeholder="Piemēram: Funkcijas, Masīvi, Klases. Līdz 1000 rakstzīmēm."
          maxlength="1000"
          :disabled="isLoading"
        ></textarea>
        <small>Līdz 1000 rakstzīmēm.</small>
      </div>

      <div class="form-group">
        <label for="format">Formāts:</label>
        <input
          type="text"
          id="format"
          v-model="test.format"
          placeholder="Piemēram: tests, eseja, prezentācija"
          :disabled="isLoading"
        />
      </div>

      <div class="form-group">
        <label for="additionalInfo">Cita būtiska informācija:</label>
        <textarea
          id="additionalInfo"
          v-model="test.additionalInfo"
          :disabled="isLoading"
        ></textarea>
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
              : "Pievienot Pārbaudes Darbu"
          }}
        </button>
      </div>
    </form>
  </div>
</template>

<script>
import axios from "axios";

export default {
  name: "AddTestView",
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
      test: {
        subject: "",
        eventDate: `${year}-${month}-${day}`,
        eventTime: "",
        topics: "", // This can serve as 'description' for tests
        format: "",
        additionalInfo: "",
        customGroupId: "",
      },
      today: `${year}-${month}-${day}`,
      errorMessage: "",
      successMessage: "",
      isLoading: false,
      isLoadingInitialData: false,
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
      // Renamed from canAddOrEdit
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
        return "Lai pievienotu pārbaudes darbu, vispirms sistēmā ir jāizveido vismaz viena grupa.";
      }
      if (
        this.currentUser &&
        this.currentUser.role === "student" &&
        (!this.currentUser.enrolledCustomGroupsDetails ||
          this.currentUser.enrolledCustomGroupsDetails.length === 0) &&
        !this.isLoadingInitialData
      ) {
        return "Lai pievienotu pārbaudes darbu, Jums ir jābūt dalībniekam vismaz vienā grupā. Ja nesen tikāt pievienots, mēģiniet pārlādēt lapu vai doties atpakaļ uz paneli un atgriezties šeit.";
      }
      if (!this.isLoadingInitialData)
        return "Jums nav tiesību pievienot jaunus pārbaudes darbus.";
      return "Notiek datu ielāde...";
    },
  },
  watch: {
    itemIdToEdit(newVal, oldVal) {
      if (newVal !== oldVal && !this.isLoadingInitialData) {
        this.handleIdOrUserChange();
      }
    },
    // currentUser(newVal, oldVal) {
    //    if (newVal && newVal.id !== oldVal?.id && !this.isLoadingInitialData) {
    //     this.handleIdOrUserChange();
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
          await this.refreshUser();
        }
        await this.handleIdOrUserChange();
      } catch (error) {
        console.error("Error during initial setup of AddTestView:", error);
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
        await this.loadTestForEditing(this.itemIdToEdit);
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
      this.test = {
        subject: "",
        eventDate: `${year}-${month}-${day}`,
        eventTime: "",
        topics: "",
        format: "",
        additionalInfo: "",
        customGroupId:
          this.availableCustomGroups.length === 1
            ? this.availableCustomGroups[0]._id
            : "",
      };
      // this.errorMessage = "";
      this.successMessage = "";
    },
    async loadTestForEditing(itemId) {
      this.isLoading = true;
      // this.errorMessage = "";
      this.successMessage = "";
      try {
        const response = await axios.get(`/api/tests/${itemId}`);
        const data = response.data;
        this.test.subject = data.subject;
        this.test.eventDate = data.eventDate
          ? new Date(data.eventDate).toISOString().split("T")[0]
          : this.today;
        this.test.eventTime = data.eventTime || "";
        this.test.topics = data.topics || "";
        this.test.format = data.format || "";
        this.test.additionalInfo = data.additionalInfo || "";
        this.test.customGroupId = data.customGroupId
          ? data.customGroupId.toString()
          : "";
      } catch (error) {
        console.error("Error loading test for editing:", error);
        this.errorMessage =
          error.response?.data?.msg ||
          "Kļūda ielādējot pārbaudes darba datus rediģēšanai. " +
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
    validateClientSideForm() {
      if (
        (this.errorMessage && this.errorMessage.startsWith("Lūdzu")) ||
        this.errorMessage.startsWith("Norādītais laiks") ||
        this.errorMessage.includes("rakstzīmes")
      ) {
        this.errorMessage = "";
      }
      this.successMessage = "";

      if (!this.test.customGroupId) {
        this.errorMessage =
          "Lūdzu, izvēlieties grupu, kurai pievienot pārbaudes darbu.";
        return false;
      }
      if (!this.test.subject.trim()) {
        this.errorMessage = "Mācību priekšmets ir obligāts lauks.";
        return false;
      }
      if (this.test.subject.trim().length > 50) {
        this.errorMessage =
          "Mācību priekšmeta nosaukums nedrīkst pārsniegt 50 rakstzīmes.";
        return false;
      }
      // 'topics' field serves as description for tests.
      if (this.test.topics && this.test.topics.trim().length > 1000) {
        this.errorMessage =
          "Pārbaudes darba tēmas/apraksts nedrīkst pārsniegt 1000 rakstzīmes.";
        return false;
      }
      if (!this.test.eventDate) {
        this.errorMessage = "Norises datums ir obligāts lauks.";
        return false;
      }
      if (
        this.test.eventTime &&
        !/^\d{2}:\d{2}$/.test(this.test.eventTime) &&
        this.test.eventTime.trim() !== ""
      ) {
        this.errorMessage =
          "Norādītais laiks nav korekts. Izmantojiet HH:MM formātu.";
        return false;
      }
      return true;
    },
    async submitTest() {
      if (!this.validateClientSideForm()) return;

      this.isLoading = true;
      if (
        this.errorMessage &&
        (this.errorMessage.startsWith("Lūdzu") ||
          this.errorMessage.startsWith("Norādītais laiks") ||
          this.errorMessage.includes("rakstzīmes"))
      ) {
        this.errorMessage = "";
      }
      this.successMessage = "";

      const testData = { ...this.test };

      try {
        let response;
        if (this.itemIdToEdit) {
          response = await axios.put(
            `/api/tests/${this.itemIdToEdit}`,
            testData
          );
        } else {
          response = await axios.post("/api/tests", testData);
        }
        this.successMessage =
          response.data.msg ||
          (this.itemIdToEdit
            ? "Pārbaudes darbs veiksmīgi atjaunināts!"
            : "Pārbaudes darbs veiksmīgi pievienots!");

        if (!this.itemIdToEdit) {
          const previousCustomGroupId = this.test.customGroupId;
          this.resetForm();
          if (
            this.availableCustomGroups.some(
              (g) => g._id === previousCustomGroupId
            )
          ) {
            this.test.customGroupId = previousCustomGroupId;
          }
        }

        setTimeout(() => {
          this.$emit("itemActionSuccess", this.successMessage);
        }, 1500);
      } catch (error) {
        this.errorMessage =
          error.response?.data?.msg || "Darbības kļūda. Lūdzu, mēģiniet vēlāk.";
        console.error(
          "Test submission/update error:",
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
