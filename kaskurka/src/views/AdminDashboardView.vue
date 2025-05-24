<!-- kaskurka/src/views/AdminDashboardView.vue -->
<template>
  <div class="admin-dashboard-view form-view"> <!-- Using form-view for consistent styling, can be customized -->
    <header class="dashboard-header"> <!-- Re-using dashboard-header style from DashboardView.vue for consistency -->
      <h2>Administratora Panelis</h2>
      <button @click="logout" class="action-button logout-button">Iziet</button>
    </header>
    <section class="dashboard-content">
      <p>
        Laipni lūgti Administratora panelī! Šeit jūs varat pārvaldīt sistēmas grupas, lietotājus un citus iestatījumus.
      </p>
      
      <nav class="dashboard-actions">
        <button class="action-button" @click="navigateToCreateGroup">
          Izveidot Jaunu Grupu (2.2.6)
        </button>
        <button class="action-button" @click="navigateToManageGroupApplications">
          Pārvaldīt Grupu Pieteikumus (2.2.8)
        </button>
        <button class="action-button" @click="navigateToStudentDashboard" title="Pāriet uz studentu skatu, lai redzētu mājasdarbus u.c.">
          Skatīt kā Students
        </button>
        <!-- Add more admin actions here as they are implemented -->
        <button class="action-button" disabled>Pārvaldīt Lietotājus (Nākotnē)</button>
        <button class="action-button" disabled>Pārvaldīt Grupas (Nākotnē)</button>
        <button class="action-button" disabled>Moderēt Saturu (Nākotnē)</button>
      </nav>

      <div class="content-placeholder">
        <h3>Plānotās Administratora Funkcijas:</h3>
        <ul>
          <li>Jaunu grupu izveide (2.2.6) - *Ieviests*</li>
          <li>Pieteikumu apstiprināšana grupām (2.2.8) - *Šobrīd tiek ieviests*</li>
          <li>Lietotāju kontu administrēšana (rediģēšana, dzēšana, lomu maiņa)</li>
          <li>Esošo grupu pārvaldība (rediģēšana, dzēšana, studentu piesaiste/noņemšana)</li>
          <li>Studentu pievienotā satura moderēšana</li>
        </ul>
      </div>
    </section>
  </div>
</template>

<script>
export default {
  name: "AdminDashboardView",
  methods: {
    logout() {
      this.$emit("logout");
    },
    navigateToCreateGroup() {
      this.$emit("navigateToCreateGroup");
    },
    navigateToManageGroupApplications() {
      this.$emit("navigateToManageGroupApplications"); // New event
    },
    navigateToStudentDashboard() {
      this.$emit("navigateToStudentDashboard"); 
    }
  },
};
</script>

<style scoped>
/* Most styles are global or re-used from DashboardView.vue */
.admin-dashboard-view {
  max-width: 900px; /* Consistent with HomeworkListView */
}
.dashboard-header { /* Copied from DashboardView for consistency */
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
  padding-bottom: 15px;
  border-bottom: 1px solid #eee;
}
.dashboard-header h2 {
  color: #2c3e50;
  margin: 0;
}
.logout-button { /* Copied from DashboardView */
  background-color: #e74c3c; 
  padding: 10px 20px;
}
.logout-button:hover {
  background-color: #c0392b; 
}
.dashboard-content p { /* Copied from DashboardView */
  font-size: 1.1em;
  color: #555;
  margin-bottom: 20px;
}
.dashboard-actions { /* Copied from DashboardView */
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  flex-wrap: wrap; 
  gap: 10px; 
}
.dashboard-actions .action-button {
  margin: 5px 0; 
}
.content-placeholder { /* Copied from DashboardView */
  margin-top: 30px;
  padding: 20px;
  background-color: #f9f9f9;
  border: 1px dashed #ddd;
  border-radius: 5px;
}
.content-placeholder h3 {
  margin-top: 0;
  color: #34495e;
}
.content-placeholder ul {
  list-style-type: disc;
  padding-left: 20px;
}
.content-placeholder li {
  margin-bottom: 8px;
  color: #7f8c8d;
}
</style>