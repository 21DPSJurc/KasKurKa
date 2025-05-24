<template>
  <div class="manage-users-view form-view">
    <button
      @click="goBackToAdminDashboard"
      class="back-button"
      :disabled="isLoading || isProcessing"
    >
      ← Atpakaļ uz Admin Paneli
    </button>
    <h2>Pārvaldīt Lietotājus</h2>

    <div v-if="isLoading" class="loading-message">
      <p>Notiek lietotāju ielāde...</p>
    </div>
    <div v-else-if="errorMessage" class="error-message">
      {{ errorMessage }}
    </div>
    <div v-else-if="users.length === 0" class="empty-list-message">
      <p>Pašlaik nav reģistrētu lietotāju (izņemot, iespējams, jūs).</p>
    </div>
    <div v-else class="users-container">
      <div
        v-for="user in users"
        :key="user._id"
        class="list-item user-management-item"
      >
        <div class="item-header">
          <h3>
            {{ user.firstName }} {{ user.lastName }}
            <span class="user-role-badge">{{ getRoleText(user.role) }}</span>
          </h3>
        </div>
        <div class="item-content">
          <p><strong>E-pasts:</strong> {{ user.email }}</p>
          <p>
            <strong>Studiju grupa:</strong> {{ user.group
            }}{{ user.subgroup ? "-" + user.subgroup : "" }} (sāk.
            {{ user.studyStartYear }})
          </p>
          <small>Reģistrējies: {{ formatDate(user.createdAt) }}</small>
          <small v-if="user.updatedAt && user.updatedAt !== user.createdAt"
            >Atjaunināts: {{ formatDate(user.updatedAt) }}</small
          >
        </div>
        <div class="item-actions">
          <button
            class="action-button-small edit"
            @click="editUser(user._id)"
            :disabled="isProcessing && processingUserId === user._id"
          >
            Rediģēt
          </button>
          <button
            class="action-button-small delete"
            @click="confirmDeleteUser(user)"
            :disabled="
              (isProcessing && processingUserId === user._id) ||
              user._id === currentAdminId
            "
            :title="
              user._id === currentAdminId
                ? 'Nevar dzēst pats sevi'
                : 'Dzēst lietotāju'
            "
          >
            {{
              isProcessing && processingUserId === user._id
                ? "Dzēš..."
                : "Dzēst"
            }}
          </button>
        </div>
        <div
          v-if="actionMessage[user._id]"
          :class="
            actionMessage[user._id].type === 'success'
              ? 'success-message-inline'
              : 'error-message-inline'
          "
        >
          {{ actionMessage[user._id].text }}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from "axios";

export default {
  name: "ManageUsersView",
  props: {
    currentAdminId: String, // To prevent admin from deleting themselves
  },
  data() {
    return {
      users: [],
      isLoading: true,
      isProcessing: false,
      processingUserId: null,
      errorMessage: "",
      actionMessage: {},
    };
  },
  methods: {
    goBackToAdminDashboard() {
      this.$emit("navigateToAdminDashboard");
    },
    async fetchUsers() {
      this.isLoading = true;
      this.errorMessage = "";
      this.actionMessage = {};
      try {
        const response = await axios.get("/api/users");
        this.users = response.data;
      } catch (error) {
        console.error("Error fetching users:", error);
        this.errorMessage =
          error.response?.data?.msg || "Kļūda ielādējot lietotājus.";
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
    getRoleText(roleKey) {
      const map = { student: "Students", admin: "Administrators" };
      return map[roleKey] || roleKey;
    },
    editUser(userId) {
      this.$emit("navigateToEditUser", userId);
    },
    async confirmDeleteUser(user) {
      if (user._id === this.currentAdminId) {
        alert("Jūs nevarat dzēst pats sevi.");
        return;
      }
      if (
        confirm(
          `Vai tiešām vēlaties dzēst lietotāju "${user.firstName} ${user.lastName}" (${user.email})? Šī darbība ir neatgriezeniska un var ietekmēt ar lietotāju saistītos datus (piem., komentārus).`
        )
      ) {
        this.isProcessing = true;
        this.processingUserId = user._id;
        this.actionMessage = { ...this.actionMessage, [user._id]: null };

        try {
          const response = await axios.delete(`/api/users/${user._id}`);
          this.actionMessage = {
            ...this.actionMessage,
            [user._id]: { text: response.data.msg, type: "success" },
          };
          setTimeout(() => {
            this.fetchUsers();
          }, 1500);
        } catch (error) {
          console.error(`Error deleting user ${user._id}:`, error);
          const errMsg = error.response?.data?.msg || "Kļūda dzēšot lietotāju.";
          this.actionMessage = {
            ...this.actionMessage,
            [user._id]: { text: errMsg, type: "error" },
          };
        } finally {
          setTimeout(() => {
            this.isProcessing = false;
            this.processingUserId = null;
          }, 1500);
        }
      }
    },
  },
  created() {
    this.fetchUsers();
  },
};
</script>

<style scoped>
.manage-users-view {
  max-width: 900px;
}
.loading-message,
.empty-list-message {
  text-align: center;
  padding: 20px;
  color: #555;
}
.users-container {
  margin-top: 20px;
}
.list-item.user-management-item {
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
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.user-role-badge {
  font-size: 0.7em;
  padding: 4px 10px;
  border-radius: 12px;
  color: white;
  font-weight: bold;
  text-transform: uppercase;
}
.user-role-badge.student {
  background-color: #3498db;
}
.user-role-badge.admin {
  background-color: #e67e22;
}

.item-content p {
  margin: 5px 0;
  font-size: 0.95em;
  line-height: 1.5;
}
.item-content strong {
  color: #34495e;
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
