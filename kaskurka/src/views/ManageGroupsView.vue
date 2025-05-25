<template>
  <div class="manage-groups-view card-style">
    <button
      @click="goBackToAdminDashboard"
      class="back-button"
      :disabled="isLoading || isProcessing"
    >
      <i class="fas fa-arrow-left"></i> Atpakaļ uz Admin Paneli
    </button>
    <h2 class="view-title"><i class="fas fa-cogs"></i> Pārvaldīt Grupas</h2>

    <div v-if="isLoading" class="loading-indicator">
      <i class="fas fa-spinner fa-spin"></i> Notiek grupu ielāde...
    </div>
    <div v-else-if="errorMessage" class="error-message">
      <i class="fas fa-exclamation-triangle"></i> {{ errorMessage }}
    </div>
    <div
      v-else-if="groups.length === 0"
      class="empty-list-message card-style-inner"
    >
      <i class="fas fa-folder-open fa-3x"></i>
      <p>Pašlaik nav izveidotu grupu.</p>
      <button
        class="action-button primary-button"
        @click="navigateToCreateGroupDirectly"
      >
        <i class="fas fa-plus-circle"></i> Izveidot Jaunu Grupu
      </button>
    </div>

    <div v-else class="groups-management-container">
      <div
        v-for="group in groups"
        :key="group._id"
        class="list-item group-management-item card-style-inner"
      >
        <div class="group-item-header">
          <i class="fas fa-layer-group group-icon"></i>
          <div class="group-info">
            <h3>{{ group.name }}</h3>
            <p v-if="group.studyYear" class="group-study-year">
              <i class="fas fa-calendar-alt"></i> {{ group.studyYear }}
            </p>
          </div>
        </div>
        <div class="group-item-content">
          <p v-if="group.description" class="group-description">
            {{ group.description }}
          </p>
          <p v-else class="group-description italic">Apraksts nav pieejams.</p>
          <div class="group-meta-container">
            <small class="group-meta"
              ><i class="fas fa-clock"></i> Izveidota:
              {{ formatDate(group.createdAt) }}</small
            >
            <small class="group-meta"
              ><i class="fas fa-sync-alt"></i> Atjaunināta:
              {{ formatDate(group.updatedAt) }}</small
            >
            <small class="group-meta"
              ><i class="fas fa-user-friends"></i> Dalībnieki:
              {{ group.members ? group.members.length : 0 }}</small
            >
          </div>
        </div>
        <div class="group-item-actions">
          <button
            class="action-button warning-button"
            @click="editGroup(group._id)"
            :disabled="isProcessing && processingGroupId === group._id"
          >
            <i class="fas fa-edit"></i> Rediģēt / Pārvaldīt Dalībniekus
          </button>
          <button
            class="action-button danger-button"
            @click="confirmDeleteGroup(group)"
            :disabled="isProcessing && processingGroupId === group._id"
          >
            <i class="fas fa-trash-alt"></i>
            {{
              isProcessing && processingGroupId === group._id
                ? "Dzēš..."
                : "Dzēst"
            }}
          </button>
        </div>
        <div
          v-if="actionMessage[group._id]"
          :class="
            actionMessage[group._id].type === 'success'
              ? 'success-message-inline'
              : 'error-message-inline'
          "
        >
          <i
            :class="
              actionMessage[group._id].type === 'success'
                ? 'fas fa-check-circle'
                : 'fas fa-exclamation-circle'
            "
          ></i>
          {{ actionMessage[group._id].text }}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from "axios";

export default {
  name: "ManageGroupsView",
  data() {
    return {
      groups: [],
      isLoading: true,
      isProcessing: false,
      processingGroupId: null,
      errorMessage: "",
      actionMessage: {},
    };
  },
  methods: {
    goBackToAdminDashboard() {
      this.$emit("navigateToAdminDashboard");
    },
    navigateToCreateGroupDirectly() {
      // This emits an event that App.vue should handle to switch to CreateGroupView
      this.$emit("navigateToCreateGroup");
    },
    async fetchGroups() {
      this.isLoading = true;
      this.errorMessage = "";
      this.actionMessage = {};
      try {
        const response = await axios.get("/api/groups");
        this.groups = response.data.sort((a, b) =>
          a.name.localeCompare(b.name)
        );
      } catch (error) {
        console.error("Error fetching groups for admin:", error);
        this.errorMessage =
          error.response?.data?.msg || "Kļūda ielādējot grupas.";
      } finally {
        this.isLoading = false;
      }
    },
    formatDate(dateString) {
      if (!dateString) return "N/A";
      const options = {
        year: "numeric",
        month: "2-digit",
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
    editGroup(groupId) {
      this.$emit("navigateToEditGroup", groupId);
    },
    async confirmDeleteGroup(group) {
      if (
        confirm(
          `Vai tiešām vēlaties dzēst grupu "${group.name}"? Šī darbība ir neatgriezeniska un dzēsīs arī visus pieteikumus šai grupai, kā arī noņems to no lietotāju profiliem.`
        )
      ) {
        this.isProcessing = true;
        this.processingGroupId = group._id;
        this.actionMessage = { ...this.actionMessage, [group._id]: null };

        try {
          const response = await axios.delete(`/api/groups/${group._id}`);
          this.actionMessage = {
            ...this.actionMessage,
            [group._id]: { text: response.data.msg, type: "success" },
          };
          setTimeout(() => {
            this.fetchGroups();
          }, 1800); // Slightly longer to read message
        } catch (error) {
          console.error(`Error deleting group ${group._id}:`, error);
          const errMsg = error.response?.data?.msg || "Kļūda dzēšot grupu.";
          this.actionMessage = {
            ...this.actionMessage,
            [group._id]: { text: errMsg, type: "error" },
          };
        } finally {
          setTimeout(() => {
            this.isProcessing = false;
            this.processingGroupId = null;
          }, 1800);
        }
      }
    },
  },
  created() {
    this.fetchGroups();
  },
};
</script>

<style scoped>
/* .manage-groups-view inherits .card-style from global */
.manage-groups-view {
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
  margin-bottom: 1rem;
}
.empty-list-message .action-button {
  margin-top: 0.5rem;
}

.groups-management-container {
  margin-top: 1rem;
}
.list-item.group-management-item {
  /* Uses .card-style-inner */
  margin-bottom: 1.5rem;
  transition: box-shadow 0.2s ease;
  border-left: 5px solid var(--primary-color);
}
.list-item.group-management-item:hover {
  box-shadow: var(--shadow-md);
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
  opacity: 0.8;
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
  margin-bottom: 0.75rem;
  line-height: 1.6;
}
.group-item-content .group-description.italic {
  font-style: italic;
  color: #6c757d;
}

.group-meta-container {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem; /* Spacing between meta items */
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px dotted #e9ecef;
}
.group-meta {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
  color: #7f8c8d;
  background-color: #f8f9fa;
  padding: 0.25rem 0.5rem;
  border-radius: var(--border-radius);
}

.group-item-actions {
  margin-top: 1rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border-color);
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  flex-wrap: wrap;
}
/* Using global .action-button and color modifier classes */
.action-button.warning-button {
  background-color: var(--warning-color);
  color: var(--text-color);
}
.action-button.warning-button:hover:not([disabled]) {
  background-color: #e0a800;
}
.action-button.danger-button {
  background-color: var(--danger-color);
}
.action-button.danger-button:hover:not([disabled]) {
  background-color: #c82333;
}

.success-message-inline,
.error-message-inline {
  /* Global styles already cover these, but you can add specifics if needed */
  margin-top: 0.75rem;
  font-size: 0.9em;
}
.success-message-inline .fas,
.error-message-inline .fas {
  margin-right: 0.4rem;
}
</style>
