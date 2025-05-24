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
    <div v-else-if="!canAddOrEdit" class="error-message">
      {{ addEditNotAllowedMessage }}
    </div>

    <form
      @submit.prevent="submitTest"
      class="test-form"
      v-if="canAddOrEdit && !isLoadingInitialData"
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
          darbu.</small
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
          :disabled="isLoading"
        />
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
        <label for="topics">Pārbaudes darba tēmas:</label>
        <textarea
          id="topics"
          v-model="test.topics"
          placeholder="Piemēram: Funkcijas, Masīvi, Klases"
          :disabled="isLoading"
        ></textarea>
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
          :disabled="
            isLoading || (availableCustomGroups.length === 0 && !itemIdToEdit)
          "
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
        topics: "",
        format: "",
        additionalInfo: "",
        customGroupId: "", // ID of the custom group
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
    canAddOrEdit() {
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
        this.allSystemGroups.length === 0
      ) {
        return "Lai pievienotu pārbaudes darbu, vispirms sistēmā ir jāizveido vismaz viena grupa.";
      }
      if (
        this.currentUser &&
        this.currentUser.role === "student" &&
        (!this.currentUser.enrolledCustomGroupsDetails ||
          this.currentUser.enrolledCustomGroupsDetails.length === 0)
      ) {
        return "Lai pievienotu pārbaudes darbu, Jums ir jābūt dalībniekam vismaz vienā grupā.";
      }
      return "Jums nav tiesību pievienot jaunus pārbaudes darbus.";
    },
  },
  watch: {
    itemIdToEdit: {
      immediate: true,
      async handler(newVal) {
        this.isLoadingInitialData = true;
        await this.fetchRequiredDataForForm();
        if (newVal) {
          await this.loadTestForEditing(newVal);
        } else {
          this.resetForm();
        }
        this.isLoadingInitialData = false;
      },
    },
    currentUser: {
      immediate: true,
      async handler() {
        this.isLoadingInitialData = true;
        await this.fetchRequiredDataForForm();
        this.isLoadingInitialData = false;
      },
    },
  },
  methods: {
    async fetchRequiredDataForForm() {
      if (
        this.currentUser &&
        this.currentUser.role === "admin" &&
        this.allSystemGroups.length === 0
      ) {
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
          "Kļūda ielādējot pārbaudes darba datus rediģēšanai.";
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
      this.errorMessage = "";
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
      this.errorMessage = "";
      this.successMessage = "";

      const testData = { ...this.test }; // Send all fields from this.test

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

        this.$emit("itemActionSuccess", this.successMessage);
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
  // created() {
  //   this.fetchRequiredDataForForm();
  // }
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
