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
          <!-- Paziņojumu zvans -->
          <div
            v-if="currentUser"
            class="notification-bell-container"
            @click.stop="toggleNotificationsDropdown"
          >
            <i class="fas fa-bell notification-icon"></i>
            <span v-if="unreadNotificationCount > 0" class="notification-badge">
              {{ unreadNotificationCount > 9 ? "9+" : unreadNotificationCount }}
            </span>
            <NotificationDropdown
              v-if="showNotificationsDropdown"
              :notifications="recentNotifications"
              :unread-count="unreadNotificationCount"
              @mark-as-read="markNotificationAsRead"
              @mark-all-as-read="markAllNotificationsAsRead"
              @view-all-notifications="navigateToNotificationList"
              @close-dropdown="closeNotificationsDropdown"
            />
          </div>

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
              !isMyProfileView(currentView) &&
              !isAdminViewingAsStudent
            "
            to="#"
            @click.prevent="navigateToAdminDashboard"
            class="header-link admin-panel-link"
          >
            <i class="fas fa-shield-alt"></i> Admin Panelis
          </router-link>

          <button
            v-if="
              currentUser &&
              currentUser.role === 'admin' &&
              isAdminViewingAsStudent
            "
            @click="returnToAdminView"
            class="header-link return-to-admin-link action-button"
          >
            <i class="fas fa-user-shield"></i> Atgriezties Admin Panelī
          </button>

          <div v-if="currentUser" class="user-greeting">
            <i class="fas fa-hand-sparkles"></i> Sveiki,
            {{ currentUser.firstName }}!
            <span
              v-if="
                currentUser.role === 'student' &&
                !isAdminViewingAsStudent &&
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
              v-else-if="
                currentUser.role === 'student' && !isAdminViewingAsStudent
              "
              class="user-group-display"
            >
              ({{ currentUser.group }})
            </span>
            <span
              v-else-if="
                currentUser.role === 'admin' && isAdminViewingAsStudent
              "
              class="user-group-display viewing-as-student-indicator"
              title="Jūs pašlaik redzat studentu paneli ar administratora datu piekļuvi."
            >
              (Skatās kā Students)
            </span>
            <span v-else class="user-group-display">
              ({{ currentUser.group }})
            </span>
          </div>
        </div>
      </div>
    </header>

    <main class="app-main">
      <!-- Sākuma skats nelietotājam -->
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

      <!-- Reģistrācijas skats -->
      <RegisterView
        v-else-if="currentView === 'register'"
        @navigateHome="showHome"
        @registrationSuccess="handleRegistrationSuccess"
      />
      <!-- Pieslēgšanās skats -->
      <LoginView
        v-else-if="currentView === 'login'"
        @navigateHome="showHome"
        @navigateToRegister="navigateToRegister"
        @loginSuccess="handleLoginSuccess"
      />
      <!-- Mana Profila skats -->
      <MyProfileView
        v-else-if="currentView === 'myProfile' && currentUser"
        :current-user="currentUser"
        @navigateToUserSpecificDashboard="navigateToUserSpecificDashboard"
      />

      <!-- Studenta skati -->
      <DashboardView
        v-if="
          currentView === 'dashboard' &&
          currentUser &&
          (currentUser.role === 'student' ||
            (currentUser.role === 'admin' && isAdminViewingAsStudent))
        "
        :currentUser="currentUser"
        :is-admin-viewing-as-student="isAdminViewingAsStudent"
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
        :current-user-role="currentUser ? currentUser.role : null"
        @navigateToDashboard="navigateToUserSpecificDashboard"
        @editItem="navigateToEditItem"
        @itemDeleted="handleItemDeletedInList"
      />
      <GroupListView
        v-else-if="currentView === 'groupList' && currentUser"
        :current-user="currentUser"
        @navigateToDashboard="navigateToUserSpecificDashboard"
      />

      <!-- Administratora skati -->
      <AdminDashboardView
        v-else-if="
          currentView === 'adminDashboard' &&
          currentUser &&
          currentUser.role === 'admin' &&
          !isAdminViewingAsStudent
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
      <!-- Paziņojumu saraksta skats -->
      <NotificationListView
        v-else-if="currentView === 'notificationList' && currentUser"
        :current-user="currentUser"
        @navigateToDashboard="navigateToUserSpecificDashboard"
        @notifications-updated="fetchUserNotifications"
      />

      <!-- Ielādes indikators vai tukšs elements -->
      <div v-else-if="isLoadingAuth" class="loading-indicator">
        <i class="fas fa-spinner fa-spin"></i> Notiek ielāde...
      </div>
      <div v-else></div>
    </main>

    <footer class="app-footer">
      <p>
        © {{ new Date().getFullYear() }} KasKurKa. Izstrādāja Sidnijs Jurciks.
      </p>
    </footer>
  </div>
</template>

<script>
// Komponentu importi
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
import NotificationDropdown from "./components/NotificationDropdown.vue"; // Jauns paziņojumu komponents
import NotificationListView from "./views/NotificationListView.vue"; // Jauns paziņojumu saraksta skats

import axios from "axios"; // HTTP pieprasījumiem

export default {
  name: "App",
  components: {
    // Reģistrētie komponenti
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
    NotificationDropdown,
    NotificationListView,
  },
  data() {
    return {
      currentView: "home", // Pašreizējais aktīvais skats
      currentUser: null, // Pašreizējais pieslēgtais lietotājs
      isLoadingAuth: true, // Vai notiek autentifikācijas pārbaude
      isAdminViewingAsStudent: false, // Vai administrators skatās studenta paneli
      dashboardRelatedViews: [
        // Skati, kas saistīti ar informācijas paneli (header stilam)
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
        "notificationList",
      ],
      adminSpecificViews: [
        // Skati, kas pieejami tikai administratoram
        "adminDashboard",
        "createGroup",
        "manageGroupApplications",
        "manageGroups",
        "editGroup",
        "manageUsers",
        "editUser",
      ],
      editingItemId: null, // Rediģējamā mājasdarba/pārbaudes darba ID
      editingItemType: null, // Rediģējamā vienuma tips ('homework' vai 'test')
      editingGroupId: null, // Rediģējamās grupas ID
      editingUserId: null, // Rediģējamā lietotāja ID

      // Ar paziņojumiem saistīti dati
      recentNotifications: [], // Nesenākie paziņojumi nolaižamajam sarakstam
      unreadNotificationCount: 0, // Nelasīto paziņojumu skaits
      showNotificationsDropdown: false, // Vai rādīt paziņojumu nolaižamo sarakstu
      notificationInterval: null, // Intervāls paziņojumu periodiskai ielādei
    };
  },
  provide() {
    // Nodrošina funkcijas bērnu komponentiem
    return {
      refreshUser: this.refreshCurrentUserState, // Funkcija lietotāja stāvokļa atjaunošanai
      fetchUserNotifications: this.fetchUserNotifications, // Funkcija paziņojumu ielādei
    };
  },
  created() {
    // Izpildās, kad komponents tiek izveidots
    this.tryAutoLogin(); // Mēģina automātiski pieslēgt lietotāju
    document.addEventListener("click", this.handleClickOutsideDropdown); // Pievieno notikumu klausītāju nolaižamā saraksta aizvēršanai
  },
  beforeUnmount() {
    // Izpildās pirms komponenta noņemšanas
    if (this.notificationInterval) {
      // Notīra paziņojumu intervālu
      clearInterval(this.notificationInterval);
    }
    document.removeEventListener("click", this.handleClickOutsideDropdown); // Noņem notikumu klausītāju
  },
  methods: {
    // Ielādē lietotāja paziņojumus
    async fetchUserNotifications() {
      if (!this.currentUser) return; // Ja nav pieslēgta lietotāja, nedara neko
      try {
        const response = await axios.get("/api/notifications");
        this.recentNotifications = response.data.notifications;
        this.unreadNotificationCount = response.data.unreadCount;
      } catch (error) {
        console.error("Kļūda, ielādējot paziņojumus:", error);
        // Varētu parādīt neuzkrītošu kļūdas ziņojumu lietotājam
      }
    },
    // Sāk periodisku paziņojumu ielādi
    startNotificationPolling() {
      if (this.notificationInterval) {
        clearInterval(this.notificationInterval);
      }
      if (this.currentUser) {
        this.fetchUserNotifications(); // Sākotnējā ielāde
        this.notificationInterval = setInterval(
          this.fetchUserNotifications,
          60000 // Pārbauda ik pēc 60 sekundēm
        );
      }
    },
    // Pārtrauc periodisku paziņojumu ielādi
    stopNotificationPolling() {
      if (this.notificationInterval) {
        clearInterval(this.notificationInterval);
        this.notificationInterval = null;
      }
      this.recentNotifications = [];
      this.unreadNotificationCount = 0;
    },
    // Pārslēdz paziņojumu nolaižamā saraksta redzamību
    toggleNotificationsDropdown() {
      this.showNotificationsDropdown = !this.showNotificationsDropdown;
      // Ja saraksts tiek atvērts un tas ir tukšs, bet ir nelasīti paziņojumi, ielādē tos
      if (
        this.showNotificationsDropdown &&
        this.recentNotifications.length === 0 &&
        this.unreadNotificationCount > 0
      ) {
        this.fetchUserNotifications();
      }
    },
    // Aizver paziņojumu nolaižamo sarakstu
    closeNotificationsDropdown() {
      this.showNotificationsDropdown = false;
    },
    // Apstrādā klikšķi ārpus nolaižamā saraksta, lai to aizvērtu
    handleClickOutsideDropdown(event) {
      const dropdownContainer = this.$el.querySelector(
        ".notification-bell-container"
      );
      if (
        this.showNotificationsDropdown &&
        dropdownContainer &&
        !dropdownContainer.contains(event.target)
      ) {
        this.closeNotificationsDropdown();
      }
    },
    // Atzīmē paziņojumu kā izlasītu
    async markNotificationAsRead(notificationId) {
      try {
        await axios.put(`/api/notifications/${notificationId}/read`);
        this.fetchUserNotifications(); // Pārlādē paziņojumus, lai atjaunotu sarakstu un skaitu
      } catch (error) {
        console.error("Kļūda, atzīmējot paziņojumu kā izlasītu:", error);
        alert("Kļūda, atzīmējot paziņojumu kā izlasītu.");
      }
    },
    // Atzīmē visus paziņojumus kā izlasītus
    async markAllNotificationsAsRead() {
      try {
        await axios.put(`/api/notifications/read-all`);
        this.fetchUserNotifications(); // Pārlādē paziņojumus
        this.closeNotificationsDropdown();
      } catch (error) {
        console.error(
          "Kļūda, atzīmējot visus paziņojumus kā izlasītus:",
          error
        );
        alert("Kļūda, atzīmējot visus paziņojumus kā izlasītus.");
      }
    },
    // Pāriet uz paziņojumu saraksta skatu
    navigateToNotificationList() {
      this.currentView = "notificationList";
      this.closeNotificationsDropdown();
      this.clearAllEditStates(); // Notīra visus rediģēšanas stāvokļus
    },
    // Atjauno pašreizējā lietotāja stāvokli no servera
    async refreshCurrentUserState() {
      console.log("[App.vue] Mēģina atjaunot pašreizējā lietotāja stāvokli...");
      if (!this.currentUser || !localStorage.getItem("token")) {
        console.log(
          "[App.vue] Nav pašreizējā lietotāja vai pilnvaras, izlaiž atjaunošanu."
        );
        return;
      }
      try {
        const response = await axios.get("/api/auth/me/refresh");
        const refreshedUser = response.data;
        // Ja lietotāja ID ir mainījies (maz ticams, bet drošībai), atiestata admina skatīšanās režīmu
        if (this.currentUser.id !== refreshedUser.id) {
          this.isAdminViewingAsStudent = false;
        }
        this.currentUser = refreshedUser;
        localStorage.setItem("user", JSON.stringify(this.currentUser)); // Saglabā atjaunoto lietotāju localStorage
        console.log(
          "[App.vue] Lietotāja stāvoklis atjaunots:",
          this.currentUser
        );
        this.startNotificationPolling(); // Atjauno arī paziņojumus
      } catch (error) {
        console.error("[App.vue] Kļūda, atjaunojot lietotāja stāvokli:", error);
        // Ja serveris atgriež 401 vai 403 kļūdu, lietotājs tiek izrakstīts
        if (
          error.response &&
          (error.response.status === 401 || error.response.status === 403)
        ) {
          this.handleLogout();
          throw new Error("Lietotāja atjaunošana neizdevās, izrakstīts.");
        }
        throw error; // Izmet kļūdu tālākai apstrādei, ja nepieciešams
      }
    },
    // Pārbauda, vai skats ir saistīts ar informācijas paneli
    isDashboardRelatedView(viewName) {
      return this.dashboardRelatedViews.includes(viewName);
    },
    // Pārbauda, vai skats ir specifisks administratoram
    isAdminSpecificView(viewName) {
      return this.adminSpecificViews.includes(viewName);
    },
    // Pārbauda, vai skats ir "Mans Profils"
    isMyProfileView(viewName) {
      return viewName === "myProfile";
    },
    // Mēģina automātiski pieslēgt lietotāju, ielādējot datus no localStorage
    tryAutoLogin() {
      this.isLoadingAuth = true;
      const token = localStorage.getItem("token");
      const userString = localStorage.getItem("user");

      if (token && userString) {
        // Ja ir saglabāta pilnvara un lietotāja dati
        try {
          const user = JSON.parse(userString);
          this.currentUser = user;
          axios.defaults.headers.common["Authorization"] = `Bearer ${token}`; // Iestata autorizācijas galveni Axios
          this.startNotificationPolling(); // Sāk paziņojumu ielādi

          // Ja pašreizējais skats ir sākumlapa, pieslēgšanās vai reģistrācijas lapa,
          // un lietotājs ir pieslēdzies, novirza uz atbilstošo informācijas paneli.
          if (
            this.currentView === "home" ||
            this.currentView === "login" ||
            this.currentView === "register"
          ) {
            if (
              this.isAdminViewingAsStudent && // Ja administrators skatās kā students
              this.currentView === "dashboard" // Un pašreizējais skats jau ir studenta panelis
            ) {
              // Saglabā studenta paneļa skatu
            } else if (
              this.currentUser.role === "admin" && // Ja lietotājs ir administrators
              !this.isAdminViewingAsStudent // Un neskatās kā students
            ) {
              this.currentView = "adminDashboard"; // Novirza uz admina paneli
            } else if (this.currentUser.role === "student") {
              // Ja lietotājs ir students
              this.currentView = "dashboard"; // Novirza uz studenta paneli
            }
          }
        } catch (e) {
          // Ja notiek kļūda, apstrādājot saglabātos datus
          console.error(
            "Automātiskās pieslēgšanās kļūda, notīra saglabātos datus:",
            e
          );
          this.handleLogout(); // Izraksta lietotāju
        }
      } else {
        // Ja nav saglabātas pilnvaras vai lietotāja datu
        this.isAdminViewingAsStudent = false;
        this.stopNotificationPolling(); // Pārtrauc paziņojumu ielādi
        // Ja pašreizējais skats ir kāds no aizsargātajiem skatiem, novirza uz sākumlapu
        if (
          this.dashboardRelatedViews.includes(this.currentView) ||
          this.adminSpecificViews.includes(this.currentView) ||
          this.currentView === "myProfile"
        ) {
          this.currentView = "home";
        } else if (!this.currentView) {
          // Ja skats nav definēts, iestata sākumlapu
          this.currentView = "home";
        }
      }
      this.isLoadingAuth = false; // Pabeidz autentifikācijas pārbaudi
    },
    // Pāriet uz pieslēgšanās skatu
    navigateToLogin() {
      this.currentView = "login";
      this.isAdminViewingAsStudent = false;
      this.clearAllEditStates();
      this.stopNotificationPolling();
    },
    // Pāriet uz reģistrācijas skatu
    navigateToRegister() {
      this.currentView = "register";
      this.isAdminViewingAsStudent = false;
      this.clearAllEditStates();
      this.stopNotificationPolling();
    },
    // Rāda sākumlapu
    showHome() {
      this.currentView = "home";
      this.isAdminViewingAsStudent = false;
      this.clearAllEditStates();
      // Ja lietotājs ir pieslēdzies, paziņojumu ielādei jāturpinās, citādi jābūt apturētai
    },
    // Pāriet uz "Mans Profils" skatu
    navigateToMyProfile() {
      if (this.currentUser) {
        this.isAdminViewingAsStudent = false;
        this.currentView = "myProfile";
      } else {
        this.navigateToLogin(); // Ja nav pieslēdzies, pāriet uz pieslēgšanos
      }
      this.clearAllEditStates();
    },
    // Pāriet uz lietotājam specifisko informācijas paneli (studenta vai admina)
    navigateToUserSpecificDashboard() {
      if (this.currentUser) {
        if (
          this.currentUser.role === "admin" &&
          !this.isAdminViewingAsStudent
        ) {
          this.currentView = "adminDashboard";
        } else {
          this.currentView = "dashboard";
        }
      } else {
        this.navigateToLogin();
      }
      this.clearAllEditStates();
    },
    // Pāriet uz studenta informācijas paneli (administratoram)
    navigateToStudentDashboard() {
      if (this.currentUser && this.currentUser.role === "admin") {
        this.isAdminViewingAsStudent = true; // Iestata, ka administrators skatās kā students
        this.currentView = "dashboard";
      } else if (this.currentUser && this.currentUser.role === "student") {
        this.currentView = "dashboard"; // Ja ir students, vienkārši pāriet uz studenta paneli
      } else {
        this.navigateToLogin();
      }
      this.clearAllEditStates();
    },
    // Atgriežas administratora skatā (no studenta paneļa skatīšanās režīma)
    returnToAdminView() {
      if (this.currentUser && this.currentUser.role === "admin") {
        this.isAdminViewingAsStudent = false;
        this.currentView = "adminDashboard";
      } else {
        this.showHome(); // Ja nav administrators, pāriet uz sākumlapu
      }
      this.clearAllEditStates();
    },
    // Apstrādā veiksmīgu reģistrāciju
    handleRegistrationSuccess() {
      this.currentView = "login";
      this.isAdminViewingAsStudent = false;
      alert("Reģistrācija veiksmīga! Lūdzu, pieslēdzieties.");
      this.clearAllEditStates();
    },
    // Apstrādā veiksmīgu pieslēgšanos
    handleLoginSuccess(authData) {
      this.currentUser = authData.user; // Saglabā lietotāja datus
      localStorage.setItem("token", authData.token); // Saglabā pilnvaru localStorage
      localStorage.setItem("user", JSON.stringify(authData.user)); // Saglabā lietotāja datus localStorage
      axios.defaults.headers.common[ // Iestata autorizācijas galveni Axios
        "Authorization"
      ] = `Bearer ${authData.token}`;
      this.isAdminViewingAsStudent = false;
      this.startNotificationPolling(); // Sāk paziņojumu ielādi
      this.navigateToUserSpecificDashboard(); // Pāriet uz atbilstošo paneli
    },
    // Apstrādā izrakstīšanos
    handleLogout() {
      this.currentUser = null; // Notīra lietotāja datus
      localStorage.removeItem("token"); // Noņem pilnvaru no localStorage
      localStorage.removeItem("user"); // Noņem lietotāja datus no localStorage
      delete axios.defaults.headers.common["Authorization"]; // Noņem autorizācijas galveni no Axios
      this.isAdminViewingAsStudent = false;
      this.stopNotificationPolling(); // Pārtrauc paziņojumu ielādi
      this.currentView = "home"; // Pāriet uz sākumlapu
      alert("Jūs esat veiksmīgi izgājis no sistēmas.");
      this.clearAllEditStates();
    },
    // Pāriet uz mājasdarba pievienošanas skatu
    navigateToAddHomework() {
      if (this.currentUser) {
        this.clearAllEditStates();
        this.currentView = "addHomework";
      } else this.navigateToLogin();
    },
    // Pāriet uz pārbaudes darba pievienošanas skatu
    navigateToAddTest() {
      if (this.currentUser) {
        this.clearAllEditStates();
        this.currentView = "addTest";
      } else this.navigateToLogin();
    },
    // Pāriet uz vienuma rediģēšanas skatu (mājasdarbs vai pārbaudes darbs)
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
    // Atceļ vienuma rediģēšanu
    cancelEditItem() {
      this.clearAllEditStates();
      this.navigateToHomeworkList(); // Atgriežas darbu sarakstā
    },
    // Apstrādā veiksmīgu darbību ar vienumu (pievienošana/rediģēšana)
    handleItemActionSuccess(message) {
      alert(message || "Darbība veiksmīga!");
      this.fetchUserNotifications(); // Atjauno paziņojumus, ja darbība varēja tos radīt
      this.clearAllEditStates();
      this.navigateToHomeworkList(); // Atgriežas darbu sarakstā
    },
    // Pāriet uz mājasdarbu/pārbaudes darbu saraksta skatu
    navigateToHomeworkList() {
      if (this.currentUser) {
        this.currentView = "homeworkList";
        this.clearAllEditStates();
      } else {
        this.navigateToLogin();
      }
    },
    // Apstrādā vienuma dzēšanu sarakstā
    handleItemDeletedInList(message) {
      alert(message || "Ieraksts dzēsts.");
      this.fetchUserNotifications(); // Atjauno paziņojumus, ja dzēšana tos ietekmēja
    },
    // Pāriet uz grupu saraksta skatu
    navigateToGroupList() {
      if (this.currentUser) {
        this.currentView = "groupList";
        this.clearAllEditStates();
      } else {
        this.navigateToLogin();
      }
    },
    // Pāriet uz administratora informācijas paneli
    navigateToAdminDashboard() {
      if (this.currentUser && this.currentUser.role === "admin") {
        this.isAdminViewingAsStudent = false;
        this.currentView = "adminDashboard";
      } else {
        this.showHome(); // Ja nav administrators, pāriet uz sākumlapu
      }
      this.clearAllEditStates();
    },
    // Pāriet uz grupas izveides skatu
    navigateToCreateGroup() {
      if (this.currentUser && this.currentUser.role === "admin") {
        this.isAdminViewingAsStudent = false;
        this.currentView = "createGroup";
      } else {
        this.navigateToLogin();
      }
      this.clearAllEditStates();
    },
    // Apstrādā veiksmīgu grupas izveidi
    handleGroupCreated(message) {
      alert(message || "Grupa veiksmīgi izveidota!");
      this.navigateToAdminDashboard(); // Atgriežas admina panelī
    },
    // Pāriet uz grupu pieteikumu pārvaldības skatu
    navigateToManageGroupApplications() {
      if (this.currentUser && this.currentUser.role === "admin") {
        this.isAdminViewingAsStudent = false;
        this.currentView = "manageGroupApplications";
      } else {
        this.navigateToLogin();
      }
      this.clearAllEditStates();
    },
    // Pāriet uz grupu pārvaldības skatu
    navigateToManageGroups() {
      if (this.currentUser && this.currentUser.role === "admin") {
        this.isAdminViewingAsStudent = false;
        this.currentView = "manageGroups";
      } else {
        this.navigateToLogin();
      }
      this.clearAllEditStates();
    },
    // Pāriet uz grupas rediģēšanas skatu
    navigateToEditGroup(groupId) {
      if (this.currentUser && this.currentUser.role === "admin") {
        this.isAdminViewingAsStudent = false;
        this.clearAllEditStates();
        this.editingGroupId = groupId; // Saglabā rediģējamās grupas ID
        this.currentView = "editGroup";
      } else {
        this.navigateToLogin();
      }
    },
    // Apstrādā veiksmīgu grupas atjaunināšanu
    handleGroupUpdateSuccess(message) {
      alert(message || "Grupa veiksmīgi atjaunināta!");
      this.navigateToManageGroups(); // Atgriežas grupu pārvaldības skatā
    },
    // Pāriet uz lietotāju pārvaldības skatu
    navigateToManageUsers() {
      if (this.currentUser && this.currentUser.role === "admin") {
        this.isAdminViewingAsStudent = false;
        this.currentView = "manageUsers";
      } else {
        this.navigateToLogin();
      }
      this.clearAllEditStates();
    },
    // Pāriet uz lietotāja rediģēšanas skatu
    navigateToEditUser(userId) {
      if (this.currentUser && this.currentUser.role === "admin") {
        this.isAdminViewingAsStudent = false;
        this.clearAllEditStates();
        this.editingUserId = userId; // Saglabā rediģējamā lietotāja ID
        this.currentView = "editUser";
      } else {
        this.navigateToLogin();
      }
    },
    // Apstrādā veiksmīgu lietotāja datu atjaunināšanu
    handleUserUpdateSuccess(message) {
      alert(message || "Lietotāja dati veiksmīgi atjaunināti!");
      this.navigateToManageUsers(); // Atgriežas lietotāju pārvaldības skatā
    },
    // Notīra visus rediģēšanas stāvokļus (ID un tipus)
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
/* Globālie stili (esošie stili) */
:root {
  --primary-color: #007bff; /* Dzirkstoši zils */
  --secondary-color: #6c757d; /* Pelēks */
  --accent-color: #ffc107; /* Dzeltens akcents */
  --success-color: #28a745; /* Zaļš */
  --danger-color: #dc3545; /* Sarkans */
  --warning-color: #ffc107; /* Dzeltens */
  --info-color: #17a2b8; /* Zilganzaļš */

  --text-color: #343a40; /* Tumšāks pelēks tekstam */
  --text-color-light: #f8f9fa; /* Gaišs teksts tumšiem foniem */
  --link-color: #007bff; /* Saites krāsa */
  --link-hover-color: #0056b3; /* Saites krāsa uzvedoties */

  --bg-color: #f0f2f5; /* Gaiši pelēks lapas fons */
  --card-bg-color: #ffffff; /* Balts kartītēm/formām */
  --header-bg-color: #273444; /* Tumši zilganpelēks galvenei */
  --footer-bg-color: #212a36; /* Nedaudz tumšāks kājenei */

  --border-color: #dee2e6; /* Gaiši pelēks apmalēm */
  --border-radius: 0.3rem; /* Mīkstāks apmaļu noapaļojums */

  --font-family-sans-serif: "Inter", -apple-system, BlinkMacSystemFont,
    "Segoe UI", Roboto, Helvetica, Arial, sans-serif; /* Galvenais fonts */
  --font-size-base: 1rem; /* Bāzes fonta lielums */
  --line-height-base: 1.6; /* Bāzes rindstarpa */

  --shadow-sm: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075); /* Maza ēna */
  --shadow-md: 0 0.5rem 1rem rgba(0, 0, 0, 0.15); /* Vidēja ēna */
  --shadow-lg: 0 1rem 3rem rgba(0, 0, 0, 0.175); /* Liela ēna */
}

body {
  font-family: var(--font-family-sans-serif);
  margin: 0;
  padding: 0;
  background-color: var(--bg-color);
  color: var(--text-color);
  line-height: var(--line-height-base);
  font-size: var(--font-size-base);
  -webkit-font-smoothing: antialiased; /* Fontu mīkstināšana Webkit pārlūkiem */
  -moz-osx-font-smoothing: grayscale; /* Fontu mīkstināšana Firefox */
}

#app-container {
  /* Galvenais lietotnes konteiners */
  display: flex;
  flex-direction: column;
  min-height: 100vh; /* Minimālais augstums, lai kājene vienmēr būtu apakšā */
}

.app-header {
  /* Galvenes stili */
  background-color: var(--header-bg-color);
  color: var(--text-color-light);
  padding: 1rem 1.5rem;
  box-shadow: var(--shadow-md);
  z-index: 1000; /* Nodrošina, ka galvene ir virs cita satura */
}
.app-header .header-content {
  /* Galvenes satura konteiners */
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap; /* Atļauj elementiem pāriet jaunā rindā, ja nepietiek vietas */
  max-width: 1200px; /* Maksimālais platums */
  margin: 0 auto; /* Centēšana */
}
.app-header .logo-title-container {
  /* Logo un nosaukuma konteiners */
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.app-header .logo-icon {
  /* Logo ikona */
  font-size: 2rem;
  color: var(--accent-color);
}
.app-header h1 {
  /* Lietotnes nosaukums */
  margin: 0;
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: -0.5px;
}
.app-header .header-user-info {
  /* Lietotāja informācijas un darbību bloks galvenē */
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}
.app-header .header-link {
  /* Vispārīgs stils saitēm galvenē */
  color: #e0e0e0;
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
  /* Uzvedoties virs saites */
  background-color: rgba(255, 255, 255, 0.1);
  color: var(--text-color-light);
}
.app-header .profile-link {
  /* Profila saites specifiskie stili */
  color: var(--accent-color);
}
.app-header .profile-link:hover {
  color: #fff;
  background-color: var(--accent-color);
}
.app-header .admin-panel-link {
  /* Admina paneļa saites specifiskie stili */
  color: var(--info-color);
}
.app-header .admin-panel-link:hover {
  color: #fff;
  background-color: var(--info-color);
}
.app-header .return-to-admin-link {
  /* "Atgriezties Admin Panelī" pogas stili */
  background-color: var(--warning-color);
  color: var(--text-color);
}
.app-header .return-to-admin-link:hover {
  background-color: #e0a800; /* Tumšāks dzeltens */
  color: var(--text-color);
}
.app-header .user-greeting {
  /* Lietotāja sveiciena teksts */
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.app-header .user-greeting .user-group-display {
  /* Lietotāja grupas attēlojums */
  font-size: 0.85rem;
  opacity: 0.8;
  margin-left: 0.25rem;
}
.app-header .user-greeting .viewing-as-student-indicator {
  /* Indikators, ka administrators skatās kā students */
  font-weight: bold;
  color: var(--warning-color);
  opacity: 1;
}

/* Paziņojumu zvana stili */
.notification-bell-container {
  position: relative; /* Nepieciešams emblēmas pozicionēšanai */
  cursor: pointer;
  padding: 0.5rem 0.75rem; /* Līdzīgi kā .header-link */
  border-radius: var(--border-radius);
  transition: background-color 0.2s ease;
}
.notification-bell-container:hover {
  background-color: rgba(255, 255, 255, 0.1);
}
.notification-icon {
  font-size: 1.25rem;
  color: #e0e0e0;
}
.notification-bell-container:hover .notification-icon {
  color: var(--text-color-light);
}
.notification-badge {
  /* Nelasīto paziņojumu skaita emblēma */
  position: absolute;
  top: 2px;
  right: 2px;
  background-color: var(--danger-color);
  color: white;
  border-radius: 50%; /* Apaļa forma */
  padding: 0.15em 0.45em;
  font-size: 0.7rem;
  font-weight: bold;
  min-width: 18px;
  height: 18px;
  display: flex;
  justify-content: center;
  align-items: center;
  line-height: 1;
  box-shadow: 0 0 5px rgba(0, 0, 0, 0.3);
}

/* Galvenā satura stili */
.app-main {
  flex-grow: 1; /* Nodrošina, ka galvenais saturs aizpilda atlikušo vietu */
  padding: 1.5rem;
  margin: 0 auto;
  width: 100%;
  max-width: 1200px; /* Maksimālais platums saturam */
  box-sizing: border-box;
}
.home-container {
  /* Sākumlapas konteiners */
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
}
.card-style {
  /* Vispārīgs stils kartītēm */
  background-color: var(--card-bg-color);
  border-radius: var(--border-radius);
  box-shadow: var(--shadow-sm);
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}
.intro-section {
  /* Ievada sekcija sākumlapā */
  text-align: left;
}
.intro-section .intro-title {
  /* Ievada virsraksts */
  font-size: 1.75rem;
  color: var(--header-bg-color);
  margin-bottom: 1rem;
  text-align: center;
}
.intro-section p {
  /* Ievada teksts */
  font-size: 1.05rem;
  color: #555;
  line-height: 1.7;
  margin-bottom: 1rem;
}
.actions-nav {
  /* Darbību pogu navigācija (piem., Pieslēgties, Reģistrēties) */
  display: flex;
  justify-content: center;
  gap: 1rem;
  flex-wrap: wrap;
  margin-top: 1.5rem;
}

/* Pogu stili */
.action-button {
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: var(--border-radius);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s ease, box-shadow 0.2s ease,
    transform 0.1s ease;
  display: inline-flex; /* Lai ikona un teksts būtu vienā rindā */
  align-items: center;
  gap: 0.5rem; /* Atstarpe starp ikonu un tekstu */
  text-decoration: none; /* Noņem pasvītrojumu, ja poga ir saite */
  white-space: nowrap; /* Neļauj tekstam pāriet jaunā rindā */
}
.action-button:hover:not([disabled]) {
  /* Uzvedoties virs pogas (ja nav atspējota) */
  box-shadow: var(--shadow-sm);
}
.action-button:active:not([disabled]) {
  /* Nospiežot pogu (ja nav atspējota) */
  transform: translateY(1px); /* Nedaudz pabīda uz leju */
}
.action-button.primary-button {
  /* Primārā poga */
  background-color: var(--primary-color);
  color: var(--text-color-light);
}
.action-button.primary-button:hover:not([disabled]) {
  background-color: #0069d9; /* Tumšāks primārais */
}
.action-button.secondary-button {
  /* Sekundārā poga */
  background-color: var(--secondary-color);
  color: var(--text-color-light);
}
.action-button.secondary-button:hover:not([disabled]) {
  background-color: #5a6268; /* Tumšāks sekundārais */
}
.action-button[disabled] {
  /* Atspējota poga */
  background-color: #e9ecef;
  color: #6c757d;
  cursor: not-allowed; /* Rāda neatļautu kursoru */
  opacity: 0.7;
}

/* Formu stili */
.form-view {
  /* Vispārīgs stils formu skatiem */
  max-width: 650px;
  margin: 1rem auto;
  padding: 2rem;
  background-color: var(--card-bg-color);
  border-radius: var(--border-radius);
  box-shadow: var(--shadow-md);
  text-align: left; /* Formas elementi līdzināsies pa kreisi */
  width: 100%;
  box-sizing: border-box;
}
.form-view h2 {
  /* Formas virsraksts */
  text-align: center;
  color: var(--header-bg-color);
  margin-top: 0;
  margin-bottom: 1.5rem;
  font-size: 1.75rem;
  font-weight: 600;
}
.form-group {
  /* Atsevišķa formas grupa (etiķete + ievadloks) */
  margin-bottom: 1.25rem;
}
.form-group label {
  /* Etiķete */
  display: block; /* Aizņem visu platumu */
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: var(--text-color);
  font-size: 0.95rem;
}
.form-group input[type="text"], /* Stili dažādiem ievada tipiem */
.form-group input[type="email"],
.form-group input[type="password"],
.form-group input[type="number"],
.form-group input[type="date"],
.form-group input[type="time"],
.form-group textarea,
.form-group select {
  width: 100%; /* Aizņem visu pieejamo platumu */
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  font-size: 1rem;
  box-sizing: border-box; /* Iekļauj padding un border platumā */
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  background-color: #fff; /* Gaišs fons ievadlaukam */
}
.form-group input[type="file"] {
  /* Faila augšupielādes lauka specifisks stils */
  padding: 0.5rem;
}
.form-group textarea {
  /* Teksta lauka stili */
  min-height: 120px; /* Minimālais augstums */
  resize: vertical; /* Atļauj mainīt augstumu vertikāli */
}
.form-group input:focus, /* Stili, kad ievadloks ir fokusā */
.form-group textarea:focus,
.form-group select:focus {
  border-color: var(--primary-color);
  outline: none; /* Noņem noklusējuma fokusa apmali */
  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25); /* Pievieno pielāgotu fokusa ēnu */
}
.form-group small {
  /* Mazs teksts zem ievadlauka (palīdzība, validācija) */
  display: block;
  margin-top: 0.3rem;
  font-size: 0.85rem;
  color: #6c757d;
}
.required-field {
  /* Obligātā lauka zvaigznīte */
  color: var(--danger-color);
  margin-left: 2px;
}

/* Ziņojumu stili (kļūdas, veiksmes) */
.error-message,
.success-message {
  padding: 0.8rem 1rem;
  border-radius: var(--border-radius);
  margin-bottom: 1rem;
  text-align: center;
  font-weight: 500;
}
.error-message {
  /* Kļūdas ziņojums */
  color: #721c24; /* Tumši sarkans teksts */
  background-color: #f8d7da; /* Gaiši sarkans fons */
  border: 1px solid #f5c6cb; /* Sarkana apmale */
}
.success-message {
  /* Veiksmes ziņojums */
  color: #155724; /* Tumši zaļš teksts */
  background-color: #d4edda; /* Gaiši zaļš fons */
  border: 1px solid #c3e6cb; /* Zaļa apmale */
}

/* Atpakaļ pogas un formas darbību stili */
.back-button {
  /* "Atpakaļ" poga */
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
  /* Konteiners formas darbību pogām */
  display: flex;
  justify-content: space-between; /* Izlīdzina pogas (piem., Atcelt pa kreisi, Iesniegt pa labi) */
  align-items: center;
  margin-top: 1.5rem;
}

/* Kājenes stili */
.app-footer {
  background-color: var(--footer-bg-color);
  color: #adb5bd; /* Gaišāks teksts uz tumša fona */
  padding: 1.5rem 1rem;
  font-size: 0.85rem;
  text-align: center;
  margin-top: auto; /* Piespiež kājeni lapas apakšai */
}

/* Ielādes indikatora stili */
.loading-indicator {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2rem;
  font-size: 1.2rem;
  color: var(--primary-color);
}
.loading-indicator .fa-spinner {
  /* Griežošā ikona */
  margin-right: 0.75rem;
}

/* Responsīvie pielāgojumi */
@media (max-width: 768px) {
  /* Planšetdatoriem un mazākiem ekrāniem */
  .app-header .header-content {
    /* Galvenes saturs kolonnā */
    flex-direction: column;
    gap: 0.75rem;
  }
  .app-header h1 {
    /* Mazāks nosaukums */
    font-size: 1.5rem;
  }
  .app-header .header-user-info {
    /* Lietotāja informācija kolonnā */
    flex-direction: column;
    align-items: center;
    width: 100%;
    gap: 0.5rem;
  }
  .app-header .header-link,
  .app-header .return-to-admin-link,
  .app-header .notification-bell-container {
    /* Galvenes saites un paziņojumu zvans aizņem visu platumu */
    width: 100%;
    justify-content: center;
  }
  .form-view {
    /* Mazākas atkāpes formām */
    margin: 1rem;
    padding: 1.5rem;
  }
}

@media (max-width: 600px) {
  /* Viedtālruņiem */
  :root {
    /* Mazāks bāzes fonta lielums */
    --font-size-base: 0.95rem;
  }
  .app-header {
    /* Mazākas galvenes atkāpes */
    padding: 0.75rem 1rem;
  }
  .app-header .logo-icon {
    /* Mazāka logo ikona */
    font-size: 1.75rem;
  }
  .app-header h1 {
    /* Vēl mazāks nosaukums */
    font-size: 1.4rem;
  }
  .intro-section .intro-title {
    /* Mazāks ievada virsraksts */
    font-size: 1.5rem;
  }
  .intro-section p {
    /* Mazāks ievada teksts */
    font-size: 1rem;
  }
  .actions-nav .action-button {
    /* Darbību pogas sākumlapā aizņem visu platumu */
    width: 100%;
    max-width: 320px;
    margin: 0.5rem auto;
  }
  .app-main {
    /* Mazākas galvenā satura atkāpes */
    padding: 1rem;
  }
  .form-view {
    /* Vēl mazākas formu atkāpes */
    padding: 1.25rem;
  }
  .form-view h2 {
    /* Mazāks formas virsraksts */
    font-size: 1.5rem;
  }
  .form-actions {
    /* Formas darbību pogas kolonnā */
    flex-direction: column;
  }
  .form-actions .action-button {
    /* Pogas aizņem visu platumu */
    width: 100%;
    margin-bottom: 0.75rem;
  }
  /* Maina pogu secību mobilajā skatā, lai primārā poga būtu augšā */
  .form-actions .action-button.secondary-action,
  .form-actions .back-button {
    margin-top: 0.5rem;
    order: 2;
  }
  .form-actions .action-button:not(.secondary-action) {
    order: 1;
  }
  .form-actions .back-button {
    /* Atpakaļ poga centrēta */
    align-self: center;
  }
}
</style>
