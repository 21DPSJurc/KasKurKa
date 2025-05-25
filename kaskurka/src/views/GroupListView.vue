<template>
  <div class="group-list-view card-style">
    <button
      @click="goBackToDashboard"
      class="back-button"
      :disabled="isLoading || isApplying"
    >
      <i class="fas fa-arrow-left"></i> Atpakaļ uz Paneli
    </button>
    <h2 class="view-title"><i class="fas fa-users"></i> Pieejamās Grupas</h2>

    <div class="filters-panel card-style-inner">
      <h3 class="filters-title"><i class="fas fa-filter"></i> Rādīt Grupas</h3>
      <div class="filters-grid">
        <div class="form-group">
          <label for="membershipFilter">Dalība:</label>
          <select
            id="membershipFilter"
            v-model="membershipFilter"
            :disabled="isLoading || isApplying"
          >
            <option value="all">Visas Pieejamās Grupas</option>
            <option value="joined">Manas Grupas</option>
            <option value="available">Var Pieteikties</option>
            <option value="pending">Pieteikums Nosūtīts</option>
          </select>
        </div>
        <div class="form-group">
          <label for="groupSearch">Meklēt grupu:</label>
          <input
            type="text"
            id="groupSearch"
            v-model="groupSearchQuery"
            placeholder="Ievadi nosaukumu..."
            :disabled="isLoading || isApplying"
          />
        </div>
      </div>
    </div>

    <div v-if="isLoading" class="loading-indicator">
      <i class="fas fa-spinner fa-spin"></i> Notiek grupu ielāde...
    </div>
    <div v-else-if="errorMessage" class="error-message">
      <i class="fas fa-exclamation-triangle"></i> {{ errorMessage }}
    </div>
    <div
      v-else-if="filteredGroups.length === 0"
      class="empty-list-message card-style-inner"
    >
      <i class="fas fa-folder-open fa-3x"></i>
      <p>
        Pēc jūsu izvēlētajiem kritērijiem netika atrastas grupas, vai arī
        saraksts ir tukšs.
      </p>
      <p v-if="membershipFilter !== 'all' || groupSearchQuery">
        Mēģiniet mainīt filtru iestatījumus.
      </p>
    </div>

    <div v-else class="groups-container">
      <div
        v-for="group in filteredGroups"
        :key="group._id"
        class="list-item group-item card-style-inner"
        :class="{
          'member-of-group': isMemberOfGroup(group),
          'application-pending':
            getApplicationStatusForGroup(group._id) === 'pending',
          'application-rejected':
            getApplicationStatusForGroup(group._id) === 'rejected',
        }"
      >
        <div class="group-item-header">
          <i class="fas fa-layer-group group-icon"></i>
          <div class="group-info">
            <h3>{{ group.name }}</h3>
            <p v-if="group.studyYear" class="group-study-year">
              <i class="fas fa-calendar-alt"></i> Mācību gads:
              {{ group.studyYear }}
            </p>
          </div>
        </div>
        <div class="group-item-content">
          <p v-if="group.description" class="group-description">
            {{ group.description }}
          </p>
          <p v-else class="group-description italic">Apraksts nav pieejams.</p>
          <small class="group-meta"
            ><i class="fas fa-clock"></i> Izveidota:
            {{ formatDate(group.createdAt) }}</small
          >
          <small class="group-meta" v-if="group.members"
            ><i class="fas fa-user-friends"></i> Dalībnieki:
            {{ group.members.length }}</small
          >

          <div
            v-if="getApplicationDetails(group._id) && !isMemberOfGroup(group)"
            class="application-info-display"
            :class="`status-bg-${getApplicationDetails(group._id).status}`"
          >
            <p class="application-status">
              <i
                :class="
                  getIconForStatus(getApplicationDetails(group._id).status)
                "
              ></i>
              Jūsu pieteikuma statuss:
              <strong>
                {{ getStatusText(getApplicationDetails(group._id).status) }}
              </strong>
            </p>
            <p
              v-if="getApplicationDetails(group._id).message"
              class="application-message-text"
            >
              <i class="fas fa-comment-alt"></i> Jūsu ziņa:
              <em>"{{ getApplicationDetails(group._id).message }}"</em>
            </p>
          </div>
        </div>

        <div class="group-item-actions">
          <div
            v-if="
              showApplyFormFor === group._id &&
              !isMemberOfGroup(group) &&
              getApplicationStatusForGroup(group._id) !== 'pending'
            "
            class="apply-form-section"
          >
            <div class="form-group application-message-group">
              <label :for="'apply-message-' + group._id"
                ><i class="fas fa-envelope-open-text"></i> Ziņa administratoram
                (neobligāti):</label
              >
              <textarea
                :id="'apply-message-' + group._id"
                v-model="applicationMessages[group._id]"
                rows="3"
                maxlength="500"
                :placeholder="
                  getApplicationDetails(group._id) &&
                  getApplicationDetails(group._id).message &&
                  getApplicationStatusForGroup(group._id) === 'rejected'
                    ? 'Iepriekšējā ziņa: ' +
                      getApplicationDetails(group._id).message
                    : 'Jūsu ziņa (līdz 500 rakstzīmēm)...'
                "
              ></textarea>
            </div>
            <div class="apply-form-buttons">
              <button
                class="action-button secondary-button cancel-apply"
                @click="cancelApplyForm(group._id)"
                :disabled="isApplying"
              >
                <i class="fas fa-times"></i> Atcelt
              </button>
              <button
                class="action-button primary-button send-application"
                @click="submitApplication(group._id)"
                :disabled="isApplying"
              >
                <i class="fas fa-paper-plane"></i>
                {{ isApplying ? "Sūta..." : "Nosūtīt Pieteikumu" }}
              </button>
            </div>
          </div>
          <button
            v-else
            class="action-button"
            :class="getButtonClass(group)"
            @click="toggleApplyForm(group._id)"
            :disabled="isButtonDisabled(group)"
          >
            <i :class="getButtonIcon(group)"></i> {{ getButtonText(group) }}
          </button>
        </div>
        <div
          v-if="applyErrorMessages[group._id]"
          class="error-message apply-error-inline"
        >
          <i class="fas fa-exclamation-circle"></i>
          {{ applyErrorMessages[group._id] }}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from "axios";
import _ from "lodash";

export default {
  name: "GroupListView",
  props: {
    currentUser: Object,
  },
  data() {
    return {
      allGroups: [],
      userApplications: [],
      isLoading: true,
      isApplying: false,
      errorMessage: "",
      membershipFilter: "all",
      groupSearchQuery: "",
      showApplyFormFor: null,
      applicationMessages: {},
      applyErrorMessages: {},
    };
  },
  computed: {
    filteredGroups() {
      if (!this.allGroups) return [];
      let groupsToShow = [...this.allGroups];

      const searchQuery = this.groupSearchQuery.trim().toLowerCase();
      if (searchQuery) {
        groupsToShow = groupsToShow.filter(
          (group) =>
            group.name.toLowerCase().includes(searchQuery) ||
            (group.description &&
              group.description.toLowerCase().includes(searchQuery))
        );
      }

      if (this.membershipFilter === "joined") {
        groupsToShow = groupsToShow.filter((group) =>
          this.isMemberOfGroup(group)
        );
      } else if (this.membershipFilter === "available") {
        groupsToShow = groupsToShow.filter((group) => {
          const isMember = this.isMemberOfGroup(group);
          const appStatus = this.getApplicationStatusForGroup(group._id);
          return !isMember && (!appStatus || appStatus === "rejected");
        });
      } else if (this.membershipFilter === "pending") {
        groupsToShow = groupsToShow.filter(
          (group) => this.getApplicationStatusForGroup(group._id) === "pending"
        );
      }
      // 'all' filter does not further reduce the list after search.

      return groupsToShow.sort((a, b) => a.name.localeCompare(b.name));
    },
  },
  created() {
    this.fetchData();
    this.debouncedFetchData = _.debounce(this.fetchData, 300); // For search
  },
  watch: {
    groupSearchQuery() {
      this.debouncedFetchData(); // Or just directly filter if allGroups is already comprehensive
    },
    membershipFilter() {
      // No need to re-fetch, computed property handles it
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
        // Consider if search query should go to backend if list is very large.
        // For now, assuming frontend filtering is sufficient.
        const [groupsRes, applicationsRes] = await Promise.all([
          axios.get("/api/groups"),
          axios.get("/api/groups/applications/my"),
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
      if (this.isButtonDisabled(this.allGroups.find((g) => g._id === groupId)))
        return;

      if (this.showApplyFormFor === groupId) {
        this.showApplyFormFor = null;
      } else {
        this.showApplyFormFor = groupId;
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
          };
        }
        this.applyErrorMessages = { ...this.applyErrorMessages, [groupId]: "" };
      }
    },
    cancelApplyForm(groupId) {
      this.showApplyFormFor = null;
      this.applicationMessages = { ...this.applicationMessages, [groupId]: "" };
      this.applyErrorMessages = { ...this.applyErrorMessages, [groupId]: "" };
    },
    getButtonText(group) {
      if (this.isMemberOfGroup(group)) return "Dalībnieks";
      const status = this.getApplicationStatusForGroup(group._id);
      if (status === "pending") return "Pieteikums Gaida";
      if (status === "rejected") return "Pieteikties Atkārtoti";
      return "Pieteikties Grupā";
    },
    getButtonIcon(group) {
      if (this.isMemberOfGroup(group)) return "fas fa-user-check";
      const status = this.getApplicationStatusForGroup(group._id);
      if (status === "pending") return "fas fa-hourglass-half";
      if (status === "rejected") return "fas fa-redo";
      return "fas fa-plus-circle";
    },
    getButtonClass(group) {
      if (this.isMemberOfGroup(group)) return "success-button";
      const status = this.getApplicationStatusForGroup(group._id);
      if (status === "pending") return "warning-button";
      if (status === "rejected") return "info-button";
      return "primary-button";
    },
    getIconForStatus(statusKey) {
      const map = {
        pending: "fas fa-hourglass-start",
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
    isButtonDisabled(group) {
      if (!group) return true; // If group object is not found
      if (this.showApplyFormFor === group._id) return false; // If form is open, button is replaced by form buttons
      if (this.isMemberOfGroup(group)) return true;
      const status = this.getApplicationStatusForGroup(group._id);
      return status === "pending" || this.isApplying;
    },
    async submitApplication(groupId) {
      this.isApplying = true;
      this.applyErrorMessages = { ...this.applyErrorMessages, [groupId]: "" };

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
        this.showApplyFormFor = null;
        this.applicationMessages = {
          ...this.applicationMessages,
          [groupId]: "",
        };
        await this.fetchData();
      } catch (error) {
        const errMsg = error.response?.data?.msg || "Kļūda piesakoties grupai.";
        this.applyErrorMessages = {
          ...this.applyErrorMessages,
          [groupId]: errMsg,
        };
        // alert(errMsg); // Error shown inline now
        console.error("Error applying to group:", error);
      } finally {
        this.isApplying = false;
      }
    },
  },
};
</script>

<style scoped>
/* .group-list-view inherits .card-style from global */
.group-list-view {
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

.groups-container {
  margin-top: 1rem;
}
.list-item.group-item {
  /* Uses .card-style-inner */
  margin-bottom: 1.5rem;
  transition: box-shadow 0.2s ease;
  border-left-width: 5px;
  border-left-style: solid;
  border-left-color: var(--secondary-color); /* Default */
}
.list-item.group-item:hover {
  box-shadow: var(--shadow-md);
}
.list-item.group-item.member-of-group {
  border-left-color: var(--success-color);
}
.list-item.group-item.application-pending {
  border-left-color: var(--warning-color);
}
.list-item.group-item.application-rejected {
  border-left-color: var(--danger-color);
}

.group-item-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px dashed var(--border-color);
}
.group-icon {
  font-size: 1.8rem;
  color: var(--primary-color);
}
.group-info h3 {
  margin: 0 0 0.2rem 0;
  color: var(--header-bg-color);
  font-size: 1.3rem;
  font-weight: 600;
}
.group-study-year {
  font-size: 0.85rem;
  color: #6c757d;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.group-item-content .group-description {
  font-size: 0.95em;
  color: #495057;
  margin-bottom: 0.5rem;
  line-height: 1.6;
}
.group-item-content .group-description.italic {
  font-style: italic;
  color: #6c757d;
}
.group-meta {
  display: inline-flex; /* Changed to inline-flex */
  align-items: center;
  gap: 0.3rem;
  font-size: 0.8rem;
  color: #7f8c8d;
  margin-right: 0.75rem; /* Added margin for spacing when inline */
  margin-top: 0.5rem;
}

.application-info-display {
  margin-top: 0.75rem;
  padding: 0.6rem 0.8rem;
  border-radius: var(--border-radius);
  font-size: 0.9em;
}
.application-info-display.status-bg-pending {
  background-color: #fff3cd;
  border: 1px solid #ffeeba;
  color: #856404;
}
.application-info-display.status-bg-approved {
  background-color: #d4edda;
  border: 1px solid #c3e6cb;
  color: #155724;
}
.application-info-display.status-bg-rejected {
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  color: #721c24;
}

.application-status {
  font-weight: 500;
  margin-bottom: 0.3rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.application-status strong {
  font-weight: 600;
}
.application-message-text {
  font-size: 0.9em;
  margin-top: 0.3rem;
  display: flex;
  align-items: flex-start;
  gap: 0.4rem;
}
.application-message-text em {
  font-style: normal;
}

.group-item-actions {
  margin-top: 1rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border-color);
  text-align: right;
}
/* Using global .action-button styles with specific color classes */
.action-button.primary-button {
  /* Default apply */
}
.action-button.success-button {
  background-color: var(--success-color);
  color: var(--text-color-light);
}
.action-button.warning-button {
  background-color: var(--warning-color);
  color: var(--text-color);
} /* Needs dark text */
.action-button.info-button {
  background-color: var(--info-color);
  color: var(--text-color-light);
}

.apply-form-section {
  margin-top: 0.5rem;
}
.application-message-group {
  text-align: left;
  margin-bottom: 0.75rem;
}
.application-message-group label {
  font-size: 0.9em;
  color: var(--text-color);
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.application-message-group textarea {
  width: 100%; /* Full width */
  padding: 0.6rem;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  font-size: 0.95em;
  min-height: 70px;
  margin-top: 0.3rem;
  box-sizing: border-box;
}
.apply-form-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.apply-error-inline {
  /* Uses global .error-message but is more specific */
  margin-top: 0.75rem;
  font-size: 0.85em;
  padding: 0.5rem 0.75rem;
}
.apply-error-inline .fas {
  margin-right: 0.3rem;
}

@media (max-width: 768px) {
  .filters-grid {
    grid-template-columns: 1fr; /* Stack filters */
  }
}
</style>
