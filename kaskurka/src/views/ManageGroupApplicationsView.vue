<template>
  <div class="manage-group-applications-view card-style">
    <button
      @click="goBackToAdminDashboard"
      class="back-button"
      :disabled="isLoading || isProcessing"
    >
      <i class="fas fa-arrow-left"></i> Atpakaļ uz Admin Paneli
    </button>
    <h2 class="view-title">
      <i class="fas fa-clipboard-check"></i> Grupu Pieteikumu Pārvaldība
    </h2>

    <div class="filters-panel card-style-inner">
      <h3 class="filters-title">
        <i class="fas fa-filter"></i> Filtrēt Pieteikumus
      </h3>
      <div class="filters-grid">
        <div class="form-group">
          <label for="statusFilter">Statuss:</label>
          <select
            id="statusFilter"
            v-model="statusFilter"
            @change="fetchApplications"
            :disabled="isLoading || isProcessing"
          >
            <option value="pending">Gaida Apstiprinājumu</option>
            <option value="approved">Apstiprinātie</option>
            <option value="rejected">Noraidītie</option>
            <option value="">Visi Statusi</option>
          </select>
        </div>
        <div class="form-group">
          <label for="groupNameFilter">Grupas nosaukums:</label>
          <input
            type="text"
            id="groupNameFilter"
            v-model="groupNameFilter"
            @input="debouncedFetchApplications"
            placeholder="Meklēt grupu..."
            :disabled="isLoading || isProcessing"
          />
        </div>
      </div>
    </div>

    <div v-if="isLoading" class="loading-indicator">
      <i class="fas fa-spinner fa-spin"></i> Notiek pieteikumu ielāde...
    </div>
    <div v-else-if="errorMessage" class="error-message">
      <i class="fas fa-exclamation-triangle"></i> {{ errorMessage }}
    </div>
    <div
      v-else-if="applications.length === 0"
      class="empty-list-message card-style-inner"
    >
      <i class="fas fa-folder-open fa-3x"></i>
      <p>Pēc izvēlētajiem kritērijiem nav atrasts neviens pieteikums.</p>
      <p v-if="statusFilter !== 'pending' || groupNameFilter">
        Mēģiniet mainīt filtru iestatījumus vai pārbaudīt "Gaida Apstiprinājumu"
        statusu.
      </p>
    </div>

    <div v-else class="applications-container">
      <div
        v-for="app in applications"
        :key="app._id"
        class="list-item application-item card-style-inner"
        :class="`status-border-${app.status}`"
      >
        <div class="app-item-header">
          <div class="app-icon" :class="`status-icon-${app.status}`">
            <i :class="getIconForStatus(app.status)"></i>
          </div>
          <div class="app-header-info">
            <h3>
              Pieteikums grupai:
              <span>{{ app.groupName || "Nezināma Grupa" }}</span>
            </h3>
            <p class="applicant-info">
              <i class="fas fa-user"></i> {{ app.userFirstName }} ({{
                app.userEmail
              }})
            </p>
          </div>
        </div>
        <div class="app-item-content">
          <p class="app-meta">
            <i class="fas fa-calendar-plus"></i> Pieteikts:
            <strong>{{ formatDate(app.appliedAt) }}</strong>
          </p>
          <p class="app-meta">
            <i class="fas fa-info-circle"></i> Statuss:
            <span class="status-text" :class="`status-text-${app.status}`">{{
              getStatusText(app.status)
            }}</span>
          </p>
          <div v-if="app.message" class="application-message-display">
            <strong><i class="fas fa-comment-alt"></i> Pieteicēja ziņa:</strong>
            <p class="message-text">{{ app.message }}</p>
          </div>
          <div v-if="app.processedAt" class="app-meta processed-info">
            <i class="fas fa-user-check"></i> Apstrādāja:
            {{ app.processedBy ? "Administrators" : "Neznāms" }} |
            <i class="fas fa-clock"></i> {{ formatDate(app.processedAt) }}
            <span v-if="app.reason">
              | <i class="fas fa-info-circle"></i> Iemesls:
              {{ app.reason }}</span
            >
          </div>
        </div>

        <div class="app-item-actions" v-if="app.status === 'pending'">
          <button
            class="action-button success-button"
            @click="processApplication(app._id, 'approve')"
            :disabled="isProcessing && processingId === app._id"
          >
            <i class="fas fa-check-circle"></i>
            {{
              isProcessing &&
              processingId === app._id &&
              currentAction === "approve"
                ? "Apstiprina..."
                : "Apstiprināt"
            }}
          </button>
          <button
            class="action-button danger-button"
            @click="processApplication(app._id, 'reject')"
            :disabled="isProcessing && processingId === app._id"
          >
            <i class="fas fa-times-circle"></i>
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
          <i
            :class="
              actionMessage[app._id].type === 'success'
                ? 'fas fa-check-circle'
                : 'fas fa-exclamation-circle'
            "
          ></i>
          {{ actionMessage[app._id].text }}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from "axios";
import _ from "lodash";

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
      statusFilter: "pending",
      groupNameFilter: "", // New filter for group name
    };
  },
  created() {
    this.fetchApplications();
    this.debouncedFetchApplications = _.debounce(this.fetchApplications, 500);
  },
  watch: {
    statusFilter() {
      this.fetchApplications();
    },
    // groupNameFilter is handled by debouncedFetchApplications on input
  },
  methods: {
    goBackToAdminDashboard() {
      this.$emit("navigateToAdminDashboard");
    },
    async fetchApplications() {
      this.isLoading = true;
      this.errorMessage = "";
      // Keep action messages for items not being re-fetched or to clear them if filter changes significantly
      // For simplicity, let's clear actionMessage on each fetch.
      // More sophisticated handling could preserve messages for items still in view.
      this.actionMessage = {};

      let params = {};
      if (this.statusFilter) params.status = this.statusFilter;
      // If backend supports group name filtering for applications:
      if (this.groupNameFilter.trim())
        params.groupName = this.groupNameFilter.trim();

      try {
        // Update URL construction to include groupName if your backend supports it
        // For now, assuming backend might not directly filter by groupName for applications list.
        // If it does, modify the params. For now, only status is passed.
        // let url = "/api/groups/applications";
        // if (this.statusFilter) {
        //   url += `?status=${this.statusFilter}`;
        // }
        // If backend doesn't filter by groupName on this endpoint, frontend filtering might be needed after fetch
        // or a different endpoint. For simplicity, assuming current backend handles status.
        const response = await axios.get("/api/groups/applications", {
          params,
        });
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
        month: "2-digit", // Use 'long' for full month name if preferred
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      };
      try {
        return new Date(dateString).toLocaleDateString("lv-LV", options);
      } catch (e) {
        return dateString;
      }
    },
    getIconForStatus(statusKey) {
      const map = {
        pending: "fas fa-hourglass-half",
        approved: "fas fa-check-circle",
        rejected: "fas fa-times-circle",
      };
      return map[statusKey] || "fas fa-question-circle";
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
        setTimeout(() => {
          this.fetchApplications();
        }, 1800);
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
        setTimeout(() => {
          this.isProcessing = false;
          this.processingId = null;
          this.currentAction = "";
        }, 1800);
      }
    },
  },
};
</script>

<style scoped>
/* .manage-group-applications-view inherits .card-style from global */
.manage-group-applications-view {
  padding: 1.5rem;
}
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

.filters-panel {
  /* Uses .card-style-inner */
  margin-bottom: 1.5rem;
  padding: 1rem;
}
.filters-title {
  font-size: 1.2rem;
  color: var(--primary-color);
  margin-top: 0;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.filters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
}
.filters-grid .form-group {
  margin-bottom: 0;
}
.filters-grid .form-group label {
  font-size: 0.9em;
  font-weight: 500;
}
.filters-grid .form-group select,
.filters-grid .form-group input[type="text"] {
  padding: 0.6rem;
  font-size: 0.95em;
}

.empty-list-message {
  /* Uses .card-style-inner */
  text-align: center;
  padding: 2rem;
  color: #6c757d;
}
.empty-list-message .fas {
  display: block;
  margin-bottom: 1rem;
  color: var(--secondary-color);
  opacity: 0.5;
}
.empty-list-message p {
  font-size: 1.05rem;
  margin-bottom: 0.5rem;
}

.applications-container {
  margin-top: 1rem;
}
.list-item.application-item {
  /* Uses .card-style-inner */
  margin-bottom: 1.5rem;
  transition: box-shadow 0.2s ease;
  border-left-width: 5px;
  border-left-style: solid;
}
.list-item.application-item:hover {
  box-shadow: var(--shadow-md);
}

.status-border-pending {
  border-left-color: var(--warning-color);
}
.status-border-approved {
  border-left-color: var(--success-color);
}
.status-border-rejected {
  border-left-color: var(--danger-color);
}

.app-item-header {
  display: flex;
  align-items: center; /* Vertically align icon and text */
  gap: 1rem;
  margin-bottom: 0.75rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px dashed var(--border-color);
}
.app-icon {
  font-size: 2rem; /* Larger status icon */
  width: 40px; /* Fixed width for alignment */
  text-align: center;
}
.status-icon-pending {
  color: var(--warning-color);
}
.status-icon-approved {
  color: var(--success-color);
}
.status-icon-rejected {
  color: var(--danger-color);
}

.app-header-info h3 {
  margin: 0 0 0.25rem 0;
  color: var(--header-bg-color);
  font-size: 1.2rem;
  font-weight: 600;
}
.app-header-info h3 span {
  /* Group name */
  color: var(--primary-color);
  font-weight: 500;
}
.applicant-info {
  font-size: 0.9rem;
  color: #555;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.app-item-content .app-meta {
  margin: 0.3rem 0;
  font-size: 0.9rem;
  color: #495057;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.app-item-content .app-meta strong {
  font-weight: 500;
}
.app-item-content .app-meta .fas {
  color: var(--secondary-color);
  font-size: 0.9em;
}

.status-text {
  font-weight: 600;
  text-transform: capitalize;
}
.status-text-pending {
  color: #856404; /* Dark yellow for text on light bg */
}
.status-text-approved {
  color: #155724; /* Dark green */
}
.status-text-rejected {
  color: #721c24; /* Dark red */
}

.application-message-display {
  margin-top: 0.75rem;
  padding: 0.75rem;
  background-color: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: var(--border-radius);
}
.application-message-display strong {
  display: block;
  margin-bottom: 0.3rem;
  font-size: 0.9em;
  color: var(--text-color);
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.message-text {
  font-size: 0.95em;
  color: #333;
  white-space: pre-wrap;
  word-wrap: break-word;
  margin: 0;
  padding-left: 1.5rem; /* Indent message text */
}

.processed-info {
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px dotted #e0e0e0;
  font-size: 0.85rem;
  color: #6c757d;
}

.app-item-actions {
  margin-top: 1rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border-color);
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  flex-wrap: wrap;
}
/* Using global .action-button and color modifier classes */
.action-button.success-button {
  background-color: var(--success-color);
}
.action-button.success-button:hover:not([disabled]) {
  background-color: #1e7e34;
}
.action-button.danger-button {
  background-color: var(--danger-color);
}
.action-button.danger-button:hover:not([disabled]) {
  background-color: #c82333;
}

.success-message-inline,
.error-message-inline {
  margin-top: 0.75rem;
  font-size: 0.9em;
}
.success-message-inline .fas,
.error-message-inline .fas {
  margin-right: 0.4rem;
}
</style>
