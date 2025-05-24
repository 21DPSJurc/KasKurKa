<!-- kaskurka/src/App.vue -->
<template>
  <div id="app-container">
    <header class="app-header" v-if="!currentUser || !isDashboardRelatedView(currentView)">
      <h1>KasKurKa</h1>
       <div v-if="currentUser" class="user-greeting">
        Sveiki, {{ currentUser.firstName }}!
      </div>
    </header>
    <header class="app-header dashboard-app-header" v-else-if="currentUser && isDashboardRelatedView(currentView)">
      <h1>KasKurKa</h1>
      <div v-if="currentUser" class="user-greeting">
        Sveiki, {{ currentUser.firstName }}!
      </div>
    </header>

    <main class="app-main">
      <template v-if="currentView === 'home' && !currentUser">
        <section class="intro-section">
          <p>
            KasKurKa mājasdarbu pārvaldes sistēma ir izstrādāta, lai studenti
            būtu spējīgi efektīvi pārvaldīt sava kursa mājasdarbus un palīdzēt
            viens otram situācijās, kad mājasdarbi tika izteikti tikai mutiski
            vai "paslēpti" grūti uztveramās mājaslapās, kā arī šī sistēma ļauj
            nodot informāciju par gaidāmajiem pārbaudes darbu datumiem.
          </p>
        </section>
        <nav class="actions-nav">
          <button class="action-button" @click="navigateToLogin">Pieslēgties</button>
          <button class="action-button" @click="navigateToRegister">Reģistrēties</button>
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
      <DashboardView
        v-else-if="currentView === 'dashboard' && currentUser"
        :currentUser="currentUser"
        @logout="handleLogout"
        @navigateToAddHomework="navigateToAddHomework"
        @navigateToAddTest="navigateToAddTest"
        @navigateToHomeworkList="navigateToHomeworkList"
      />
      <AddHomeworkView
        v-else-if="currentView === 'addHomework' && currentUser"
        :item-id-to-edit="editingItemId"
        @itemActionSuccess="handleItemActionSuccess"
        @navigateToDashboard="navigateToDashboard"
        @cancelEdit="cancelEdit"
      />
      <AddTestView
        v-else-if="currentView === 'addTest' && currentUser"
        :item-id-to-edit="editingItemId"
        @itemActionSuccess="handleItemActionSuccess"
        @navigateToDashboard="navigateToDashboard"
        @cancelEdit="cancelEdit"
      />
      <HomeworkListView
        v-else-if="currentView === 'homeworkList' && currentUser"
        :current-user-id="currentUser ? currentUser.id : null"
        @navigateToDashboard="navigateToDashboard"
        @editItem="navigateToEditItem"
        @itemDeleted="handleItemDeletedInList"
      />

      <div v-else-if="isLoadingAuth"><p>Notiek ielāde...</p></div>
      <div v-else></div>
    </main>

    <footer class="app-footer">
      <p>© {{ new Date().getFullYear() }} KasKurKa. Visas tiesības aizsargātas.</p>
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
import axios from 'axios'; 

export default {
  name: "App",
  components: { RegisterView, LoginView, DashboardView, AddHomeworkView, AddTestView, HomeworkListView },
  data() {
    return {
      currentView: "home", 
      currentUser: null,   
      isLoadingAuth: true, 
      dashboardRelatedViews: ['dashboard', 'addHomework', 'addTest', 'homeworkList'],
      editingItemId: null, // Will store ID of item being edited
      editingItemType: null, // 'homework' or 'test'
    };
  },
  created() { this.tryAutoLogin(); },
  methods: {
    isDashboardRelatedView(viewName) { return this.dashboardRelatedViews.includes(viewName); },
    tryAutoLogin() { /* ... as before ... */ 
      this.isLoadingAuth = true;
      const token = localStorage.getItem("token");
      const userString = localStorage.getItem("user");

      if (token && userString) {
        try {
          const user = JSON.parse(userString);
          this.currentUser = user; // user object should contain id, firstName, group etc.
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`; 
          this.currentView = "dashboard";
        } catch (e) {
          console.error("Error parsing user from localStorage:", e);
          this.handleLogout(); 
        }
      } else {
        this.currentView = "home"; 
      }
      this.isLoadingAuth = false;
    },
    navigateToLogin() { this.currentView = "login"; this.clearEditState(); },
    navigateToRegister() { this.currentView = "register"; this.clearEditState(); },
    showHome() { this.currentView = "home"; this.clearEditState(); },
    navigateToDashboard() {
      if (this.currentUser) this.currentView = "dashboard";
      else this.navigateToLogin();
      this.clearEditState();
    },
    handleRegistrationSuccess() { /* ... as before ... */ 
        this.currentView = "login";
        alert("Reģistrācija veiksmīga! Lūdzu, pieslēdzieties.");
        this.clearEditState();
    },
    handleLoginSuccess(authData) { /* ... as before ... */ 
      this.currentUser = authData.user;
      localStorage.setItem("token", authData.token);
      localStorage.setItem("user", JSON.stringify(authData.user)); // Store full user object
      axios.defaults.headers.common['Authorization'] = `Bearer ${authData.token}`; 
      this.currentView = "dashboard";
      this.clearEditState();
    },
    handleLogout() { /* ... as before ... */ 
      this.currentUser = null;
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      delete axios.defaults.headers.common['Authorization']; 
      this.currentView = "home";
      alert("Jūs esat veiksmīgi izgājis no sistēmas."); 
      this.clearEditState();
    },
    navigateToAddHomework() {
      if (this.currentUser) {
        this.clearEditState(); // Ensure we are in "add" mode
        this.currentView = "addHomework";
      } else this.navigateToLogin();
    },
    navigateToAddTest() {
      if (this.currentUser) {
        this.clearEditState(); // Ensure we are in "add" mode
        this.currentView = "addTest";
      } else this.navigateToLogin();
    },
    navigateToEditItem({itemId, itemType}) {
        if (this.currentUser) {
            this.editingItemId = itemId;
            this.editingItemType = itemType;
            if (itemType === 'homework') {
                this.currentView = 'addHomework'; // Re-use AddHomeworkView for editing
            } else if (itemType === 'test') {
                this.currentView = 'addTest'; // Re-use AddTestView for editing
            }
        } else {
            this.navigateToLogin();
        }
    },
    cancelEdit() { // Called from AddHomeworkView/AddTestView when in edit mode
        this.clearEditState();
        this.navigateToHomeworkList(); // Or dashboard, depending on preferred flow
    },
    clearEditState() {
        this.editingItemId = null;
        this.editingItemType = null;
    },
    handleItemActionSuccess(message) { 
      // This is called by AddHomeworkView/AddTestView after successful add OR edit
      alert(message || "Darbība veiksmīga!"); 
      this.clearEditState();
      // If previous view was list, go back to list, otherwise dashboard
      // For simplicity, always go to list after add/edit if list exists.
      // Or just always to dashboard. Let's make it homeworkList for now.
      if (this.currentView === 'addHomework' || this.currentView === 'addTest') {
          this.navigateToHomeworkList();
      } else {
          this.navigateToDashboard();
      }
    },
    navigateToHomeworkList() {
      if (this.currentUser) {
        this.currentView = "homeworkList"; 
        this.clearEditState();
      } else {
        this.navigateToLogin();
      }
    },
    handleItemDeletedInList(message) {
        alert(message || "Ieraksts dzēsts.");
        // The list view itself will re-fetch or remove the item locally.
        // No view change needed here unless we want to navigate away from list.
    }
  },
};
</script>

<style>
/* Global styles remain the same */
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; color: #333; line-height: 1.6; }
#app-container { display: flex; flex-direction: column; min-height: 100vh; text-align: center; }
.app-header { background-color: #2c3e50; color: #ecf0f1; padding: 20px 0; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); display: flex; justify-content: space-around; align-items: center; }
.app-header h1 { margin: 0; font-size: 2.5em; text-align: center; }
.user-greeting { font-size: 1em; margin-right: 20px; }
.app-main { flex-grow: 1; padding: 20px; margin: 0 auto; width: 100%; display: flex; flex-direction: column; align-items: center; }
.app-main > .intro-section { max-width: 800px; background-color: #fff; border-radius: 8px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.05); padding: 20px; width: 100%; }
.intro-section p { font-size: 1.1em; color: #555; margin-bottom: 30px; padding: 0 15px; text-align: left; }
.actions-nav { margin-top: 20px; max-width: 800px; width: 100%; }
.action-button { background-color: #3498db; color: white; border: none; padding: 12px 25px; margin: 5px 10px; border-radius: 5px; font-size: 1em; cursor: pointer; transition: background-color 0.3s ease; }
.action-button:hover { background-color: #2980b9; }
.action-button:active { background-color: #2471a3; }
.action-button[disabled] { background-color: #bdc3c7; cursor: not-allowed; }
.action-button[disabled]:hover { background-color: #bdc3c7; }
.app-footer { background-color: #34495e; color: #bdc3c7; padding: 15px 0; font-size: 0.9em; margin-top: auto; }
.form-view { max-width: 600px; margin: 20px auto; padding: 25px; background-color: #fff; border-radius: 8px; box-shadow: 0 0 15px rgba(0, 0, 0, 0.1); text-align: left; width: 100%; }
.form-view h2 { text-align: center; color: #2c3e50; margin-bottom: 25px; }
.form-group { margin-bottom: 20px; }
.form-group label { display: block; margin-bottom: 8px; font-weight: bold; color: #34495e; }
.form-group input[type="text"], .form-group input[type="email"], .form-group input[type="password"], .form-group input[type="number"], .form-group input[type="date"], .form-group input[type="time"], .form-group textarea, .form-group select { width: calc(100% - 24px); padding: 12px; border: 1px solid #ccc; border-radius: 4px; font-size: 1em; box-sizing: border-box; }
.form-group input[type="file"] { width: calc(100% - 24px); padding: 8px; }
.form-group textarea { min-height: 100px; resize: vertical; }
.form-group input:focus, .form-group textarea:focus, .form-group select:focus { border-color: #3498db; outline: none; box-shadow: 0 0 0 0.2rem rgba(52, 152, 219, 0.25); }
.form-group small { display: block; margin-top: 5px; font-size: 0.85em; color: #7f8c8d; }
.error-message { color: #e74c3c; background-color: #fdd; border: 1px solid #e74c3c; padding: 10px; border-radius: 4px; margin-bottom: 15px; text-align: center; }
.success-message { color: #2ecc71; background-color: #e6ffed; border: 1px solid #2ecc71; padding: 10px; border-radius: 4px; margin-bottom: 15px; text-align: center; }
.back-button { background: none; border: none; color: #3498db; font-size: 1em; cursor: pointer; padding: 5px 0; margin-bottom: 15px; display: inline-block; }
.back-button:hover { text-decoration: underline; }
.form-actions { display: flex; justify-content: space-between; align-items: center; margin-top: 20px; }
.required-field { color: #e74c3c; margin-left: 2px; }
@media (max-width: 768px) { .app-header { flex-direction: column; } .app-header h1 { margin-bottom: 10px; } .user-greeting { margin-right: 0; margin-bottom: 10px; } .form-view { margin: 20px 10px; padding: 20px; } }
@media (max-width: 600px) { .app-header h1 { font-size: 2em; } .intro-section p { font-size: 1em; } .app-main > .intro-section { margin: 10px; padding: 15px; } .action-button { padding: 10px 15px; font-size: 0.9em; display: block; width: calc(100% - 20px); max-width: 300px; margin: 10px auto; } .app-main { padding: 10px; } .form-group input[type="text"], .form-group input[type="email"], .form-group input[type="password"], .form-group input[type="number"], .form-group input[type="date"], .form-group input[type="time"], .form-group textarea, .form-group select { font-size: 0.95em; } .form-actions { flex-direction: column-reverse; } .form-actions .action-button { width: 100%; margin-bottom: 10px; } .form-actions .back-button { margin-bottom: 15px; align-self: flex-start; } }
</style>