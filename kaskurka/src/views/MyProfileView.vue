<template>
  <div class="my-profile-view form-view">
    <button @click="goBack" class="back-button">← Atpakaļ</button>
    <h2>Mans Profils</h2>

    <div v-if="!currentUser" class="loading-message">
      <p>Notiek profila datu ielāde...</p>
    </div>
    <div v-else class="profile-details">
      <div class="profile-section">
        <h3>Personīgā Informācija</h3>
        <p><strong>Vārds:</strong> {{ currentUser.firstName }}</p>
        <p><strong>Uzvārds:</strong> {{ currentUser.lastName }}</p>
        <p><strong>E-pasts:</strong> {{ currentUser.email }}</p>
        <p><strong>Loma:</strong> {{ getRoleText(currentUser.role) }}</p>
        <p>
          <strong>Reģistrējies:</strong> {{ formatDate(currentUser.createdAt) }}
        </p>
      </div>

      <div class="profile-section">
        <h3>Studiju Informācija</h3>
        <p><strong>Reģistrācijas grupa:</strong> {{ currentUser.group }}</p>
        <p>
          <strong>Mācību sākuma gads:</strong> {{ currentUser.studyStartYear }}
        </p>
      </div>

      <div
        class="profile-section"
        v-if="
          currentUser.enrolledCustomGroupsDetails &&
          currentUser.enrolledCustomGroupsDetails.length > 0
        "
      >
        <h3>Manas Pielāgotās Grupas:</h3>
        <ul class="custom-groups-list">
          <li
            v-for="group in currentUser.enrolledCustomGroupsDetails"
            :key="group._id"
          >
            {{ group.name }}
          </li>
        </ul>
      </div>
      <div class="profile-section" v-else-if="currentUser.role === 'student'">
        <h3>Manas Pielāgotās Grupas:</h3>
        <p>Jūs neesat pievienojies nevienai pielāgotajai grupai.</p>
      </div>

      <!-- Placeholder for future actions like password change -->
      <!-- 
      <div class="profile-actions">
        <button class="action-button" @click="navigateToChangePassword">Mainīt Paroli</button>
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
      // Emits an event that App.vue can listen to, to navigate to the appropriate dashboard
      this.$emit("navigateToUserSpecificDashboard");
    },
    formatDate(dateString) {
      if (!dateString) return "N/A";
      const options = {
        year: "numeric",
        month: "long",
        day: "numeric",
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
    // navigateToChangePassword() {
    //   this.$emit("navigateToChangePassword"); // Future implementation
    // }
  },
};
</script>

<style scoped>
.my-profile-view {
  max-width: 700px;
  text-align: left;
}
.my-profile-view h2 {
  margin-top: 0;
  text-align: center;
  color: #2c3e50;
  margin-bottom: 25px;
}
.loading-message {
  text-align: center;
  padding: 20px;
  color: #555;
}
.profile-details {
  background-color: #fff;
  padding: 20px;
  border-radius: 8px;
  /* box-shadow: 0 2px 8px rgba(0,0,0,0.05); No need if already in form-view */
}
.profile-section {
  margin-bottom: 25px;
  padding-bottom: 15px;
  border-bottom: 1px solid #eee;
}
.profile-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}
.profile-section h3 {
  font-size: 1.2em;
  color: #34495e;
  margin-top: 0;
  margin-bottom: 15px;
}
.profile-section p {
  margin: 8px 0;
  font-size: 1em;
  color: #333;
  line-height: 1.6;
}
.profile-section p strong {
  color: #555;
  min-width: 150px; /* Adjust as needed for alignment */
  display: inline-block;
}
.custom-groups-list {
  list-style-type: disc;
  padding-left: 20px;
}
.custom-groups-list li {
  margin-bottom: 5px;
  font-size: 1em;
  color: #333;
}
.profile-actions {
  margin-top: 20px;
  text-align: center;
}
</style>
