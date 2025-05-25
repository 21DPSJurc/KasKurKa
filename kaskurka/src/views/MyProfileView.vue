<template>
  <div class="my-profile-view card-style">
    <button @click="goBack" class="back-button">
      <i class="fas fa-arrow-left"></i> Atpakaļ uz Paneli
    </button>
    <div class="profile-header">
      <i class="fas fa-id-card profile-icon-large"></i>
      <h2 class="view-title">Mans Profils</h2>
    </div>

    <div v-if="!currentUser" class="loading-indicator">
      <i class="fas fa-spinner fa-spin"></i> Notiek profila datu ielāde...
    </div>
    <div v-else class="profile-details-grid">
      <div class="profile-section card-style-inner">
        <h3 class="section-title">
          <i class="fas fa-user-circle"></i> Personīgā Informācija
        </h3>
        <div class="detail-item">
          <span class="detail-label">Vārds:</span>
          <span class="detail-value">{{ currentUser.firstName }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Uzvārds:</span>
          <span class="detail-value">{{ currentUser.lastName }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">E-pasts:</span>
          <span class="detail-value">{{ currentUser.email }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Loma:</span>
          <span
            class="detail-value role-badge"
            :class="`role-${currentUser.role}`"
            >{{ getRoleText(currentUser.role) }}</span
          >
        </div>
        <div class="detail-item">
          <span class="detail-label">Reģistrējies:</span>
          <span class="detail-value">{{
            formatDate(currentUser.createdAt)
          }}</span>
        </div>
      </div>

      <div class="profile-section card-style-inner">
        <h3 class="section-title">
          <i class="fas fa-graduation-cap"></i> Studiju Informācija
        </h3>
        <div class="detail-item">
          <span class="detail-label">Reģistrācijas grupa:</span>
          <span class="detail-value">{{ currentUser.group }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Mācību sākuma gads:</span>
          <span class="detail-value">{{ currentUser.studyStartYear }}</span>
        </div>
      </div>

      <div
        class="profile-section card-style-inner full-width-section"
        v-if="
          currentUser.role === 'student' &&
          currentUser.enrolledCustomGroupsDetails &&
          currentUser.enrolledCustomGroupsDetails.length > 0
        "
      >
        <h3 class="section-title">
          <i class="fas fa-users"></i> Manas Pielāgotās Grupas
        </h3>
        <ul class="custom-groups-list">
          <li
            v-for="group in currentUser.enrolledCustomGroupsDetails"
            :key="group._id"
            class="custom-group-item"
          >
            <i class="fas fa-layer-group list-icon"></i> {{ group.name }}
          </li>
        </ul>
      </div>
      <div
        class="profile-section card-style-inner"
        v-else-if="currentUser.role === 'student'"
      >
        <h3 class="section-title">
          <i class="fas fa-users"></i> Manas Pielāgotās Grupas
        </h3>
        <p class="no-groups-message">
          <i class="fas fa-info-circle"></i> Jūs neesat pievienojies nevienai
          pielāgotajai grupai.
        </p>
      </div>

      <!-- Future Actions (Example) -->
      <!--
      <div class="profile-actions card-style-inner full-width-section">
        <h3 class="section-title"><i class="fas fa-cog"></i> Profila Darbības</h3>
        <button class="action-button secondary-button" @click="navigateToChangePassword">
            <i class="fas fa-key"></i> Mainīt Paroli
        </button>
      </div>
      -->
    </div>
  </div>
</template>

<script>
export default {
  name: "MyProfileView",
  props: {
    currentUser: {
      type: Object,
      required: true,
    },
  },
  methods: {
    goBack() {
      this.$emit("navigateToUserSpecificDashboard");
    },
    formatDate(dateString) {
      if (!dateString) return "N/A";
      const options = {
        year: "numeric",
        month: "long",
        day: "numeric",
        // hour: "2-digit", // Optional: if time is needed
        // minute: "2-digit",
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
    // navigateToChangePassword() {
    //   this.$emit("navigateToChangePassword");
    // }
  },
};
</script>

<style scoped>
.my-profile-view {
  /* Inherits .card-style from global */
  max-width: 900px;
  padding: 1.5rem;
}
.profile-header {
  text-align: center;
  margin-bottom: 2rem;
}
.profile-icon-large {
  font-size: 4rem;
  color: var(--primary-color);
  margin-bottom: 0.5rem;
}
.view-title {
  color: var(--header-bg-color);
  margin: 0;
  font-size: 2rem;
  font-weight: 600;
}

.profile-details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

.profile-section {
  /* Uses .card-style-inner for nested card appearance */
}
.card-style-inner {
  background-color: var(--card-bg-color);
  border-radius: var(--border-radius);
  box-shadow: var(--shadow-sm);
  padding: 1.25rem;
  border: 1px solid var(--border-color);
}
.full-width-section {
  grid-column: 1 / -1; /* Makes section span full width of the grid */
}

.section-title {
  font-size: 1.3rem;
  color: var(--primary-color);
  margin-top: 0;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  gap: 0.6rem;
}
.detail-item {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px dotted #eee;
  font-size: 1rem;
}
.detail-item:last-child {
  border-bottom: none;
}
.detail-label {
  font-weight: 600;
  color: #555;
  margin-right: 1rem;
}
.detail-value {
  color: var(--text-color);
  text-align: right;
}
.role-badge {
  padding: 0.2em 0.6em;
  font-size: 0.85em;
  font-weight: bold;
  border-radius: var(--border-radius);
  color: var(--text-color-light);
  text-transform: capitalize;
}
.role-student {
  background-color: var(--info-color);
}
.role-admin {
  background-color: var(--warning-color);
  color: var(--text-color);
} /* Yellow needs dark text */

.custom-groups-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.custom-group-item {
  background-color: #f8f9fa;
  padding: 0.6rem 1rem;
  border-radius: var(--border-radius);
  margin-bottom: 0.5rem;
  font-size: 0.95rem;
  color: var(--text-color);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.list-icon {
  color: var(--primary-color);
}
.no-groups-message {
  font-style: italic;
  color: #6c757d;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.profile-actions {
  margin-top: 1.5rem;
  text-align: center;
}
.profile-actions .action-button {
  /* Uses global styles */
}
</style>
