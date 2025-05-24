<template>
  <div class="group-list-view form-view">
    <button
      @click="goBackToDashboard"
      class="back-button"
      :disabled="isLoading || isApplying"
    >
      ← Atpakaļ uz Paneli
    </button>
    <h2>Pieejamās Grupas</h2>

    <div class="filters group-filters">
      <div class="form-group">
        <label for="membershipFilter">Rādīt grupas:</label>
        <select
          id="membershipFilter"
          v-model="membershipFilter"
          :disabled="isLoading || isApplying"
        >
          <option value="all">Visas Grupas</option>
          <option value="joined">Manas Grupas (kur esmu dalībnieks)</option>
          <option value="available">Pieejamās Pievienošanai</option>
        </select>
      </div>
    </div>

    <div v-if="isLoading" class="loading-message">
      <p>Notiek grupu ielāde...</p>
    </div>
    <div v-else-if="errorMessage" class="error-message">
      {{ errorMessage }}
    </div>
    <div v-else-if="filteredGroups.length === 0" class="empty-list-message">
      <p>
        Pēc jūsu izvēlētajiem kritērijiem netika atrastas grupas, vai arī
        saraksts ir tukšs.
      </p>
    </div>
    <div v-else class="groups-container">
      <div
        v-for="group in filteredGroups"
        :key="group._id"
        class="list-item group-item"
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
          <small>Izveidota: {{ formatDate(group.createdAt) }}</small>
          <p
            v-if="
              getApplicationStatusForGroup(group._id) && !isMemberOfGroup(group)
            "
            class="application-status"
          >
            Jūsu pieteikuma statuss:
            <strong>{{
              getStatusText(getApplicationStatusForGroup(group._id))
            }}</strong>
          </p>
        </div>
        <div class="item-actions">
          <button
            class="action-button-small"
            @click="applyToGroup(group._id)"
            :disabled="isButtonDisabled(group)"
          >
            {{ getButtonText(group) }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from "axios";

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
    };
  },
  computed: {
    filteredGroups() {
      if (!this.allGroups) return [];
      let groupsToShow = [...this.allGroups]; // Create a new array to avoid mutating the original

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
      }
      return groupsToShow.sort((a, b) => a.name.localeCompare(b.name));
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
      if (
        group.members &&
        this.currentUser &&
        group.members.includes(this.currentUser.id)
      ) {
        return true;
      }
      const appStatus = this.getApplicationStatusForGroup(group._id);
      if (appStatus === "approved") {
        // If an application is approved, they are effectively a member
        return true;
      }
      return false;
    },
    getApplicationStatusForGroup(groupId) {
      const app = this.userApplications.find((a) => a.groupId === groupId);
      return app ? app.status : null;
    },
    getButtonText(group) {
      if (this.isMemberOfGroup(group)) {
        return "Jūs esat Dalībnieks";
      }
      const status = this.getApplicationStatusForGroup(group._id);
      if (status === "pending") {
        return "Pieteikums Gaida";
      }
      if (status === "rejected") {
        return "Pieteikties Atkārtoti"; // Changed text
      }
      return "Pieteikties";
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
      if (this.isMemberOfGroup(group)) return true;
      const status = this.getApplicationStatusForGroup(group._id);
      // Disable if pending. 'approved' is covered by isMemberOfGroup.
      // If rejected, button should be enabled.
      return status === "pending" || this.isApplying;
    },
    async applyToGroup(groupId) {
      this.isApplying = true;
      this.errorMessage = "";
      try {
        const response = await axios.post(`/api/groups/${groupId}/apply`);
        alert(response.data.msg);

        // Refresh applications and potentially all groups
        // Using fetchData will refresh both and re-evaluate computed properties
        await this.fetchData();
      } catch (error) {
        alert(error.response?.data?.msg || "Kļūda piesakoties grupai.");
        console.error("Error applying to group:", error);
      } finally {
        this.isApplying = false;
      }
    },
  },
  created() {
    this.fetchData();
  },
};
</script>

<style scoped>
/* Styles from previous step, with additions for application status and new filter */
.group-list-view {
  max-width: 900px;
}
.loading-message,
.empty-list-message {
  text-align: center;
  padding: 20px;
  color: #555;
}
.groups-container {
  margin-top: 20px;
}
.list-item.group-item {
  background-color: #fff;
  border: 1px solid #e0e0e0;
  border-left: 5px solid #1abc9c;
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
.application-status {
  font-size: 0.9em;
  margin-top: 5px;
  padding: 5px 8px;
  border-radius: 4px;
  background-color: #e9ecef;
  border: 1px solid #ced4da;
  display: inline-block;
}
.item-actions {
  margin-top: 15px;
  padding-top: 10px;
  border-top: 1px solid #f0f0f0;
  text-align: right;
}
.action-button-small {
  padding: 6px 12px;
  font-size: 0.85em;
  border-radius: 4px;
  cursor: pointer;
  border: none;
  color: white;
  background-color: #3498db;
}
.action-button-small:hover:not([disabled]) {
  background-color: #2980b9;
}
.action-button-small[disabled] {
  background-color: #bdc3c7;
  cursor: not-allowed;
  opacity: 0.7;
}

.filters.group-filters {
  display: flex;
  gap: 20px;
  padding: 15px;
  background-color: #f9f9f9;
  border-radius: 6px;
  margin-bottom: 20px;
}
.filters.group-filters .form-group {
  margin-bottom: 0;
  flex-grow: 1;
}
.filters.group-filters .form-group label {
  margin-bottom: 5px;
}
.filters.group-filters .form-group select {
  width: 100%;
}
</style>
