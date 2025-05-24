<!-- kaskurka/src/views/ManageGroupApplicationsView.vue -->
<template>
  <div class="manage-group-applications-view form-view">
    <button @click="goBackToAdminDashboard" class="back-button" :disabled="isLoading || isProcessing">
      ← Atpakaļ uz Admin Paneli
    </button>
    <h2>Grupas Pieteikumu Pārvaldība</h2>

    <div v-if="isLoading" class="loading-message">
      <p>Notiek pieteikumu ielāde...</p>
    </div>
    <div v-else-if="errorMessage" class="error-message">
      {{ errorMessage }}
    </div>
    <div v-else-if="applications.length === 0" class="empty-list-message">
      <p>Pašlaik nav aktīvu (gaidošu) pieteikumu.</p>
    </div>
    <div v-else class="applications-container">
      <div v-for="app in applications" :key="app._id" class="list-item application-item">
        <div class="item-header">
          <h3>Pieteikums grupai: {{ app.groupName || 'Nezināma Grupa' }}</h3>
        </div>
        <div class="item-content">
          <p><strong>Pieteicējs:</strong> {{ app.userFirstName }} ({{ app.userEmail }})</p>
          <p><strong>Pieteikuma Datums:</strong> {{ formatDate(app.appliedAt) }}</p>
          <p><strong>Statuss:</strong> <span :class="`status-${app.status}`">{{ getStatusText(app.status) }}</span></p>
        </div>
        <div class="item-actions" v-if="app.status === 'pending'">
          <button 
            class="action-button-small approve" 
            @click="processApplication(app._id, 'approve')"
            :disabled="isProcessing || processingId === app._id"
            >
            {{ (isProcessing && processingId === app._id && currentAction === 'approve') ? 'Apstiprina...' : 'Apstiprināt' }}
          </button>
          <button 
            class="action-button-small reject" 
            @click="processApplication(app._id, 'reject')"
            :disabled="isProcessing || processingId === app._id"
            >
            {{ (isProcessing && processingId === app._id && currentAction === 'reject') ? 'Noraida...' : 'Noraidīt' }}
          </button>
        </div>
         <div v-if="actionMessage[app._id]" :class="actionMessage[app._id].type === 'success' ? 'success-message-inline' : 'error-message-inline'">
            {{ actionMessage[app._id].text }}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: "ManageGroupApplicationsView",
  data() {
    return {
      applications: [],
      isLoading: true,
      isProcessing: false, // Global processing state for any application
      processingId: null, // ID of the application currently being processed
      currentAction: '', // 'approve' or 'reject'
      errorMessage: "",
      actionMessage: {}, // To show success/error per application: { appId: { text: '', type: 'success/error' } }
    };
  },
  methods: {
    goBackToAdminDashboard() {
      this.$emit("navigateToAdminDashboard");
    },
    async fetchApplications() {
      this.isLoading = true;
      this.errorMessage = "";
      this.actionMessage = {}; // Clear previous action messages
      try {
        // Fetch only pending applications by default for this view
        const response = await axios.get('/api/groups/applications?status=pending');
        this.applications = response.data;
      } catch (error) {
        console.error("Error fetching group applications:", error);
        this.errorMessage = error.response?.data?.msg || "Kļūda ielādējot grupu pieteikumus.";
      } finally {
        this.isLoading = false;
      }
    },
    formatDate(dateString) {
      if (!dateString) return 'N/A';
      const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
      try {
        return new Date(dateString).toLocaleDateString('lv-LV', options);
      } catch (e) { return dateString; }
    },
    getStatusText(statusKey) {
      const map = {
        'pending': 'Gaida apstiprinājumu',
        'approved': 'Apstiprināts',
        'rejected': 'Noraidīts'
      };
      return map[statusKey] || statusKey;
    },
    async processApplication(applicationId, action) { // action is 'approve' or 'reject'
      this.isProcessing = true;
      this.processingId = applicationId;
      this.currentAction = action;
      this.actionMessage = { ...this.actionMessage, [applicationId]: null }; // Clear previous message for this app

      const url = `/api/groups/applications/${applicationId}/${action}`;
      
      try {
        const response = await axios.put(url);
        this.actionMessage = { 
            ...this.actionMessage, 
            [applicationId]: { text: response.data.msg, type: 'success' }
        };
        // Refresh the list to remove/update the processed application
        // or update the specific item in the list
        const appIndex = this.applications.findIndex(app => app._id === applicationId);
        if (appIndex > -1) {
            if (action === 'approve') {
                 this.applications[appIndex].status = 'approved';
            } else if (action === 'reject') {
                 this.applications[appIndex].status = 'rejected';
            }
            // Visually, items with status other than 'pending' won't show action buttons.
            // We might want to remove them from the list entirely after processing.
            // For now, just updating status. To remove:
            // this.applications.splice(appIndex, 1);
            // Or better, re-fetch:
            this.fetchApplications(); 
        }

      } catch (error) {
        console.error(`Error ${action}ing application ${applicationId}:`, error);
        const errMsg = error.response?.data?.msg || `Kļūda ${action === 'approve' ? 'apstiprinot' : 'noraidot'} pieteikumu.`;
        this.actionMessage = { 
            ...this.actionMessage, 
            [applicationId]: { text: errMsg, type: 'error' }
        };
      } finally {
        this.isProcessing = false;
        this.processingId = null;
        this.currentAction = '';
      }
    }
  },
  created() {
    this.fetchApplications();
  },
};
</script>

<style scoped>
.manage-group-applications-view {
  max-width: 900px; /* Wider for more info */
}
.loading-message, .empty-list-message {
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
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
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
.status-pending { font-weight: bold; color: #f0ad4e; }
.status-approved { font-weight: bold; color: #5cb85c; }
.status-rejected { font-weight: bold; color: #d9534f; }

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
.action-button-small.approve { background-color: #5cb85c; }
.action-button-small.approve:hover:not([disabled]) { background-color: #4cae4c; }
.action-button-small.reject { background-color: #d9534f; }
.action-button-small.reject:hover:not([disabled]) { background-color: #c9302c; }
.action-button-small[disabled] {
  background-color: #bdc3c7;
  cursor: not-allowed;
  opacity: 0.7;
}
.success-message-inline, .error-message-inline {
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

</style>