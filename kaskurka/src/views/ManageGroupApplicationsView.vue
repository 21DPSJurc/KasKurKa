<!-- kaskurka/src/views/ManageGroupApplicationsView.vue -->
<template>
  <div class="manage-group-applications-view form-view">
    <button
      @click="goBackToAdminDashboard"
      class="back-button"
      :disabled="isLoading || isProcessing"
    >
      ← Atpakaļ uz Admin Paneli
    </button>
    <h2>Grupas Pieteikumu Pārvaldība</h2>

    <div class="admin-filters">
      <div class="form-group">
        <label for="statusFilter">Filtrēt pēc statusa:</label>
        <select
          id="statusFilter"
          v-model="statusFilter"
          @change="fetchApplications"
          :disabled="isLoading || isProcessing"
        >
          <option value="pending">Gaida Apstiprinājumu (Pending)</option>
          <option value="approved">Apstiprinātie (Approved)</option>
          <option value="rejected">Noraidītie (Rejected)</option>
          <option value="">Visi</option>
        </select>
      </div>
      <!-- Add group filter if needed later -->
    </div>

    <div v-if="isLoading" class="loading-message">
      <p>Notiek pieteikumu ielāde...</p>
    </div>
    <div v-else-if="errorMessage" class="error-message">
      {{ errorMessage }}
    </div>
    <div v-else-if="applications.length === 0" class="empty-list-message">
      <p>Pēc izvēlētajiem kritērijiem nav atrasts neviens pieteikums.</p>
    </div>
    <div v-else class="applications-container">
      <div
        v-for="app in applications"
        :key="app._id"
        class="list-item application-item"
      >
        <div class="item-header">
          <h3>Pieteikums grupai: {{ app.groupName || "Nezināma Grupa" }}</h3>
        </div>
        <div class="item-content">
          <p>
            <strong>Pieteicējs:</strong> {{ app.userFirstName }} ({{
              app.userEmail
            }})
          </p>
          <p>
            <strong>Pieteikuma Datums:</strong> {{ formatDate(app.appliedAt) }}
          </p>
          <p>
            <strong>Statuss:</strong>
            <span :class="`status-${app.status}`">{{
              getStatusText(app.status)
            }}</span>
          </p>
          <div v-if="app.message" class="application-message-display">
            <strong>Pieteicēja ziņa:</strong>
            <p class="message-text">{{ app.message }}</p>
          </div>
        </div>
        <div class="item-actions" v-if="app.status === 'pending'">
          <button
            class="action-button-small approve"
            @click="processApplication(app._id, 'approve')"
            :disabled="isProcessing || processingId === app._id"
          >
            {{
              isProcessing &&
              processingId === app._id &&
              currentAction === "approve"
                ? "Apstiprina..."
                : "Apstiprināt"
            }}
          </button>
          <button
            class="action-button-small reject"
            @click="processApplication(app._id, 'reject')"
            :disabled="isProcessing || processingId === app._id"
          >
            {{
              isProcessing &&
              processingId === app._id &&
              currentAction === "reject"
                ? "Noraida..."
                : "Noraidīt"
            }}
          </button>
        </div>
        <div
          v-if="actionMessage[app._id]"
          :class="
            actionMessage[app._id].type === 'success'
              ? 'success-message-inline'
              : 'error-message-inline'
          "
        >
          {{ actionMessage[app._id].text }}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from "axios";

export default {
  name: "ManageGroupApplicationsView",
  data() {
    return {
      applications: [],
      isLoading: true,
      isProcessing: false,
      processingId: null,
      currentAction: "",
      errorMessage: "",
      actionMessage: {},
      statusFilter: "pending", // Default to pending applications
    };
  },
  methods: {
    goBackToAdminDashboard() {
      this.$emit("navigateToAdminDashboard");
    },
    async fetchApplications() {
      this.isLoading = true;
      this.errorMessage = "";
      this.actionMessage = {};
      try {
        let url = "/api/groups/applications";
        if (this.statusFilter) {
          url += `?status=${this.statusFilter}`;
        }
        const response = await axios.get(url);
        this.applications = response.data;
      } catch (error) {
        console.error("Error fetching group applications:", error);
        this.errorMessage =
          error.response?.data?.msg || "Kļūda ielādējot grupu pieteikumus.";
      } finally {
        this.isLoading = false;
      }
    },
    formatDate(dateString) {
      if (!dateString) return "N/A";
      const options = {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      };
      try {
        return new Date(dateString).toLocaleDateString("lv-LV", options);
      } catch (e) {
        return dateString;
      }
    },
    getStatusText(statusKey) {
      const map = {
        pending: "Gaida apstiprinājumu",
        approved: "Apstiprināts",
        rejected: "Noraidīts",
      };
      return map[statusKey] || statusKey;
    },
    async processApplication(applicationId, action) {
      this.isProcessing = true;
      this.processingId = applicationId;
      this.currentAction = action;
      this.actionMessage = { ...this.actionMessage, [applicationId]: null };

      const url = `/api/groups/applications/${applicationId}/${action}`;

      try {
        const response = await axios.put(url);
        this.actionMessage = {
          ...this.actionMessage,
          [applicationId]: { text: response.data.msg, type: "success" },
        };
        // Re-fetch applications based on the current filter after processing
        // This ensures the list is up-to-date, especially if the processed item
        // no longer matches the filter (e.g., moving from pending to approved).
        setTimeout(() => {
          this.fetchApplications();
        }, 1500); // Delay to allow user to see message
      } catch (error) {
        console.error(
          `Error ${action}ing application ${applicationId}:`,
          error
        );
        const errMsg =
          error.response?.data?.msg ||
          `Kļūda ${
            action === "approve" ? "apstiprinot" : "noraidot"
          } pieteikumu.`;
        this.actionMessage = {
          ...this.actionMessage,
          [applicationId]: { text: errMsg, type: "error" },
        };
      } finally {
        // Keep isProcessing for a bit if message is shown, then reset
        setTimeout(() => {
          this.isProcessing = false;
          this.processingId = null;
          this.currentAction = "";
        }, 1500);
      }
    },
  },
  created() {
    this.fetchApplications();
  },
};
</script>

<style scoped>
.manage-group-applications-view {
  max-width: 900px;
}
.loading-message,
.empty-list-message {
  text-align: center;
  padding: 20px;
  color: #555;
}
.applications-container {
  margin-top: 20px;
}
.list-item.application-item {
  background-color: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  margin-bottom: 15px;
  padding: 15px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}
.item-header h3 {
  margin: 0 0 10px 0;
  color: #2c3e50;
  font-size: 1.2em;
}
.item-content p {
  margin: 5px 0;
  font-size: 0.95em;
  line-height: 1.5;
}
.item-content strong {
  color: #34495e;
}
.status-pending {
  font-weight: bold;
  color: #f0ad4e;
}
.status-approved {
  font-weight: bold;
  color: #5cb85c;
}
.status-rejected {
  font-weight: bold;
  color: #d9534f;
}

.application-message-display {
  margin-top: 10px;
  padding: 10px;
  background-color: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 4px;
}
.application-message-display strong {
  display: block;
  margin-bottom: 5px;
  font-size: 0.9em;
  color: #495057;
}
.message-text {
  font-size: 0.9em;
  color: #333;
  white-space: pre-wrap; /* Respects newlines and spacing */
  word-wrap: break-word;
  margin: 0; /* Overrides default p margin if message-text is a p tag */
}

.item-actions {
  margin-top: 15px;
  padding-top: 10px;
  border-top: 1px solid #f0f0f0;
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}
.action-button-small {
  padding: 8px 15px;
  font-size: 0.9em;
  border-radius: 4px;
  cursor: pointer;
  border: none;
  color: white;
}
.action-button-small.approve {
  background-color: #5cb85c;
}
.action-button-small.approve:hover:not([disabled]) {
  background-color: #4cae4c;
}
.action-button-small.reject {
  background-color: #d9534f;
}
.action-button-small.reject:hover:not([disabled]) {
  background-color: #c9302c;
}
.action-button-small[disabled] {
  background-color: #bdc3c7;
  cursor: not-allowed;
  opacity: 0.7;
}
.success-message-inline,
.error-message-inline {
  padding: 8px;
  margin-top: 10px;
  border-radius: 4px;
  font-size: 0.9em;
  text-align: center;
}
.success-message-inline {
  background-color: #e6ffed;
  color: #2ecc71;
  border: 1px solid #2ecc71;
}
.error-message-inline {
  background-color: #fdd;
  color: #e74c3c;
  border: 1px solid #e74c3c;
}
.admin-filters {
  padding: 10px;
  background-color: #f1f3f5;
  border-radius: 5px;
  margin-bottom: 20px;
}
.admin-filters .form-group {
  margin-bottom: 0; /* Remove bottom margin if only one filter */
}
.admin-filters .form-group label {
  font-weight: bold;
  margin-right: 10px;
}
</style>
