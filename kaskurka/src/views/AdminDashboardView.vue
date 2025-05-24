<template>
  <div class="admin-dashboard-view form-view">
    <header class="dashboard-header">
      <h2>Administratora Panelis</h2>
      <button @click="logout" class="action-button logout-button">Iziet</button>
    </header>
    <section class="dashboard-content">
      <p>
        Laipni lūgti Administratora panelī! Šeit jūs varat pārvaldīt sistēmas
        grupas, lietotājus un citus iestatījumus.
      </p>

      <nav class="dashboard-actions">
        <button class="action-button" @click="navigateToCreateGroup">
          Izveidot Jaunu Grupu (2.2.6)
        </button>
        <button class="action-button" @click="navigateToManageGroups">
          Pārvaldīt Grupas (Rediģēt/Dzēst)
        </button>
        <button
          class="action-button"
          @click="navigateToManageGroupApplications"
        >
          Pārvaldīt Grupu Pieteikumus (2.2.8)
        </button>
        <button class="action-button" @click="navigateToManageUsers">
          Pārvaldīt Lietotājus (8.2, 8.3, 8.4, 8.5)
        </button>
        <button
          class="action-button"
          @click="navigateToStudentDashboard"
          title="Pāriet uz studentu skatu, lai redzētu mājasdarbus u.c."
        >
          Skatīt kā Students
        </button>
      </nav>

      <div class="content-placeholder">
        <!-- Removed Plānotās Administratora Funkcijas section -->
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
      this.$emit("navigateToManageGroupApplications");
    },
    navigateToManageGroups() {
      this.$emit("navigateToManageGroups");
    },
    navigateToManageUsers() {
      // New method
      this.$emit("navigateToManageUsers");
    },
    navigateToStudentDashboard() {
      this.$emit("navigateToStudentDashboard");
    },
  },
};
</script>

<style scoped>
/* Most styles are global or re-used from DashboardView.vue */
.admin-dashboard-view {
  max-width: 900px; /* Consistent with HomeworkListView */
}
.dashboard-header {
  /* Copied from DashboardView for consistency */
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
.logout-button {
  /* Copied from DashboardView */
  background-color: #e74c3c;
  padding: 10px 20px;
}
.logout-button:hover {
  background-color: #c0392b;
}
.dashboard-content p {
  /* Copied from DashboardView */
  font-size: 1.1em;
  color: #555;
  margin-bottom: 20px;
}
.dashboard-actions {
  /* Copied from DashboardView */
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
.content-placeholder {
  /* Copied from DashboardView */
  margin-top: 30px;
  padding: 20px;
  background-color: #f9f9f9;
  border: 1px dashed #ddd;
  border-radius: 5px;
  /* If it's empty now, you might want to adjust its styling or remove it if not needed */
  min-height: 50px; /* Example: give it some height if it's just an empty box now */
}
/* If the .content-placeholder is now truly empty and not needed,
   you can remove its styles or even the div itself.
   For now, I've left it as an empty styled box. */

/* Remove specific styles for h3 and ul if they are no longer present or needed */
/*
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
*/
</style>
