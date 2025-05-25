<template>
  <div class="notification-dropdown card-style" @click.stop>
    <div class="dropdown-header">
      <h4>Paziņojumi</h4>
      <button
        v-if="unreadCount > 0"
        @click="$emit('mark-all-as-read')"
        class="action-button-small mark-all-read-btn"
        title="Atzīmēt visus kā izlasītus"
      >
        <i class="fas fa-check-double"></i> Atzīmēt Visus kā Izlasītus
      </button>
    </div>
    <div class="dropdown-content">
      <ul
        v-if="notifications && notifications.length > 0"
        class="notification-list"
      >
        <li
          v-for="notification in notifications"
          :key="notification._id"
          class="notification-item"
          :class="{ 'is-unread': !notification.isRead }"
          @click="handleNotificationClick(notification)"
        >
          <div class="notification-icon-type">
            <i :class="getNotificationIcon(notification.type)"></i>
          </div>
          <div class="notification-text">
            <p :title="notification.message">
              {{ truncateText(notification.message, 70) }}
            </p>
            <small class="notification-time">{{
              timeAgo(notification.createdAt)
            }}</small>
          </div>
          <button
            v-if="!notification.isRead"
            @click.stop="$emit('mark-as-read', notification._id)"
            class="mark-one-read-btn"
            title="Atzīmēt kā izlasītu"
          >
            <i class="fas fa-envelope-open"></i>
          </button>
        </li>
      </ul>
      <p
        v-else-if="unreadCount > 0 && notifications.length === 0"
        class="no-notifications-text"
      >
        Notiek ielāde...
      </p>
      <p v-else class="no-notifications-text">
        <i class="fas fa-bell-slash"></i> Nav jaunu paziņojumu.
      </p>
    </div>
    <div class="dropdown-footer">
      <button
        class="action-button-small view-all-btn"
        @click="$emit('view-all-notifications')"
      >
        <i class="fas fa-list-ul"></i> Skatīt Visus Paziņojumus
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: "NotificationDropdown",
  props: {
    notifications: Array,
    unreadCount: Number,
  },
  emits: [
    "mark-as-read",
    "mark-all-as-read",
    "view-all-notifications",
    "close-dropdown",
  ],
  methods: {
    truncateText(text, length) {
      if (!text) return "";
      return text.length > length ? text.substring(0, length) + "..." : text;
    },
    timeAgo(dateString) {
      const date = new Date(dateString);
      const now = new Date();
      const seconds = Math.round((now - date) / 1000);
      const minutes = Math.round(seconds / 60);
      const hours = Math.round(minutes / 60);
      const days = Math.round(hours / 24);

      if (seconds < 60) return `${seconds} sek. atpakaļ`;
      if (minutes < 60) return `${minutes} min. atpakaļ`;
      if (hours < 24) return `${hours} st. atpakaļ`;
      if (days === 1) return `Vakar`;
      if (days < 7) return `${days} dienas atpakaļ`;
      return date.toLocaleDateString("lv-LV");
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
    handleNotificationClick(notification) {
      if (!notification.isRead) {
        this.$emit("mark-as-read", notification._id);
      }
      // Future: Navigate to notification.link if available
      // For now, just marking as read is handled, navigation will be to full list
      // or if a specific link is defined later, App.vue can handle routing.
      this.$emit("close-dropdown"); // Close dropdown on click
      if (notification.link) {
        // Placeholder for actual navigation logic if specific links are used
        console.log("Navigate to: ", notification.link);
        // Example: this.$router.push(notification.link) if using Vue Router
        // Or emit to App.vue to handle navigation: this.$emit('navigate', notification.link)
      } else {
        this.$emit("view-all-notifications"); // Fallback to all notifications list
      }
    },
  },
};
</script>

<style scoped>
.notification-dropdown {
  position: absolute;
  top: 100%; /* Position below the bell icon */
  right: 0;
  width: 350px; /* Adjust width as needed */
  background-color: var(--card-bg-color);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  box-shadow: var(--shadow-lg);
  z-index: 1050; /* Ensure it's above other content */
  color: var(--text-color);
  max-height: 400px; /* Limit height and make scrollable */
  display: flex;
  flex-direction: column;
}

.dropdown-header {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.dropdown-header h4 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--header-bg-color);
}
.action-button-small {
  /* General style for small buttons in dropdown */
  padding: 0.3rem 0.6rem;
  font-size: 0.8rem;
  /* Inherits .action-button styles if that class is also applied globally or locally */
  border: 1px solid transparent;
  cursor: pointer;
  border-radius: var(--border-radius);
}
.mark-all-read-btn {
  background-color: var(--info-color);
  color: white;
}
.mark-all-read-btn:hover {
  background-color: #138496;
}

.dropdown-content {
  overflow-y: auto; /* Scroll for many notifications */
  flex-grow: 1;
}
.notification-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.notification-item {
  display: flex;
  align-items: flex-start; /* Align items to the top */
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background-color 0.2s ease;
}
.notification-item:last-child {
  border-bottom: none;
}
.notification-item:hover {
  background-color: #f8f9fa; /* Light hover effect */
}
.notification-item.is-unread {
  background-color: #e9f5ff; /* Light blue for unread */
  font-weight: 500; /* Slightly bolder text for unread */
}
.notification-item.is-unread .notification-text p {
  font-weight: 500;
}

.notification-icon-type {
  font-size: 1.1rem;
  color: var(--primary-color);
  margin-top: 2px; /* Align icon nicely with text */
  width: 20px;
  text-align: center;
}
.notification-text {
  flex-grow: 1;
}
.notification-text p {
  margin: 0 0 0.25rem 0;
  font-size: 0.9rem;
  line-height: 1.4;
  color: var(--text-color);
  word-break: break-word;
}

.notification-time {
  font-size: 0.75rem;
  color: #6c757d; /* Secondary text color */
}

.mark-one-read-btn {
  background: none;
  border: none;
  color: var(--secondary-color);
  font-size: 0.9rem;
  cursor: pointer;
  padding: 0.3rem;
  opacity: 0.7;
}
.mark-one-read-btn:hover {
  color: var(--primary-color);
  opacity: 1;
}
.notification-item.is-unread .mark-one-read-btn {
  color: var(--primary-color); /* Make it more prominent for unread items */
  opacity: 0.9;
}

.no-notifications-text {
  padding: 1.5rem 1rem;
  text-align: center;
  color: #6c757d;
  font-style: italic;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}
.no-notifications-text .fas {
  font-size: 1.2rem;
  opacity: 0.7;
}

.dropdown-footer {
  padding: 0.75rem 1rem;
  border-top: 1px solid var(--border-color);
  text-align: center;
}
.view-all-btn {
  background-color: var(--secondary-color);
  color: white;
  width: 100%; /* Make button full width */
}
.view-all-btn:hover {
  background-color: #545b62;
}
</style>
