<template>
  <div id="app-container">
    <header
      class="app-header"
      :class="{
        'dashboard-header-active':
          isDashboardRelatedView(currentView) && currentUser,
      }"
    >
      <div class="header-content">
        <div class="logo-title-container">
          <i class="fas fa-tasks logo-icon"></i>
          <h1>KasKurKa</h1>
        </div>
        <div class="header-user-info">
          <router-link
            v-if="currentUser && !isMyProfileView(currentView)"
            to="#"
            @click.prevent="navigateToMyProfile"
            class="header-link profile-link"
          >
            <i class="fas fa-user-circle"></i> Mans Profils
          </router-link>
          <router-link
            v-if="
              currentUser &&
              currentUser.role === 'admin' &&
              !isAdminSpecificView(currentView) &&
              !isMyProfileView(currentView)
            "
            to="#"
            @click.prevent="navigateToAdminDashboard"
            class="header-link admin-panel-link"
          >
            <i class="fas fa-shield-alt"></i> Admin Panelis
          </router-link>
          <div v-if="currentUser" class="user-greeting">
            <i class="fas fa-hand-sparkles"></i> Sveiki,
            {{ currentUser.firstName }}!
            <span
              v-if="
                currentUser.role === 'student' &&
                currentUser.enrolledCustomGroupsDetails &&
                currentUser.enrolledCustomGroupsDetails.length > 0
              "
              class="user-group-display"
            >
              (Grupas:
              {{
                currentUser.enrolledCustomGroupsDetails
                  .map((g) => g.name)
                  .join(", ")
              }})
            </span>
            <span
              v-else-if="currentUser.role === 'student'"
              class="user-group-display"
            >
              ({{ currentUser.group }})
            </span>
            <span v-else class="user-group-display">
              ({{ currentUser.group }})
            </span>
          </div>
        </div>
      </div>
    </header>

    <main class="app-main">
      <template v-if="currentView === 'home' && !currentUser">
        <div class="home-container">
          <section class="intro-section card-style">
            <h2 class="intro-title">Esiet Sveicināti KasKurKa!</h2>
            <p>
              Jūsu jaunais palīgs mācību dzīvē! Sekojiet līdzi mājasdarbiem,
              pārbaudes darbiem un kursa aktualitātēm vienuviet. Platforma ir
              īpaši noderīga, ja informācija par uzdevumiem tiek dota mutiski
              vai ir izkaisīta dažādās vietās. Pievienojiet jaunus ierakstus,
              dalieties ar informāciju un pārliecinieties, ka nekas svarīgs nav
              palaists garām!
            </p>
          </section>
          <nav class="actions-nav">
            <button
              class="action-button primary-button"
              @click="navigateToLogin"
            >
              <i class="fas fa-sign-in-alt"></i> Pieslēgties
            </button>
            <button
              class="action-button secondary-button"
              @click="navigateToRegister"
            >
              <i class="fas fa-user-plus"></i> Reģistrēties
            </button>
          </nav>
        </div>
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

      <div v-else-if="isLoadingAuth" class="loading-indicator">
        <i class="fas fa-spinner fa-spin"></i> Notiek ielāde...
      </div>
      <div v-else></div>
      <!-- Fallback empty div -->
    </main>

    <footer class="app-footer">
      <p>
        © {{ new Date().getFullYear() }} KasKurKa. Izstrādāja Sidnijs Jurčiks.
        Visas tiesības aizsargātas.
      </p>
    </footer>
  </div>
</template>

<script>
// Import statements as before
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
        return;
      }
      try {
        const response = await axios.get("/api/auth/me/refresh");
        const refreshedUser = response.data;
        this.currentUser = refreshedUser;
        localStorage.setItem("user", JSON.stringify(this.currentUser));
        console.log("[App.vue] User state refreshed:", this.currentUser);
      } catch (error) {
        console.error("[App.vue] Error refreshing user state:", error);
        if (
          error.response &&
          (error.response.status === 401 || error.response.status === 403)
        ) {
          this.handleLogout();
          throw new Error("User refresh failed, logged out.");
        }
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
          this.handleLogout();
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
/* Global Styles */
:root {
  --primary-color: #007bff; /* Vibrant Blue */
  --secondary-color: #6c757d; /* Grey */
  --accent-color: #ffc107; /* Yellow Accent */
  --success-color: #28a745; /* Green */
  --danger-color: #dc3545; /* Red */
  --warning-color: #ffc107; /* Yellow */
  --info-color: #17a2b8; /* Teal */

  --text-color: #343a40; /* Darker Grey for text */
  --text-color-light: #f8f9fa; /* Light text for dark backgrounds */
  --link-color: #007bff;
  --link-hover-color: #0056b3;

  --bg-color: #f0f2f5; /* Light Grey page background */
  --card-bg-color: #ffffff; /* White for cards/forms */
  --header-bg-color: #273444; /* Dark Blue-Grey for header */
  --footer-bg-color: #212a36; /* Slightly darker for footer */

  --border-color: #dee2e6; /* Light Grey for borders */
  --border-radius: 0.3rem; /* Softer border radius */

  --font-family-sans-serif: "Inter", -apple-system, BlinkMacSystemFont,
    "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  --font-size-base: 1rem;
  --line-height-base: 1.6;

  --shadow-sm: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
  --shadow-md: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
  --shadow-lg: 0 1rem 3rem rgba(0, 0, 0, 0.175);
}

body {
  font-family: var(--font-family-sans-serif);
  margin: 0;
  padding: 0;
  background-color: var(--bg-color);
  color: var(--text-color);
  line-height: var(--line-height-base);
  font-size: var(--font-size-base);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

/* Header Styles */
.app-header {
  background-color: var(--header-bg-color);
  color: var(--text-color-light);
  padding: 1rem 1.5rem;
  box-shadow: var(--shadow-md);
  z-index: 1000; /* Keep header on top */
}
.app-header .header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  max-width: 1200px;
  margin: 0 auto;
}
.app-header .logo-title-container {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.app-header .logo-icon {
  font-size: 2rem;
  color: var(--accent-color);
}
.app-header h1 {
  margin: 0;
  font-size: 1.75rem; /* Adjusted size */
  font-weight: 700;
  letter-spacing: -0.5px;
}
.app-header .header-user-info {
  display: flex;
  align-items: center;
  gap: 1rem; /* Consistent gap */
  flex-wrap: wrap;
}
.app-header .header-link {
  color: #e0e0e0; /* Lighter for better contrast on dark header */
  text-decoration: none;
  font-weight: 500;
  padding: 0.5rem 0.75rem;
  border-radius: var(--border-radius);
  transition: background-color 0.2s ease, color 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.app-header .header-link:hover {
  background-color: rgba(255, 255, 255, 0.1);
  color: var(--text-color-light);
}
.app-header .profile-link {
  color: var(--accent-color);
}
.app-header .profile-link:hover {
  color: #fff;
  background-color: var(--accent-color);
}
.app-header .admin-panel-link {
  color: var(--info-color);
}
.app-header .admin-panel-link:hover {
  color: #fff;
  background-color: var(--info-color);
}

.app-header .user-greeting {
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.app-header .user-greeting .user-group-display {
  font-size: 0.85rem;
  opacity: 0.8;
  margin-left: 0.25rem;
}

/* Main Content Styles */
.app-main {
  flex-grow: 1;
  padding: 1.5rem;
  margin: 0 auto;
  width: 100%;
  max-width: 1200px; /* Consistent max width */
  box-sizing: border-box;
}
.home-container {
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
}
.card-style {
  /* General card styling for intro section, etc. */
  background-color: var(--card-bg-color);
  border-radius: var(--border-radius);
  box-shadow: var(--shadow-sm);
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}
.intro-section {
  /* Inherits from card-style */
  text-align: left;
}
.intro-section .intro-title {
  font-size: 1.75rem;
  color: var(--header-bg-color); /* Use a darker color for titles */
  margin-bottom: 1rem;
  text-align: center;
}
.intro-section p {
  font-size: 1.05rem;
  color: #555;
  line-height: 1.7;
  margin-bottom: 1rem;
}

.actions-nav {
  display: flex;
  justify-content: center;
  gap: 1rem;
  flex-wrap: wrap;
  margin-top: 1.5rem;
}

/* Button Styles */
.action-button {
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: var(--border-radius);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s ease, box-shadow 0.2s ease,
    transform 0.1s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
  white-space: nowrap;
}
.action-button:hover:not([disabled]) {
  box-shadow: var(--shadow-sm);
}
.action-button:active:not([disabled]) {
  transform: translateY(1px);
}
.action-button.primary-button {
  background-color: var(--primary-color);
  color: var(--text-color-light);
}
.action-button.primary-button:hover:not([disabled]) {
  background-color: #0069d9; /* Darker primary */
}
.action-button.secondary-button {
  background-color: var(--secondary-color);
  color: var(--text-color-light);
}
.action-button.secondary-button:hover:not([disabled]) {
  background-color: #5a6268; /* Darker secondary */
}
.action-button[disabled] {
  background-color: #e9ecef;
  color: #6c757d;
  cursor: not-allowed;
  opacity: 0.7;
}

/* Form Styles */
.form-view {
  max-width: 650px; /* Slightly wider forms */
  margin: 1rem auto; /* Consistent margin */
  padding: 2rem; /* More padding */
  background-color: var(--card-bg-color);
  border-radius: var(--border-radius);
  box-shadow: var(--shadow-md);
  text-align: left;
  width: 100%;
  box-sizing: border-box;
}
.form-view h2 {
  text-align: center;
  color: var(--header-bg-color); /* Darker for titles */
  margin-top: 0;
  margin-bottom: 1.5rem; /* More space */
  font-size: 1.75rem;
  font-weight: 600;
}
.form-group {
  margin-bottom: 1.25rem; /* Consistent spacing */
}
.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: var(--text-color); /* Darker label color */
  font-size: 0.95rem;
}
.form-group input[type="text"],
.form-group input[type="email"],
.form-group input[type="password"],
.form-group input[type="number"],
.form-group input[type="date"],
.form-group input[type="time"],
.form-group textarea,
.form-group select {
  width: 100%; /* Full width with box-sizing */
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  font-size: 1rem;
  box-sizing: border-box;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  background-color: #fff; /* Ensure inputs have a background */
}
.form-group input[type="file"] {
  padding: 0.5rem; /* Adjusted padding for file input */
}
.form-group textarea {
  min-height: 120px;
  resize: vertical;
}
.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  border-color: var(--primary-color);
  outline: none;
  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
}
.form-group small {
  display: block;
  margin-top: 0.3rem;
  font-size: 0.85rem;
  color: #6c757d; /* Lighter grey for help text */
}
.required-field {
  color: var(--danger-color);
  margin-left: 2px;
}

/* Message Styles */
.error-message,
.success-message {
  padding: 0.8rem 1rem;
  border-radius: var(--border-radius);
  margin-bottom: 1rem;
  text-align: center;
  font-weight: 500;
}
.error-message {
  color: #721c24; /* Darker red text */
  background-color: #f8d7da; /* Lighter red background */
  border: 1px solid #f5c6cb; /* Reddish border */
}
.success-message {
  color: #155724; /* Darker green text */
  background-color: #d4edda; /* Lighter green background */
  border: 1px solid #c3e6cb; /* Greenish border */
}

/* Back Button & Form Actions */
.back-button {
  background: none;
  border: none;
  color: var(--link-color);
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  padding: 0.25rem 0;
  margin-bottom: 1rem;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}
.back-button:hover {
  color: var(--link-hover-color);
  text-decoration: underline;
}
.form-actions {
  display: flex;
  justify-content: space-between; /* Default */
  align-items: center;
  margin-top: 1.5rem;
}
.form-actions .action-button {
  /* Ensure form buttons take priority if specific classes are used */
  /* width: auto; Allow natural sizing */
}

/* Footer Styles */
.app-footer {
  background-color: var(--footer-bg-color);
  color: #adb5bd; /* Lighter grey for footer text */
  padding: 1.5rem 1rem;
  font-size: 0.85rem;
  text-align: center;
  margin-top: auto; /* Push to bottom */
}

/* Loading Indicator */
.loading-indicator {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2rem;
  font-size: 1.2rem;
  color: var(--primary-color);
}
.loading-indicator .fa-spinner {
  margin-right: 0.75rem;
}

/* Responsive Adjustments */
@media (max-width: 768px) {
  .app-header .header-content {
    flex-direction: column;
    gap: 0.75rem;
  }
  .app-header h1 {
    font-size: 1.5rem;
  }
  .app-header .header-user-info {
    flex-direction: column;
    align-items: center;
    width: 100%;
    gap: 0.5rem;
  }
  .app-header .header-link {
    width: 100%;
    justify-content: center;
  }
  .form-view {
    margin: 1rem;
    padding: 1.5rem;
  }
}

@media (max-width: 600px) {
  :root {
    --font-size-base: 0.95rem;
  } /* Slightly smaller base font for small screens */

  .app-header {
    padding: 0.75rem 1rem;
  }
  .app-header .logo-icon {
    font-size: 1.75rem;
  }
  .app-header h1 {
    font-size: 1.4rem;
  }

  .intro-section .intro-title {
    font-size: 1.5rem;
  }
  .intro-section p {
    font-size: 1rem;
  }

  .actions-nav .action-button {
    width: 100%;
    max-width: 320px;
    margin: 0.5rem auto;
  }
  .app-main {
    padding: 1rem;
  }
  .form-view {
    padding: 1.25rem;
  }
  .form-view h2 {
    font-size: 1.5rem;
  }

  .form-actions {
    flex-direction: column;
  }
  .form-actions .action-button {
    width: 100%;
    margin-bottom: 0.75rem;
  }
  .form-actions .action-button.secondary-action, /* E.g. cancel button */
   .form-actions .back-button {
    margin-top: 0.5rem; /* Spacing for secondary actions below primary */
    order: 2; /* Push them below primary action */
  }
  .form-actions .action-button:not(.secondary-action) {
    order: 1; /* Primary action first */
  }
  .form-actions .back-button {
    align-self: center;
  }
}
</style>
