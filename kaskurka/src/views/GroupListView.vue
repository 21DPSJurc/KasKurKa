<template>
  <div class="group-list-view form-view">
    <button
      @click="goBackToDashboard"
      class="back-button"
      :disabled="isLoading || isApplying"
    >
      ← Atpakaļ uz Paneli
    </button>
    <h2>Pieejamās Grupas</h2>

    <div class="filters group-filters">
      <div class="form-group">
        <label for="membershipFilter">Rādīt grupas:</label>
        <select
          id="membershipFilter"
          v-model="membershipFilter"
          :disabled="isLoading || isApplying"
        >
          <option value="all">Visas Grupas</option>
          <option value="joined">Manas Grupas (kur esmu dalībnieks)</option>
          <option value="available">Pieejamās Pievienošanai</option>
        </select>
      </div>
    </div>

    <div v-if="isLoading" class="loading-message">
      <p>Notiek grupu ielāde...</p>
    </div>
    <div v-else-if="errorMessage" class="error-message">
      {{ errorMessage }}
    </div>
    <div v-else-if="filteredGroups.length === 0" class="empty-list-message">
      <p>
        Pēc jūsu izvēlētajiem kritērijiem netika atrastas grupas, vai arī
        saraksts ir tukšs.
      </p>
    </div>
    <div v-else class="groups-container">
      <div
        v-for="group in filteredGroups"
        :key="group._id"
        class="list-item group-item"
      >
        <div class="item-header">
          <h3>{{ group.name }}</h3>
          <p v-if="group.studyYear" class="group-study-year">
            Mācību gads: {{ group.studyYear }}
          </p>
        </div>
        <div class="item-content">
          <p v-if="group.description" class="group-description">
            {{ group.description }}
          </p>
          <p v-else class="group-description italic">Apraksts nav pieejams.</p>
          <small>Izveidota: {{ formatDate(group.createdAt) }}</small>

          <div
            v-if="getApplicationDetails(group._id) && !isMemberOfGroup(group)"
            class="application-info"
          >
            <p class="application-status">
              Jūsu pieteikuma statuss:
              <strong>
                {{ getStatusText(getApplicationDetails(group._id).status) }}
              </strong>
            </p>
            <p
              v-if="getApplicationDetails(group._id).message"
              class="application-message"
            >
              Jūsu ziņa:
              <em>"{{ getApplicationDetails(group._id).message }}"</em>
            </p>
          </div>
        </div>

        <div class="item-actions">
          <div
            v-if="
              showApplyFormFor === group._id &&
              !isMemberOfGroup(group) &&
              getApplicationStatusForGroup(group._id) !== 'pending'
            "
          >
            <div class="form-group application-message-group">
              <label :for="'apply-message-' + group._id"
                >Ziņa administratoram (neobligāti, līdz 500 rakstzīmēm):</label
              >
              <textarea
                :id="'apply-message-' + group._id"
                v-model="applicationMessages[group._id]"
                rows="3"
                maxlength="500"
                :placeholder="
                  getApplicationDetails(group._id) &&
                  getApplicationDetails(group._id).message
                    ? 'Iepriekšējā ziņa: ' +
                      getApplicationDetails(group._id).message
                    : 'Jūsu ziņa...'
                "
              ></textarea>
            </div>
            <button
              class="action-button-small send-application"
              @click="submitApplication(group._id)"
              :disabled="isApplying"
            >
              {{ isApplying ? "Sūta..." : "Nosūtīt Pieteikumu" }}
            </button>
            <button
              class="action-button-small cancel-apply"
              @click="cancelApplyForm(group._id)"
              :disabled="isApplying"
            >
              Atcelt
            </button>
          </div>
          <button
            v-else
            class="action-button-small"
            @click="toggleApplyForm(group._id)"
            :disabled="isButtonDisabled(group)"
          >
            {{ getButtonText(group) }}
          </button>
        </div>
        <div v-if="applyErrorMessages[group._id]" class="error-message-inline">
          {{ applyErrorMessages[group._id] }}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from "axios";

export default {
  name: "GroupListView",
  props: {
    currentUser: Object,
  },
  data() {
    return {
      allGroups: [],
      userApplications: [], // Stores full application objects from backend, including message
      isLoading: true,
      isApplying: false,
      errorMessage: "",
      membershipFilter: "all",
      showApplyFormFor: null, // Stores groupId for which the apply form is shown
      applicationMessages: {}, // { groupId: "message text" }
      applyErrorMessages: {}, // { groupId: "error text" }
    };
  },
  computed: {
    filteredGroups() {
      if (!this.allGroups) return [];
      let groupsToShow = [...this.allGroups];

      if (this.membershipFilter === "joined") {
        groupsToShow = groupsToShow.filter((group) =>
          this.isMemberOfGroup(group)
        );
      } else if (this.membershipFilter === "available") {
        groupsToShow = groupsToShow.filter((group) => {
          const isMember = this.isMemberOfGroup(group);
          const appStatus = this.getApplicationStatusForGroup(group._id);
          // Available if not a member AND (no application OR application was rejected)
          return !isMember && (!appStatus || appStatus === "rejected");
        });
      }
      return groupsToShow.sort((a, b) => a.name.localeCompare(b.name));
    },
  },
  methods: {
    goBackToDashboard() {
      this.$emit("navigateToDashboard");
    },
    async fetchData() {
      this.isLoading = true;
      this.errorMessage = "";
      try {
        const [groupsRes, applicationsRes] = await Promise.all([
          axios.get("/api/groups"),
          axios.get("/api/groups/applications/my"), // This now returns messages
        ]);
        this.allGroups = groupsRes.data;
        this.userApplications = applicationsRes.data;
      } catch (error) {
        console.error("Error fetching group data:", error);
        this.errorMessage =
          error.response?.data?.msg || "Kļūda ielādējot grupu datus.";
      } finally {
        this.isLoading = false;
      }
    },
    formatDate(dateString) {
      if (!dateString) return "N/A";
      const options = { year: "numeric", month: "2-digit", day: "2-digit" };
      try {
        return new Date(dateString).toLocaleDateString("lv-LV", options);
      } catch (e) {
        return dateString;
      }
    },
    isMemberOfGroup(group) {
      if (
        this.currentUser &&
        this.currentUser.enrolledCustomGroups &&
        this.currentUser.enrolledCustomGroups.includes(group._id)
      ) {
        return true;
      }
      // Additionally check via userApplications if an application was 'approved'
      // as currentUser.enrolledCustomGroups might not be immediately updated on frontend
      const appDetails = this.getApplicationDetails(group._id);
      if (appDetails && appDetails.status === "approved") {
        return true;
      }
      return false;
    },
    getApplicationDetails(groupId) {
      return this.userApplications.find((a) => a.groupId === groupId);
    },
    getApplicationStatusForGroup(groupId) {
      const app = this.getApplicationDetails(groupId);
      return app ? app.status : null;
    },
    toggleApplyForm(groupId) {
      if (this.showApplyFormFor === groupId) {
        this.showApplyFormFor = null; // Close if already open
      } else {
        this.showApplyFormFor = groupId;
        // Pre-fill message if re-applying after rejection
        const existingApp = this.getApplicationDetails(groupId);
        if (
          existingApp &&
          existingApp.status === "rejected" &&
          existingApp.message
        ) {
          this.applicationMessages = {
            ...this.applicationMessages,
            [groupId]: existingApp.message,
          };
        } else {
          this.applicationMessages = {
            ...this.applicationMessages,
            [groupId]: "",
          }; // Clear for new application
        }
        this.applyErrorMessages = { ...this.applyErrorMessages, [groupId]: "" }; // Clear previous error
      }
    },
    cancelApplyForm(groupId) {
      this.showApplyFormFor = null;
      this.applicationMessages = { ...this.applicationMessages, [groupId]: "" };
      this.applyErrorMessages = { ...this.applyErrorMessages, [groupId]: "" };
    },
    getButtonText(group) {
      if (this.isMemberOfGroup(group)) {
        return "Jūs esat Dalībnieks";
      }
      const status = this.getApplicationStatusForGroup(group._id);
      if (status === "pending") {
        return "Pieteikums Gaida";
      }
      if (status === "rejected") {
        return "Pieteikties Atkārtoti";
      }
      return "Pieteikties";
    },
    getStatusText(statusKey) {
      const map = {
        pending: "Gaida apstiprinājumu",
        approved: "Apstiprināts",
        rejected: "Noraidīts",
      };
      return map[statusKey] || statusKey;
    },
    isButtonDisabled(group) {
      if (this.showApplyFormFor === group._id) return true; // Disable main button if form is open
      if (this.isMemberOfGroup(group)) return true;
      const status = this.getApplicationStatusForGroup(group._id);
      return status === "pending" || this.isApplying;
    },
    async submitApplication(groupId) {
      this.isApplying = true;
      this.applyErrorMessages = { ...this.applyErrorMessages, [groupId]: "" }; // Clear previous error for this group

      const message = this.applicationMessages[groupId] || "";
      if (message.length > 500) {
        this.applyErrorMessages = {
          ...this.applyErrorMessages,
          [groupId]: "Ziņa nedrīkst pārsniegt 500 rakstzīmes.",
        };
        this.isApplying = false;
        return;
      }

      try {
        const response = await axios.post(`/api/groups/${groupId}/apply`, {
          message,
        });
        alert(response.data.msg);
        this.showApplyFormFor = null; // Close form
        this.applicationMessages = {
          ...this.applicationMessages,
          [groupId]: "",
        }; // Clear message input
        await this.fetchData(); // Refresh all data
      } catch (error) {
        const errMsg = error.response?.data?.msg || "Kļūda piesakoties grupai.";
        this.applyErrorMessages = {
          ...this.applyErrorMessages,
          [groupId]: errMsg,
        };
        alert(errMsg); // Also show in general alert for now
        console.error("Error applying to group:", error);
      } finally {
        this.isApplying = false;
      }
    },
  },
  created() {
    this.fetchData();
  },
};
</script>

<style scoped>
/* Styles from previous step, with additions for application status and new filter */
.group-list-view {
  max-width: 900px;
}
.loading-message,
.empty-list-message {
  text-align: center;
  padding: 20px;
  color: #555;
}
.groups-container {
  margin-top: 20px;
}
.list-item.group-item {
  background-color: #fff;
  border: 1px solid #e0e0e0;
  border-left: 5px solid #1abc9c;
  border-radius: 6px;
  margin-bottom: 15px;
  padding: 15px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}
.item-header h3 {
  margin: 0 0 5px 0;
  color: #2c3e50;
  font-size: 1.3em;
}
.group-study-year {
  font-size: 0.9em;
  color: #7f8c8d;
  margin-bottom: 10px;
}
.group-description {
  font-size: 0.95em;
  color: #333;
  margin-bottom: 10px;
}
.group-description.italic {
  font-style: italic;
  color: #777;
}

.application-info {
  margin-top: 8px;
  padding: 8px;
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
}
.application-status {
  font-size: 0.9em;
  padding: 2px 0px;
  border-radius: 4px;
  display: inline-block;
  margin-bottom: 5px;
}
.application-message {
  font-size: 0.85em;
  color: #505050;
  margin-top: 3px;
  white-space: pre-wrap; /* To respect newlines in message */
  word-break: break-word;
}
.application-message em {
  color: #333;
}

.item-actions {
  margin-top: 15px;
  padding-top: 10px;
  border-top: 1px solid #f0f0f0;
  text-align: right;
}
.action-button-small {
  padding: 6px 12px;
  font-size: 0.85em;
  border-radius: 4px;
  cursor: pointer;
  border: none;
  color: white;
  background-color: #3498db;
  margin-left: 5px; /* Spacing for multiple buttons */
}
.action-button-small:hover:not([disabled]) {
  background-color: #2980b9;
}
.action-button-small[disabled] {
  background-color: #bdc3c7;
  cursor: not-allowed;
  opacity: 0.7;
}
.action-button-small.send-application {
  background-color: #28a745; /* Green for send */
}
.action-button-small.send-application:hover:not([disabled]) {
  background-color: #218838;
}
.action-button-small.cancel-apply {
  background-color: #6c757d; /* Grey for cancel */
}
.action-button-small.cancel-apply:hover:not([disabled]) {
  background-color: #5a6268;
}

.filters.group-filters {
  display: flex;
  gap: 20px;
  padding: 15px;
  background-color: #f9f9f9;
  border-radius: 6px;
  margin-bottom: 20px;
}
.filters.group-filters .form-group {
  margin-bottom: 0;
  flex-grow: 1;
}
.filters.group-filters .form-group label {
  margin-bottom: 5px;
}
.filters.group-filters .form-group select {
  width: 100%;
}

.application-message-group {
  text-align: left;
  margin-bottom: 10px;
}
.application-message-group label {
  font-size: 0.9em;
  color: #495057;
}
.application-message-group textarea {
  width: calc(100% - 22px); /* Match global textarea style */
  padding: 10px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 0.95em;
  min-height: 60px;
  margin-top: 5px;
}
.error-message-inline {
  display: block;
  background-color: #fdd;
  color: #e74c3c;
  border: 1px solid #e74c3c;
  padding: 8px;
  margin-top: 10px;
  border-radius: 4px;
  font-size: 0.9em;
  text-align: center;
}
</style>
