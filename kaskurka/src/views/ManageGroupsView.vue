<template>
  <div class="manage-groups-view form-view">
    <button
      @click="goBackToAdminDashboard"
      class="back-button"
      :disabled="isLoading || isProcessing"
    >
      ← Atpakaļ uz Admin Paneli
    </button>
    <h2>Pārvaldīt Grupas</h2>

    <div v-if="isLoading" class="loading-message">
      <p>Notiek grupu ielāde...</p>
    </div>
    <div v-else-if="errorMessage" class="error-message">
      {{ errorMessage }}
    </div>
    <div v-else-if="groups.length === 0" class="empty-list-message">
      <p>Pašlaik nav izveidotu grupu.</p>
      <button class="action-button" @click="navigateToCreateGroup">
        Izveidot Jaunu Grupu
      </button>
    </div>
    <div v-else class="groups-container">
      <div
        v-for="group in groups"
        :key="group._id"
        class="list-item group-management-item"
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
          <small
            >Izveidota: {{ formatDate(group.createdAt) }} | Atjaunināta:
            {{ formatDate(group.updatedAt) }}</small
          >
          <small v-if="group.members"
            >Dalībnieku skaits: {{ group.members.length }}</small
          >
        </div>
        <div class="item-actions">
          <button
            class="action-button-small edit"
            @click="editGroup(group._id)"
            :disabled="isProcessing && processingGroupId === group._id"
          >
            Rediģēt
          </button>
          <button
            class="action-button-small delete"
            @click="confirmDeleteGroup(group)"
            :disabled="isProcessing && processingGroupId === group._id"
          >
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
      isProcessing: false, // For delete operation
      processingGroupId: null, // ID of group being deleted
      errorMessage: "",
      actionMessage: {}, // To show success/error per group item: { groupId: { text: '', type: 'success/error' } }
    };
  },
  methods: {
    goBackToAdminDashboard() {
      this.$emit("navigateToAdminDashboard");
    },
    navigateToCreateGroup() {
      // This component doesn't directly navigate to create group, App.vue handles it
      // But if we want a button here, AdminDashboardView would be the place to emit.
      // For now, this could be a placeholder or we can emit to App.vue to switch view.
      // Let's assume AdminDashboard still has the primary create button.
      // This button is for when the list is empty.
      this.$emit("navigateToAdminDashboard"); // Or emit navigateToCreateGroup if App.vue has such handler.
      // For now, going back to admin dash where create button is.
    },
    async fetchGroups() {
      this.isLoading = true;
      this.errorMessage = "";
      this.actionMessage = {};
      try {
        const response = await axios.get("/api/groups"); // Uses the general GET /api/groups
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
          // Refresh list after a short delay to show message
          setTimeout(() => {
            this.fetchGroups();
          }, 1500);
        } catch (error) {
          console.error(`Error deleting group ${group._id}:`, error);
          const errMsg = error.response?.data?.msg || "Kļūda dzēšot grupu.";
          this.actionMessage = {
            ...this.actionMessage,
            [group._id]: { text: errMsg, type: "error" },
          };
        } finally {
          // Keep isProcessing true for a bit if message is shown, then reset
          setTimeout(() => {
            this.isProcessing = false;
            this.processingGroupId = null;
          }, 1500);
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
.manage-groups-view {
  max-width: 900px;
}
.loading-message,
.empty-list-message {
  text-align: center;
  padding: 20px;
  color: #555;
}
.empty-list-message .action-button {
  margin-top: 15px;
}
.groups-container {
  margin-top: 20px;
}
.list-item.group-management-item {
  /* More specific class name */
  background-color: #fff;
  border: 1px solid #e0e0e0;
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
.item-content small {
  display: block;
  font-size: 0.85em;
  color: #7f8c8d;
  margin-top: 5px;
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
.action-button-small.edit {
  background-color: #f0ad4e;
}
.action-button-small.edit:hover:not([disabled]) {
  background-color: #ec971f;
}
.action-button-small.delete {
  background-color: #d9534f;
}
.action-button-small.delete:hover:not([disabled]) {
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
</style>
