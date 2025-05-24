<!-- kaskurka/src/views/GroupListView.vue -->
<template>
  <div class="group-list-view form-view"> 
    <button @click="goBackToDashboard" class="back-button" :disabled="isLoading || isApplying">
      ← Atpakaļ uz Paneli
    </button>
    <h2>Pieejamās Grupas</h2>

    <div class="filters group-filters">
      <div class="form-group">
        <label for="membershipFilter">Rādīt grupas:</label>
        <select id="membershipFilter" v-model="membershipFilter" :disabled="isLoading || isApplying">
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
      <p>Pēc jūsu izvēlētajiem kritērijiem netika atrastas grupas, vai arī saraksts ir tukšs.</p>
    </div>
    <div v-else class="groups-container">
      <div v-for="group in filteredGroups" :key="group._id" class="list-item group-item">
        <div class="item-header">
          <h3>{{ group.name }}</h3>
          <p v-if="group.studyYear" class="group-study-year">Mācību gads: {{ group.studyYear }}</p>
        </div>
        <div class="item-content">
          <p v-if="group.description" class="group-description">{{ group.description }}</p>
          <p v-else class="group-description italic">Apraksts nav pieejams.</p>
          <small>Izveidota: {{ formatDate(group.createdAt) }}</small>
           <p v-if="getApplicationStatusForGroup(group._id) && !isMemberOfGroup(group)" class="application-status">
                Jūsu pieteikuma statuss: <strong>{{ getStatusText(getApplicationStatusForGroup(group._id)) }}</strong>
            </p>
        </div>
        <div class="item-actions">
            <button 
                class="action-button-small" 
                @click="applyToGroup(group._id)"
                :disabled="isApplying || isButtonDisabled(group)"
                >
                {{ getButtonText(group) }}
            </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: "GroupListView",
  props: {
    currentUser: Object, 
  },
  data() {
    return {
      allGroups: [], // Stores all fetched groups
      userApplications: [], // Stores array of user's application objects {groupId, status, ...}
      isLoading: true,
      isApplying: false, 
      errorMessage: "",
      membershipFilter: "all", // 'all', 'joined', 'available'
    };
  },
  computed: {
    filteredGroups() {
      if (!this.allGroups) return [];
      let groupsToShow = this.allGroups;

      if (this.membershipFilter === 'joined') {
        groupsToShow = this.allGroups.filter(group => this.isMemberOfGroup(group));
      } else if (this.membershipFilter === 'available') {
        groupsToShow = this.allGroups.filter(group => {
          const isMember = this.isMemberOfGroup(group);
          const appStatus = this.getApplicationStatusForGroup(group._id);
          // Available if not a member AND (no application OR application was rejected)
          return !isMember && (!appStatus || appStatus === 'rejected');
        });
      }
      // For 'all', no further filtering based on membership is needed here.
      // Sorting can be added here if needed, e.g., by group name
      return groupsToShow.sort((a, b) => a.name.localeCompare(b.name));
    }
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
          axios.get('/api/groups'),
          axios.get('/api/groups/applications/my') 
        ]);
        this.allGroups = groupsRes.data;
        this.userApplications = applicationsRes.data; 
      } catch (error) {
        console.error("Error fetching group data:", error);
        this.errorMessage = error.response?.data?.msg || "Kļūda ielādējot grupu datus.";
      } finally {
        this.isLoading = false;
      }
    },
    formatDate(dateString) {
      if (!dateString) return 'N/A';
      const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
      try {
        return new Date(dateString).toLocaleDateString('lv-LV', options);
      } catch (e) { return dateString; }
    },
    isMemberOfGroup(group) {
        // Check 1: User's own enrolled groups list (comes from App.vue's currentUser prop)
        // This list is updated on login.
        if (this.currentUser && this.currentUser.enrolledCustomGroups && this.currentUser.enrolledCustomGroups.includes(group._id)) {
            return true;
        }
        // Check 2: Group's member list (comes from the fetched group data)
        // This check will reflect changes if group data is re-fetched after approval by an admin.
        if (group.members && this.currentUser && group.members.includes(this.currentUser.id)) { // Use currentUser.id which should be the string version of _id
             return true;
        }
        // Check 3: If an application for this group is 'approved'
        // This handles the case where group.members might not be immediately up-to-date on the student's side
        // if only application status was refreshed.
        const appStatus = this.getApplicationStatusForGroup(group._id);
        if (appStatus === 'approved') {
            return true;
        }
        return false;
    },
    getApplicationStatusForGroup(groupId) {
        const app = this.userApplications.find(a => a.groupId === groupId);
        return app ? app.status : null;
    },
    getButtonText(group) {
        if (this.isMemberOfGroup(group)) return "Jūs esat Dalībnieks";
        
        const status = this.getApplicationStatusForGroup(group._id);
        if (status === 'pending') return "Pieteikums Gaida";
        // 'approved' status is handled by isMemberOfGroup now
        if (status === 'rejected') return "Pieteikums Noraidīts";
        return "Pieteikties"; // Corrected from "Pievienoties"
    },
    getStatusText(statusKey) {
        const map = {
            'pending': 'Gaida apstiprinājumu',
            'approved': 'Apstiprināts',
            'rejected': 'Noraidīts'
        };
        return map[statusKey] || statusKey;
    },
    isButtonDisabled(group) {
        if (this.isMemberOfGroup(group)) return true;
        const status = this.getApplicationStatusForGroup(group._id);
        // Disable if pending or (already approved - though isMemberOfGroup should catch this)
        return status === 'pending' || status === 'approved' || this.isApplying;
    },
    async applyToGroup(groupId) {
      this.isApplying = true;
      this.errorMessage = ""; 
      try {
        const response = await axios.post(`/api/groups/${groupId}/apply`);
        alert(response.data.msg); 
        // Refresh application statuses after applying
        const applicationsRes = await axios.get('/api/groups/applications/my');
        this.userApplications = applicationsRes.data;
        // Optionally, also refresh allGroups if backend might have updated something on the group itself
        // await this.fetchData(); // This re-fetches both groups and applications
      } catch (error) {
        alert(error.response?.data?.msg || "Kļūda piesakoties grupai.");
        console.error("Error applying to group:", error);
      } finally {
        this.isApplying = false;
      }
    }
  },
  created() {
    this.fetchData();
  },
};
</script>

<style scoped>
/* Styles from previous step, with additions for application status and new filter */
.group-list-view { max-width: 900px; }
.loading-message, .empty-list-message { text-align: center; padding: 20px; color: #555; }
.groups-container { margin-top: 20px; }
.list-item.group-item { background-color: #fff; border: 1px solid #e0e0e0; border-left: 5px solid #1abc9c; border-radius: 6px; margin-bottom: 15px; padding: 15px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
.item-header h3 { margin: 0 0 5px 0; color: #2c3e50; font-size: 1.3em; }
.group-study-year { font-size: 0.9em; color: #7f8c8d; margin-bottom: 10px; }
.group-description { font-size: 0.95em; color: #333; margin-bottom:10px; }
.group-description.italic { font-style: italic; color: #777; }
.application-status {
    font-size: 0.9em;
    margin-top: 5px;
    padding: 5px 8px;
    border-radius: 4px;
    background-color: #e9ecef; /* Light grey background for status */
    border: 1px solid #ced4da; /* Border for status */
    display: inline-block; 
}
.item-actions { margin-top: 15px; padding-top: 10px; border-top: 1px solid #f0f0f0; text-align: right; }
.action-button-small { padding: 6px 12px; font-size: 0.85em; border-radius: 4px; cursor: pointer; border: none; color: white; background-color: #3498db;}
.action-button-small:hover:not([disabled]) { background-color: #2980b9; }
.action-button-small[disabled] { background-color: #bdc3c7; cursor: not-allowed; opacity: 0.7;}

.filters.group-filters { /* Specific styling for group filters if needed */
  display: flex;
  gap: 20px; /* Space between filter elements */
  padding: 15px;
  background-color: #f9f9f9;
  border-radius: 6px;
  margin-bottom: 20px;
}
.filters.group-filters .form-group {
  margin-bottom: 0; /* Remove default bottom margin from global form-group style */
  flex-grow: 1; /* Allow filter elements to grow */
}
.filters.group-filters .form-group label {
  margin-bottom: 5px; /* Smaller margin for filter labels */
}
.filters.group-filters .form-group select {
  width: 100%; /* Make select take full width of its container */
}
</style>