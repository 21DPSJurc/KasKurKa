<template>
  <div id="app-container">
    <header
      class="app-header"
      v-if="!currentUser || !isDashboardRelatedView(currentView)"
    >
      <h1>KasKurKa</h1>
      <div class="header-user-info">
        <router-link
          v-if="currentUser && !isMyProfileView(currentView)"
          to="#"
          @click.prevent="navigateToMyProfile"
          class="profile-link"
          >Mans Profils</router-link
        >
        <router-link
          v-if="
            currentUser &&
            currentUser.role === 'admin' &&
            !isAdminSpecificView(currentView) &&
            !isMyProfileView(currentView)
          "
          to="#"
          @click.prevent="navigateToAdminDashboard"
          class="admin-panel-link"
          >Admin Panelis</router-link
        >
        <div v-if="currentUser" class="user-greeting">
          Sveiki, {{ currentUser.firstName }}!
          <span
            v-if="
              currentUser.role === 'student' &&
              currentUser.enrolledCustomGroupsDetails &&
              currentUser.enrolledCustomGroupsDetails.length > 0
            "
          >
            (Grupas:
            {{
              currentUser.enrolledCustomGroupsDetails
                .map((g) => g.name)
                .join(", ")
            }})
          </span>
          <span v-else-if="currentUser.role === 'student'">
            ({{ currentUser.group }})
            <!-- Student, but no custom groups -->
          </span>
          <span v-else>
            ({{ currentUser.group }})
            <!-- Admin or other roles, display registration group -->
          </span>
        </div>
      </div>
    </header>
    <header
      class="app-header dashboard-app-header"
      v-else-if="currentUser && isDashboardRelatedView(currentView)"
    >
      <h1>KasKurKa</h1>
      <div class="header-user-info">
        <router-link
          v-if="currentUser && !isMyProfileView(currentView)"
          to="#"
          @click.prevent="navigateToMyProfile"
          class="profile-link"
          >Mans Profils</router-link
        >
        <router-link
          v-if="
            currentUser &&
            currentUser.role === 'admin' &&
            !isAdminSpecificView(currentView) &&
            !isMyProfileView(currentView)
          "
          to="#"
          @click.prevent="navigateToAdminDashboard"
          class="admin-panel-link"
          >Admin Panelis</router-link
        >
        <div v-if="currentUser" class="user-greeting">
          Sveiki, {{ currentUser.firstName }}!
          <span
            v-if="
              currentUser.role === 'student' &&
              currentUser.enrolledCustomGroupsDetails &&
              currentUser.enrolledCustomGroupsDetails.length > 0
            "
          >
            (Grupas:
            {{
              currentUser.enrolledCustomGroupsDetails
                .map((g) => g.name)
                .join(", ")
            }})
          </span>
          <span v-else-if="currentUser.role === 'student'">
            ({{ currentUser.group }})
            <!-- Student, but no custom groups -->
          </span>
          <span v-else>
            ({{ currentUser.group }})
            <!-- Admin or other roles, display registration group -->
          </span>
        </div>
      </div>
    </header>

    <main class="app-main">
      <template v-if="currentView === 'home' && !currentUser">
        <section class="intro-section">
          <p>
            Esiet sveicināti "KasKurKa" - sistēmā, kas palīdzēs jums un jūsu
            kursabiedriem sekot līdzi mājasdarbiem un pārbaudes darbiem. Šī
            platforma ir īpaši noderīga, ja informācija par uzdevumiem tiek dota
            mutiski vai ir izkaisīta dažādās vietās. Pievienojiet jaunus
            ierakstus, dalieties ar informāciju un pārliecinieties, ka nekas
            svarīgs nav palaists garām!
          </p>
        </section>
        <nav class="actions-nav">
          <button class="action-button" @click="navigateToLogin">
            Pieslēgties
          </button>
          <button class="action-button" @click="navigateToRegister">
            Reģistrēties
          </button>
        </nav>
      </template>

      <RegisterView
        v-else-if="currentView === 'register'"
        @navigateHome="showHome"
        @registrationSuccess="handleRegistrationSuccess"
      />
      <LoginView
        v-else-if="currentView === 'login'"
        @navigateHome="showHome"
        @navigateToRegister="navigateToRegister"
        @loginSuccess="handleLoginSuccess"
      />
      <MyProfileView
        v-else-if="currentView === 'myProfile' && currentUser"
        :current-user="currentUser"
        @navigateToUserSpecificDashboard="navigateToUserSpecificDashboard"
      />

      <!-- Student Views -->
      <DashboardView
        v-if="
          currentView === 'dashboard' &&
          currentUser &&
          currentUser.role === 'student'
        "
        :currentUser="currentUser"
        @logout="handleLogout"
        @navigateToAddHomework="navigateToAddHomework"
        @navigateToAddTest="navigateToAddTest"
        @navigateToHomeworkList="navigateToHomeworkList"
        @navigateToGroupList="navigateToGroupList"
      />
      <AddHomeworkView
        v-else-if="currentView === 'addHomework' && currentUser"
        :item-id-to-edit="editingItemId"
        :current-user="currentUser"
        @itemActionSuccess="handleItemActionSuccess"
        @navigateToDashboard="navigateToUserSpecificDashboard"
        @cancelEdit="cancelEditItem"
      />
      <AddTestView
        v-else-if="currentView === 'addTest' && currentUser"
        :item-id-to-edit="editingItemId"
        :current-user="currentUser"
        @itemActionSuccess="handleItemActionSuccess"
        @navigateToDashboard="navigateToUserSpecificDashboard"
        @cancelEdit="cancelEditItem"
      />
      <HomeworkListView
        v-else-if="currentView === 'homeworkList' && currentUser"
        :current-user-id="currentUser ? currentUser.id : null"
        @navigateToDashboard="navigateToUserSpecificDashboard"
        @editItem="navigateToEditItem"
        @itemDeleted="handleItemDeletedInList"
      />
      <GroupListView
        v-else-if="currentView === 'groupList' && currentUser"
        :current-user="currentUser"
        @navigateToDashboard="navigateToUserSpecificDashboard"
      />

      <!-- Admin Views -->
      <AdminDashboardView
        v-else-if="
          currentView === 'adminDashboard' &&
          currentUser &&
          currentUser.role === 'admin'
        "
        :currentUser="currentUser"
        @logout="handleLogout"
        @navigateToCreateGroup="navigateToCreateGroup"
        @navigateToStudentDashboard="navigateToStudentDashboard"
        @navigateToManageGroupApplications="navigateToManageGroupApplications"
        @navigateToManageGroups="navigateToManageGroups"
        @navigateToManageUsers="navigateToManageUsers"
      />
      <CreateGroupView
        v-else-if="
          currentView === 'createGroup' &&
          currentUser &&
          currentUser.role === 'admin'
        "
        @groupCreated="handleGroupCreated"
        @navigateToAdminDashboard="navigateToAdminDashboard"
      />
      <ManageGroupApplicationsView
        v-else-if="
          currentView === 'manageGroupApplications' &&
          currentUser &&
          currentUser.role === 'admin'
        "
        @navigateToAdminDashboard="navigateToAdminDashboard"
      />
      <ManageGroupsView
        v-else-if="
          currentView === 'manageGroups' &&
          currentUser &&
          currentUser.role === 'admin'
        "
        @navigateToAdminDashboard="navigateToAdminDashboard"
        @navigateToEditGroup="navigateToEditGroup"
      />
      <EditGroupView
        v-else-if="
          currentView === 'editGroup' &&
          currentUser &&
          currentUser.role === 'admin'
        "
        :group-id-to-edit="editingGroupId"
        @groupUpdateSuccess="handleGroupUpdateSuccess"
        @cancelEditGroup="navigateToManageGroups"
      />
      <ManageUsersView
        v-else-if="
          currentView === 'manageUsers' &&
          currentUser &&
          currentUser.role === 'admin'
        "
        :current-admin-id="currentUser.id"
        @navigateToAdminDashboard="navigateToAdminDashboard"
        @navigateToEditUser="navigateToEditUser"
      />
      <EditUserView
        v-else-if="
          currentView === 'editUser' &&
          currentUser &&
          currentUser.role === 'admin'
        "
        :user-id-to-edit="editingUserId"
        @userUpdateSuccess="handleUserUpdateSuccess"
        @cancelEditUser="navigateToManageUsers"
      />

      <div v-else-if="isLoadingAuth"><p>Notiek ielāde...</p></div>
      <div v-else></div>
      <!-- Fallback empty div -->
    </main>

    <footer class="app-footer">
      <p>
        © {{ new Date().getFullYear() }} KasKurKa. Visas tiesības aizsargātas.
      </p>
    </footer>
  </div>
</template>

<script>
import RegisterView from "./views/RegisterView.vue";
import LoginView from "./views/LoginView.vue";
import DashboardView from "./views/DashboardView.vue";
import AddHomeworkView from "./views/AddHomeworkView.vue";
import AddTestView from "./views/AddTestView.vue";
import HomeworkListView from "./views/HomeworkListView.vue";
import GroupListView from "./views/GroupListView.vue";
import AdminDashboardView from "./views/AdminDashboardView.vue";
import CreateGroupView from "./views/CreateGroupView.vue";
import ManageGroupApplicationsView from "./views/ManageGroupApplicationsView.vue";
import ManageGroupsView from "./views/ManageGroupsView.vue";
import EditGroupView from "./views/EditGroupView.vue";
import ManageUsersView from "./views/ManageUsersView.vue";
import EditUserView from "./views/EditUserView.vue";
import MyProfileView from "./views/MyProfileView.vue";
import axios from "axios";

export default {
  name: "App",
  components: {
    RegisterView,
    LoginView,
    DashboardView,
    AddHomeworkView,
    AddTestView,
    HomeworkListView,
    GroupListView,
    AdminDashboardView,
    CreateGroupView,
    ManageGroupApplicationsView,
    ManageGroupsView,
    EditGroupView,
    ManageUsersView,
    EditUserView,
    MyProfileView,
  },
  data() {
    return {
      currentView: "home",
      currentUser: null,
      isLoadingAuth: true,
      dashboardRelatedViews: [
        "dashboard",
        "addHomework",
        "addTest",
        "homeworkList",
        "groupList",
        "adminDashboard",
        "createGroup",
        "manageGroupApplications",
        "manageGroups",
        "editGroup",
        "manageUsers",
        "editUser",
        "myProfile",
      ],
      adminSpecificViews: [
        "adminDashboard",
        "createGroup",
        "manageGroupApplications",
        "manageGroups",
        "editGroup",
        "manageUsers",
        "editUser",
      ],
      editingItemId: null,
      editingItemType: null,
      editingGroupId: null,
      editingUserId: null,
    };
  },
  provide() {
    return {
      refreshUser: this.refreshCurrentUserState,
    };
  },
  created() {
    this.tryAutoLogin();
  },
  methods: {
    async refreshCurrentUserState() {
      console.log("[App.vue] Attempting to refresh current user state...");
      if (!this.currentUser || !localStorage.getItem("token")) {
        console.log("[App.vue] No current user or token, skipping refresh.");
        return; // Return a resolved promise or nothing if not async explicitly
      }
      try {
        const response = await axios.get("/api/auth/me/refresh");
        const refreshedUser = response.data; // This is the user object

        // Update currentUser state. This will reactively update child components.
        this.currentUser = refreshedUser;
        localStorage.setItem("user", JSON.stringify(this.currentUser));
        console.log("[App.vue] User state refreshed:", this.currentUser);
      } catch (error) {
        console.error("[App.vue] Error refreshing user state:", error);
        if (
          error.response &&
          (error.response.status === 401 || error.response.status === 403)
        ) {
          // Token might be invalid or expired, log out user
          this.handleLogout();
          // Optionally throw error so awaiters in child components can catch it
          throw new Error("User refresh failed, logged out.");
        }
        // Re-throw for the caller to handle if needed
        throw error;
      }
    },
    isDashboardRelatedView(viewName) {
      return this.dashboardRelatedViews.includes(viewName);
    },
    isAdminSpecificView(viewName) {
      return this.adminSpecificViews.includes(viewName);
    },
    isMyProfileView(viewName) {
      return viewName === "myProfile";
    },
    tryAutoLogin() {
      this.isLoadingAuth = true;
      const token = localStorage.getItem("token");
      const userString = localStorage.getItem("user");

      if (token && userString) {
        try {
          const user = JSON.parse(userString);
          this.currentUser = user;
          axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

          if (
            this.currentView === "home" ||
            this.currentView === "login" ||
            this.currentView === "register"
          ) {
            if (this.currentUser.role === "admin") {
              this.currentView = "adminDashboard";
            } else {
              this.currentView = "dashboard";
            }
          }
        } catch (e) {
          console.error("Auto-login error, clearing stored data:", e);
          this.handleLogout(); // Clears stale data
        }
      } else {
        if (
          this.dashboardRelatedViews.includes(this.currentView) ||
          this.adminSpecificViews.includes(this.currentView) ||
          this.currentView === "myProfile"
        ) {
          this.currentView = "home";
        } else if (!this.currentView) {
          this.currentView = "home";
        }
      }
      this.isLoadingAuth = false;
    },
    navigateToLogin() {
      this.currentView = "login";
      this.clearAllEditStates();
    },
    navigateToRegister() {
      this.currentView = "register";
      this.clearAllEditStates();
    },
    showHome() {
      this.currentView = "home";
      this.clearAllEditStates();
    },
    navigateToMyProfile() {
      if (this.currentUser) {
        this.currentView = "myProfile";
      } else {
        this.navigateToLogin();
      }
      this.clearAllEditStates();
    },
    navigateToUserSpecificDashboard() {
      if (this.currentUser) {
        this.currentView =
          this.currentUser.role === "admin" ? "adminDashboard" : "dashboard";
      } else {
        this.navigateToLogin();
      }
      this.clearAllEditStates();
    },
    navigateToStudentDashboard() {
      if (this.currentUser) {
        this.currentView = "dashboard";
      } else {
        this.navigateToLogin();
      }
      this.clearAllEditStates();
    },
    handleRegistrationSuccess() {
      this.currentView = "login";
      alert("Reģistrācija veiksmīga! Lūdzu, pieslēdzieties.");
      this.clearAllEditStates();
    },
    handleLoginSuccess(authData) {
      this.currentUser = authData.user;
      localStorage.setItem("token", authData.token);
      localStorage.setItem("user", JSON.stringify(authData.user));
      axios.defaults.headers.common[
        "Authorization"
      ] = `Bearer ${authData.token}`;
      this.navigateToUserSpecificDashboard();
    },
    handleLogout() {
      this.currentUser = null;
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      delete axios.defaults.headers.common["Authorization"];
      this.currentView = "home";
      alert("Jūs esat veiksmīgi izgājis no sistēmas.");
      this.clearAllEditStates();
    },
    navigateToAddHomework() {
      if (this.currentUser) {
        this.clearAllEditStates();
        this.currentView = "addHomework";
      } else this.navigateToLogin();
    },
    navigateToAddTest() {
      if (this.currentUser) {
        this.clearAllEditStates();
        this.currentView = "addTest";
      } else this.navigateToLogin();
    },
    navigateToEditItem({ itemId, itemType }) {
      if (this.currentUser) {
        this.clearAllEditStates();
        this.editingItemId = itemId;
        this.editingItemType = itemType;
        this.currentView = itemType === "homework" ? "addHomework" : "addTest";
      } else {
        this.navigateToLogin();
      }
    },
    cancelEditItem() {
      this.clearAllEditStates();
      this.navigateToHomeworkList();
    },
    handleItemActionSuccess(message) {
      alert(message || "Darbība veiksmīga!");
      this.clearAllEditStates();
      this.navigateToHomeworkList();
    },
    navigateToHomeworkList() {
      if (this.currentUser) {
        this.currentView = "homeworkList";
        this.clearAllEditStates();
      } else {
        this.navigateToLogin();
      }
    },
    handleItemDeletedInList(message) {
      alert(message || "Ieraksts dzēsts.");
    },
    navigateToGroupList() {
      if (this.currentUser) {
        this.currentView = "groupList";
        this.clearAllEditStates();
      } else {
        this.navigateToLogin();
      }
    },
    navigateToAdminDashboard() {
      if (this.currentUser && this.currentUser.role === "admin") {
        this.currentView = "adminDashboard";
      } else {
        this.showHome();
      }
      this.clearAllEditStates();
    },
    navigateToCreateGroup() {
      if (this.currentUser && this.currentUser.role === "admin") {
        this.currentView = "createGroup";
      } else {
        this.navigateToLogin();
      }
      this.clearAllEditStates();
    },
    handleGroupCreated(message) {
      alert(message || "Grupa veiksmīgi izveidota!");
      this.navigateToAdminDashboard();
    },
    navigateToManageGroupApplications() {
      if (this.currentUser && this.currentUser.role === "admin") {
        this.currentView = "manageGroupApplications";
      } else {
        this.navigateToLogin();
      }
      this.clearAllEditStates();
    },
    navigateToManageGroups() {
      if (this.currentUser && this.currentUser.role === "admin") {
        this.currentView = "manageGroups";
      } else {
        this.navigateToLogin();
      }
      this.clearAllEditStates();
    },
    navigateToEditGroup(groupId) {
      if (this.currentUser && this.currentUser.role === "admin") {
        this.clearAllEditStates();
        this.editingGroupId = groupId;
        this.currentView = "editGroup";
      } else {
        this.navigateToLogin();
      }
    },
    handleGroupUpdateSuccess(message) {
      alert(message || "Grupa veiksmīgi atjaunināta!");
      this.navigateToManageGroups();
    },
    navigateToManageUsers() {
      if (this.currentUser && this.currentUser.role === "admin") {
        this.currentView = "manageUsers";
      } else {
        this.navigateToLogin();
      }
      this.clearAllEditStates();
    },
    navigateToEditUser(userId) {
      if (this.currentUser && this.currentUser.role === "admin") {
        this.clearAllEditStates();
        this.editingUserId = userId;
        this.currentView = "editUser";
      } else {
        this.navigateToLogin();
      }
    },
    handleUserUpdateSuccess(message) {
      alert(message || "Lietotāja dati veiksmīgi atjaunināti!");
      this.navigateToManageUsers();
    },
    clearAllEditStates() {
      this.editingItemId = null;
      this.editingItemType = null;
      this.editingGroupId = null;
      this.editingUserId = null;
    },
  },
};
</script>

<style>
/* Styles as before */
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica,
    Arial, sans-serif;
  margin: 0;
  padding: 0;
  background-color: #f4f4f4;
  color: #333;
  line-height: 1.6;
}
#app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  text-align: center;
}
.app-header {
  background-color: #2c3e50;
  color: #ecf0f1;
  padding: 20px 0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-around; /* Changed to space-around for better link spacing */
  align-items: center;
  flex-wrap: wrap; /* Allow wrapping for smaller screens */
}
.app-header h1 {
  margin: 0;
  font-size: 2.5em;
  text-align: center;
  /* flex-grow: 1; Removed to allow natural sizing with more links */
}
.header-user-info {
  display: flex;
  align-items: center;
  gap: 15px; /* Add gap between items */
  margin-right: 20px; /* Keep margin for overall spacing */
}
.user-greeting {
  font-size: 1em;
  /* margin-left: 15px; Removed, using gap now */
}
.admin-panel-link,
.profile-link {
  /* Added profile-link */
  color: #f1c40f;
  text-decoration: none;
  font-weight: bold;
  /* margin-left: 15px; Removed, using gap now */
}
.admin-panel-link:hover,
.profile-link:hover {
  text-decoration: underline;
}
.app-main {
  flex-grow: 1;
  padding: 20px;
  margin: 0 auto;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.app-main > .intro-section {
  max-width: 800px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.05);
  padding: 20px;
  width: 100%;
}
.intro-section p {
  font-size: 1.1em;
  color: #555;
  margin-bottom: 30px;
  padding: 0 15px;
  text-align: left;
}
.actions-nav {
  margin-top: 20px;
  max-width: 800px;
  width: 100%;
}
.action-button {
  background-color: #3498db;
  color: white;
  border: none;
  padding: 12px 25px;
  margin: 5px 10px;
  border-radius: 5px;
  font-size: 1em;
  cursor: pointer;
  transition: background-color 0.3s ease;
}
.action-button:hover {
  background-color: #2980b9;
}
.action-button:active {
  background-color: #2471a3;
}
.action-button[disabled] {
  background-color: #bdc3c7;
  cursor: not-allowed;
}
.action-button[disabled]:hover {
  background-color: #bdc3c7;
}
.app-footer {
  background-color: #34495e;
  color: #bdc3c7;
  padding: 15px 0;
  font-size: 0.9em;
  margin-top: auto;
}
.form-view {
  max-width: 600px;
  margin: 20px auto;
  padding: 25px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
  text-align: left;
  width: 100%;
}
.form-view h2 {
  text-align: center;
  color: #2c3e50;
  margin-bottom: 25px;
}
.form-group {
  margin-bottom: 20px;
}
.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: bold;
  color: #34495e;
}
.form-group input[type="text"],
.form-group input[type="email"],
.form-group input[type="password"],
.form-group input[type="number"],
.form-group input[type="date"],
.form-group input[type="time"],
.form-group textarea,
.form-group select {
  width: calc(100% - 24px);
  padding: 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 1em;
  box-sizing: border-box;
}
.form-group input[type="file"] {
  width: calc(100% - 24px);
  padding: 8px;
}
.form-group textarea {
  min-height: 100px;
  resize: vertical;
}
.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  border-color: #3498db;
  outline: none;
  box-shadow: 0 0 0 0.2rem rgba(52, 152, 219, 0.25);
}
.form-group small {
  display: block;
  margin-top: 5px;
  font-size: 0.85em;
  color: #7f8c8d;
}
.error-message {
  color: #e74c3c;
  background-color: #fdd;
  border: 1px solid #e74c3c;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 15px;
  text-align: center;
}
.success-message {
  color: #2ecc71;
  background-color: #e6ffed;
  border: 1px solid #2ecc71;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 15px;
  text-align: center;
}
.back-button {
  background: none;
  border: none;
  color: #3498db;
  font-size: 1em;
  cursor: pointer;
  padding: 5px 0;
  margin-bottom: 15px;
  display: inline-block;
}
.back-button:hover {
  text-decoration: underline;
}
.form-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20px;
}
.required-field {
  color: #e74c3c;
  margin-left: 2px;
}
@media (max-width: 768px) {
  .app-header {
    flex-direction: column;
    gap: 10px; /* Spacing for wrapped items */
  }
  .app-header h1 {
    margin-bottom: 10px;
  }
  .header-user-info {
    flex-direction: column;
    align-items: center;
    margin-right: 0;
    gap: 10px;
  }
  .user-greeting,
  .admin-panel-link,
  .profile-link {
    /* Ensure these stack nicely */
    margin: 0; /* Reset individual margins */
  }
  .form-view {
    margin: 20px 10px;
    padding: 20px;
  }
}
@media (max-width: 600px) {
  .app-header h1 {
    font-size: 2em;
  }
  .intro-section p {
    font-size: 1em;
  }
  .app-main > .intro-section {
    margin: 10px;
    padding: 15px;
  }
  .action-button {
    padding: 10px 15px;
    font-size: 0.9em;
    display: block;
    width: calc(100% - 20px);
    max-width: 300px;
    margin: 10px auto;
  }
  .app-main {
    padding: 10px;
  }
  .form-group input[type="text"],
  .form-group input[type="email"],
  .form-group input[type="password"],
  .form-group input[type="number"],
  .form-group input[type="date"],
  .form-group input[type="time"],
  .form-group textarea,
  .form-group select {
    font-size: 0.95em;
  }
  .form-actions {
    flex-direction: column-reverse;
  }
  .form-actions .action-button {
    width: 100%;
    margin-bottom: 10px;
  }
  .form-actions .back-button {
    margin-bottom: 15px;
    align-self: flex-start;
  }
}
</style>
