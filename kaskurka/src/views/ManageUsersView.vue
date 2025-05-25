<template>
  <div class="manage-users-view card-style">
    <button
      @click="goBackToAdminDashboard"
      class="back-button"
      :disabled="isLoading || isProcessing"
    >
      <i class="fas fa-arrow-left"></i> Atpakaļ uz Admin Paneli
    </button>
    <h2 class="view-title">
      <i class="fas fa-users-cog"></i> Pārvaldīt Lietotājus
    </h2>

    <div class="filters-panel card-style-inner">
      <h3 class="filters-title">
        <i class="fas fa-filter"></i> Filtrēt Lietotājus
      </h3>
      <div class="filters-grid">
        <div class="form-group">
          <label for="userSearch">Meklēt (Vārds, Uzvārds, E-pasts):</label>
          <input
            type="text"
            id="userSearch"
            :value="userSearchQuery"
            @input="handleUserSearchInput"
            placeholder="Ievadiet meklējamo..."
            :disabled="isLoading || isProcessing"
          />
        </div>
        <div class="form-group">
          <label for="roleFilter">Loma:</label>
          <select
            id="roleFilter"
            v-model="roleFilter"
            :disabled="isLoading || isProcessing"
          >
            <option value="">Visas Lomas</option>
            <option value="student">Students</option>
            <option value="admin">Administrators</option>
          </select>
        </div>
      </div>
    </div>

    <div v-if="isLoading" class="loading-indicator">
      <i class="fas fa-spinner fa-spin"></i> Notiek lietotāju ielāde...
    </div>
    <div v-else-if="errorMessage" class="error-message">
      <i class="fas fa-exclamation-triangle"></i> {{ errorMessage }}
    </div>
    <div
      v-else-if="filteredUsers.length === 0"
      class="empty-list-message card-style-inner"
    >
      <i class="fas fa-user-slash fa-3x"></i>
      <p>Pēc jūsu izvēlētajiem kritērijiem netika atrasts neviens lietotājs.</p>
      <p v-if="userSearchQuery || roleFilter">
        Mēģiniet mainīt filtru iestatījumus.
      </p>
    </div>

    <div v-else class="users-management-container">
      <div
        v-for="user in filteredUsers"
        :key="user._id"
        class="list-item user-management-item card-style-inner"
        :class="`role-border-${user.role}`"
      >
        <div class="user-item-header">
          <div class="user-avatar-role">
            <i class="fas fa-user-circle user-avatar"></i>
            <span class="user-role-badge" :class="`role-bg-${user.role}`">{{
              getRoleText(user.role)
            }}</span>
          </div>
          <div class="user-header-info">
            <h3>{{ user.firstName }} {{ user.lastName }}</h3>
            <p class="user-email">
              <i class="fas fa-envelope"></i> {{ user.email }}
            </p>
          </div>
        </div>
        <div class="user-item-content">
          <p class="user-detail">
            <i class="fas fa-users"></i> <strong>Stud. grupa:</strong>
            {{ user.group || "N/A" }}
          </p>
          <p class="user-detail">
            <i class="fas fa-calendar-alt"></i> <strong>Sāk. gads:</strong>
            {{ user.studyStartYear || "N/A" }}
          </p>
          <div class="user-meta-container">
            <small class="user-meta"
              ><i class="fas fa-clock"></i> Reģ.:
              {{ formatDate(user.createdAt) }}</small
            >
            <small
              class="user-meta"
              v-if="user.updatedAt && user.updatedAt !== user.createdAt"
            >
              <i class="fas fa-sync-alt"></i> Atj.:
              {{ formatDate(user.updatedAt) }}
            </small>
          </div>
        </div>
        <div class="user-item-actions">
          <button
            class="action-button warning-button"
            @click="editUser(user._id)"
            :disabled="isProcessing && processingUserId === user._id"
          >
            <i class="fas fa-user-edit"></i> Rediģēt
          </button>
          <button
            class="action-button danger-button"
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
            <i class="fas fa-user-times"></i>
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
          <i
            :class="
              actionMessage[user._id].type === 'success'
                ? 'fas fa-check-circle'
                : 'fas fa-exclamation-circle'
            "
          ></i>
          {{ actionMessage[user._id].text }}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from "axios";
import _ from "lodash"; // Import Lodash

export default {
  name: "ManageUsersView",
  props: {
    currentAdminId: String,
  },
  data() {
    return {
      users: [],
      isLoading: true,
      isProcessing: false,
      processingUserId: null,
      errorMessage: "",
      actionMessage: {},
      userSearchQuery: "",
      roleFilter: "",
      debouncedUserSearchHandler: null,
    };
  },
  computed: {
    filteredUsers() {
      let tempUsers = [...this.users];

      const searchQuery = this.userSearchQuery.trim().toLowerCase();
      if (searchQuery) {
        tempUsers = tempUsers.filter(
          (user) =>
            user.firstName.toLowerCase().includes(searchQuery) ||
            user.lastName.toLowerCase().includes(searchQuery) ||
            user.email.toLowerCase().includes(searchQuery)
        );
      }

      if (this.roleFilter) {
        tempUsers = tempUsers.filter((user) => user.role === this.roleFilter);
      }
      return tempUsers.sort(
        (a, b) =>
          a.lastName.localeCompare(b.lastName) ||
          a.firstName.localeCompare(b.firstName)
      );
    },
  },
  created() {
    this.fetchUsers();
    this.debouncedUserSearchHandler = _.debounce((event) => {
      this.userSearchQuery = event.target.value;
    }, 500);
  },
  beforeUnmount() {
    if (
      this.debouncedUserSearchHandler &&
      this.debouncedUserSearchHandler.cancel
    ) {
      this.debouncedUserSearchHandler.cancel();
    }
  },
  methods: {
    handleUserSearchInput(event) {
      this.debouncedUserSearchHandler(event);
    },
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
      };
      try {
        return new Date(dateString).toLocaleDateString("lv-LV", options);
      } catch (e) {
        return dateString;
      }
    },
    getRoleText(roleKey) {
      const map = { student: "Students", admin: "Administrators" };
      return map[roleKey] || roleKey.charAt(0).toUpperCase() + roleKey.slice(1);
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
          `Vai tiešām vēlaties dzēst lietotāju "${user.firstName} ${user.lastName}" (${user.email})? Šī darbība ir neatgriezeniska un var ietekmēt ar lietotāju saistītos datus (piem., komentārus, pieteikumus).`
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
            this.users = this.users.filter((u) => u._id !== user._id);
          }, 1800);
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
            if (
              this.actionMessage[user._id] &&
              this.actionMessage[user._id].type === "error"
            ) {
              setTimeout(() => {
                this.actionMessage = {
                  ...this.actionMessage,
                  [user._id]: null,
                };
              }, 3000);
            } else if (
              this.actionMessage[user._id] &&
              this.actionMessage[user._id].type === "success"
            ) {
              this.users = this.users.filter((u) => u._id !== user._id);
            }
          }, 1800);
        }
      }
    },
  },
};
</script>

<style scoped>
/* .manage-users-view inherits .card-style from global */
.manage-users-view {
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
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
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

.users-management-container {
  margin-top: 1rem;
}
.list-item.user-management-item {
  /* Uses .card-style-inner */
  margin-bottom: 1.5rem;
  transition: box-shadow 0.2s ease;
  border-left-width: 5px;
  border-left-style: solid;
}
.list-item.user-management-item:hover {
  box-shadow: var(--shadow-md);
}
.role-border-student {
  border-left-color: var(--info-color);
}
.role-border-admin {
  border-left-color: var(--warning-color);
}

.user-item-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.75rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px dashed var(--border-color);
}
.user-avatar-role {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
}
.user-avatar {
  font-size: 2.5rem;
  color: var(--secondary-color);
  opacity: 0.8;
}
.user-role-badge {
  font-size: 0.7rem;
  padding: 0.2rem 0.6rem;
  border-radius: 8px;
  color: var(--text-color-light);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.role-bg-student {
  background-color: var(--info-color);
}
.role-bg-admin {
  background-color: var(--warning-color);
  color: var(--text-color);
}

.user-header-info h3 {
  margin: 0 0 0.25rem 0;
  color: var(--header-bg-color);
  font-size: 1.2rem;
  font-weight: 600;
}
.user-email {
  font-size: 0.9rem;
  color: #555;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.user-item-content .user-detail {
  margin: 0.3rem 0;
  font-size: 0.9rem;
  color: #495057;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.user-item-content .user-detail .fas {
  color: var(--secondary-color);
  font-size: 0.9em;
  width: 16px;
  text-align: center;
}
.user-item-content .user-detail strong {
  font-weight: 500;
  color: var(--text-color);
}

.user-meta-container {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 0.75rem;
  padding-top: 0.5rem;
  border-top: 1px dotted #e9ecef;
}
.user-meta {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
  color: #7f8c8d;
}

.user-item-actions {
  margin-top: 1rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border-color);
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  flex-wrap: wrap;
}

.action-button.warning-button {
  background-color: var(--warning-color);
  color: var(--text-color);
}
.action-button.warning-button:hover:not([disabled]) {
  background-color: #e0a800;
}
.action-button.danger-button {
  background-color: var(--danger-color);
  color: var(--text-color-light);
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
