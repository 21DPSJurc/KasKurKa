<template>
  <div class="notification-list-view card-style">
    <button
      @click="goBackToDashboard"
      class="back-button"
      :disabled="isLoading || isProcessing"
    >
      <i class="fas fa-arrow-left"></i> Atpakaļ uz Paneli
    </button>
    <h2 class="view-title"><i class="fas fa-bell"></i> Visi Paziņojumi</h2>

    <div class="filters-panel card-style-inner">
      <div class="filters-header">
        <h3 class="filters-title"><i class="fas fa-filter"></i> Filtri</h3>
        <button
          v-if="hasUnreadNotifications"
          @click="markAllAsRead"
          class="action-button-small mark-all-view-btn"
          :disabled="isProcessing"
          title="Atzīmēt visus kā izlasītus"
        >
          <i class="fas fa-check-double"></i> Atzīmēt Visus kā Izlasītus
        </button>
      </div>
      <div class="filter-group">
        <label for="statusFilter">Rādīt:</label>
        <select
          id="statusFilter"
          v-model="statusFilter"
          @change="filterNotifications"
          :disabled="isLoading || isProcessing"
        >
          <option value="all">Visi</option>
          <option value="unread">Neizlasītie</option>
          <option value="read">Izlasītie</option>
        </select>
      </div>
    </div>

    <div v-if="isLoading" class="loading-indicator">
      <i class="fas fa-spinner fa-spin"></i> Notiek paziņojumu ielāde...
    </div>
    <div v-else-if="errorMessage" class="error-message">
      <i class="fas fa-exclamation-triangle"></i> {{ errorMessage }}
    </div>
    <div
      v-else-if="displayedNotifications.length === 0"
      class="empty-list-message card-style-inner"
    >
      <i class="fas fa-folder-open fa-3x"></i>
      <p>Nav paziņojumu, kas atbilst jūsu filtriem.</p>
      <p v-if="statusFilter !== 'all'">Mēģiniet izvēlēties "Visi".</p>
    </div>

    <div v-else class="notifications-container">
      <div
        v-for="notification in displayedNotifications"
        :key="notification._id"
        class="list-item notification-entry card-style-inner"
        :class="{ 'is-unread': !notification.isRead }"
      >
        <div class="notification-entry-header">
          <div class="notification-icon-type">
            <i :class="getNotificationIcon(notification.type)"></i>
          </div>
          <div class="notification-main-content">
            <p class="notification-message">{{ notification.message }}</p>
            <small class="notification-timestamp">{{
              formatFullDateTime(notification.createdAt)
            }}</small>
          </div>
        </div>
        <div class="notification-entry-actions">
          <button
            v-if="!notification.isRead"
            @click="markOneAsRead(notification._id)"
            class="action-button-small mark-as-read-btn"
            :disabled="isProcessing"
            title="Atzīmēt kā izlasītu"
          >
            <i class="fas fa-envelope-open"></i>
          </button>
          <button
            @click="deleteNotification(notification._id)"
            class="action-button-small delete-notification-btn"
            :disabled="isProcessing"
            title="Dzēst paziņojumu"
          >
            <i class="fas fa-trash-alt"></i>
          </button>
        </div>
      </div>
    </div>
    <!-- TODO: Add pagination if many notifications -->
  </div>
</template>

<script>
import axios from "axios";

export default {
  name: "NotificationListView",
  props: {
    currentUser: Object,
  },
  inject: ["fetchUserNotifications"], // Inject global notification fetcher from App.vue
  data() {
    return {
      allNotifications: [],
      displayedNotifications: [],
      isLoading: true,
      isProcessing: false,
      errorMessage: "",
      statusFilter: "all", // 'all', 'unread', 'read'
    };
  },
  computed: {
    hasUnreadNotifications() {
      return this.allNotifications.some((n) => !n.isRead);
    },
  },
  created() {
    this.loadAllNotifications();
  },
  methods: {
    goBackToDashboard() {
      this.$emit("navigateToDashboard");
    },
    async loadAllNotifications() {
      this.isLoading = true;
      this.errorMessage = "";
      try {
        const response = await axios.get("/api/notifications/all");
        this.allNotifications = response.data;
        this.filterNotifications(); // Apply initial filter
      } catch (error) {
        console.error("Error fetching all notifications:", error);
        this.errorMessage =
          error.response?.data?.msg || "Kļūda ielādējot visus paziņojumus.";
      } finally {
        this.isLoading = false;
      }
    },
    filterNotifications() {
      if (this.statusFilter === "all") {
        this.displayedNotifications = [...this.allNotifications];
      } else if (this.statusFilter === "unread") {
        this.displayedNotifications = this.allNotifications.filter(
          (n) => !n.isRead
        );
      } else if (this.statusFilter === "read") {
        this.displayedNotifications = this.allNotifications.filter(
          (n) => n.isRead
        );
      }
    },
    formatFullDateTime(dateString) {
      if (!dateString) return "N/A";
      const options = {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      };
      try {
        return new Date(dateString).toLocaleString("lv-LV", options);
      } catch (e) {
        return dateString;
      }
    },
    getNotificationIcon(type) {
      switch (type) {
        case "NEW_HOMEWORK":
          return "fas fa-book";
        case "NEW_TEST":
          return "fas fa-file-alt";
        case "GROUP_APPLICATION_APPROVED":
          return "fas fa-user-check";
        case "GROUP_APPLICATION_REJECTED":
          return "fas fa-user-times";
        case "ADMIN_ADDED_TO_GROUP":
          return "fas fa-user-plus";
        case "ADMIN_REMOVED_FROM_GROUP":
          return "fas fa-user-minus";
        case "COMMENT_ON_OWNED_ITEM":
          return "fas fa-comment";
        case "GROUP_DELETED_MEMBER":
          return "fas fa-users-slash";
        default:
          return "fas fa-info-circle";
      }
    },
    async markOneAsRead(notificationId) {
      this.isProcessing = true;
      try {
        await axios.put(`/api/notifications/${notificationId}/read`);
        await this.loadAllNotifications(); // Reload all to reflect changes
        if (this.fetchUserNotifications) this.fetchUserNotifications(); // Update unread count in App.vue
      } catch (error) {
        alert("Kļūda, atzīmējot paziņojumu kā izlasītu.");
      } finally {
        this.isProcessing = false;
      }
    },
    async markAllAsRead() {
      this.isProcessing = true;
      try {
        await axios.put("/api/notifications/read-all");
        await this.loadAllNotifications();
        if (this.fetchUserNotifications) this.fetchUserNotifications();
      } catch (error) {
        alert("Kļūda, atzīmējot visus paziņojumus kā izlasītus.");
      } finally {
        this.isProcessing = false;
      }
    },
    async deleteNotification(notificationId) {
      if (!confirm("Vai tiešām vēlaties dzēst šo paziņojumu?")) return;
      this.isProcessing = true;
      try {
        await axios.delete(`/api/notifications/${notificationId}`);
        await this.loadAllNotifications();
        if (this.fetchUserNotifications) this.fetchUserNotifications();
      } catch (error) {
        alert("Kļūda, dzēšot paziņojumu.");
      } finally {
        this.isProcessing = false;
      }
    },
  },
};
</script>

<style scoped>
.notification-list-view {
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
  margin-bottom: 1.5rem;
  padding: 1rem;
}
.filters-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border-color);
}
.filters-title {
  font-size: 1.2rem;
  color: var(--primary-color);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.filter-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.filter-group label {
  font-size: 0.9em;
  font-weight: 500;
}
.filter-group select {
  padding: 0.6rem;
  font-size: 0.95em;
  border-radius: var(--border-radius);
  border: 1px solid var(--border-color);
}
.mark-all-view-btn {
  background-color: var(--info-color);
  color: white;
  padding: 0.4rem 0.8rem; /* Consistent with dropdown */
  font-size: 0.85rem;
}
.mark-all-view-btn:hover {
  background-color: #138496;
}

.empty-list-message {
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

.notifications-container {
  margin-top: 1rem;
}
.list-item.notification-entry {
  margin-bottom: 1rem;
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: flex-start; /* Align top for actions */
  gap: 1rem;
  border-left-width: 4px;
  border-left-style: solid;
  border-left-color: var(--secondary-color); /* Default for read */
}
.list-item.notification-entry.is-unread {
  background-color: #e9f5ff;
  border-left-color: var(--primary-color);
}
.list-item.notification-entry.is-unread .notification-message {
  font-weight: 500;
}

.notification-entry-header {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  flex-grow: 1;
}
.notification-icon-type {
  font-size: 1.3rem;
  color: var(--primary-color);
  margin-top: 2px;
  width: 25px;
  text-align: center;
}
.notification-main-content {
  flex-grow: 1;
}
.notification-message {
  margin: 0 0 0.3rem 0;
  font-size: 0.95rem;
  line-height: 1.5;
  color: var(--text-color);
  word-break: break-word;
}
.notification-timestamp {
  font-size: 0.8rem;
  color: #6c757d;
}

.notification-entry-actions {
  display: flex;
  flex-direction: column; /* Stack buttons vertically */
  align-items: flex-end; /* Align to the right */
  gap: 0.5rem;
  margin-left: 1rem; /* Space from content */
}
.action-button-small {
  padding: 0.3rem 0.6rem;
  font-size: 0.8rem;
  min-width: 30px; /* For icon only buttons */
  text-align: center;
}
.mark-as-read-btn {
  background-color: var(--info-color);
  color: white;
}
.mark-as-read-btn:hover {
  background-color: #138496;
}
.delete-notification-btn {
  background-color: var(--danger-color);
  color: white;
}
.delete-notification-btn:hover {
  background-color: #c82333;
}
</style>
