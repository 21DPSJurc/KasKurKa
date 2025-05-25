<template>
  <div class="admin-dashboard-view card-style">
    <header class="dashboard-view-header">
      <div class="header-content">
        <h2 class="view-title">
          <i class="fas fa-user-shield"></i> Administratora Panelis
        </h2>
        <button
          @click="logout"
          class="action-button danger-button logout-button"
        >
          <i class="fas fa-sign-out-alt"></i> Iziet
        </button>
      </div>
    </header>

    <section class="dashboard-intro">
      <p>
        Laipni lūgti Administratora panelī! Šeit jūs varat pārvaldīt sistēmas
        grupas, lietotājus, pieteikumus un citus svarīgus iestatījumus.
      </p>
    </section>

    <nav class="dashboard-actions admin-actions">
      <button
        class="action-button admin-action-button"
        @click="navigateToManageUsers"
      >
        <i class="fas fa-users-cog"></i> Pārvaldīt Lietotājus
      </button>
      <button
        class="action-button admin-action-button"
        @click="navigateToCreateGroup"
      >
        <i class="fas fa-plus-square"></i> Izveidot Jaunu Grupu
      </button>
      <button
        class="action-button admin-action-button"
        @click="navigateToManageGroups"
      >
        <i class="fas fa-edit"></i> Pārvaldīt Grupas
      </button>
      <button
        class="action-button admin-action-button"
        @click="navigateToManageGroupApplications"
      >
        <i class="fas fa-tasks"></i> Grupu Pieteikumi
      </button>
      <button
        class="action-button admin-action-button view-as-student-button"
        @click="navigateToStudentDashboard"
        title="Pāriet uz studentu skatu, lai redzētu mājasdarbus u.c."
      >
        <i class="fas fa-user-graduate"></i> Skatīt kā Students
      </button>
    </nav>

    <!-- Placeholder for potential future admin-specific summaries or stats -->
    <section class="admin-summary-placeholder" v-if="false">
      <h3 class="panel-title">
        <i class="fas fa-chart-bar"></i> Sistēmas Pārskats
      </h3>
      <p>Šeit varētu būt statistika par lietotājiem, grupām, aktivitāti utt.</p>
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
      this.$emit("navigateToManageUsers");
    },
    navigateToStudentDashboard() {
      this.$emit("navigateToStudentDashboard");
    },
  },
};
</script>

<style scoped>
/* .admin-dashboard-view inherits .card-style from global */
.admin-dashboard-view {
  padding: 1.5rem;
}

.dashboard-view-header {
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-color);
}
.dashboard-view-header .header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.dashboard-view-header .view-title {
  color: var(--header-bg-color);
  margin: 0;
  font-size: 1.8rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.logout-button {
  /* Uses global .action-button and .danger-button */
}
.action-button.danger-button {
  background-color: var(--danger-color);
  color: var(--text-color-light);
}
.action-button.danger-button:hover:not([disabled]) {
  background-color: #c82333; /* Darker danger */
}

.dashboard-intro p {
  font-size: 1.05rem;
  color: #555;
  margin-bottom: 1.5rem;
  line-height: 1.7;
  text-align: center;
}

.admin-actions {
  display: grid;
  grid-template-columns: repeat(
    auto-fit,
    minmax(250px, 1fr)
  ); /* Responsive grid */
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.admin-action-button {
  /* Uses global .action-button */
  background-color: var(--primary-color); /* Default color for admin actions */
  justify-content: flex-start; /* Align icon and text to the left */
  padding: 1rem; /* More padding for larger buttons */
  font-size: 1.05rem;
}
.admin-action-button i {
  font-size: 1.2em; /* Slightly larger icons */
  width: 25px; /* Fixed width for icon alignment */
  text-align: center;
}

/* Different colors for different admin actions for better visual distinction */
.admin-actions .admin-action-button:nth-child(1) {
  background-color: var(--info-color);
} /* Manage Users */
.admin-actions .admin-action-button:nth-child(2) {
  background-color: var(--success-color);
} /* Create Group */
.admin-actions .admin-action-button:nth-child(3) {
  background-color: var(--primary-color);
} /* Manage Groups */
.admin-actions .admin-action-button:nth-child(4) {
  background-color: var(--warning-color);
  color: var(--text-color);
} /* Applications - yellow often needs dark text */
.admin-actions .admin-action-button.view-as-student-button {
  background-color: var(--secondary-color);
} /* View as Student */

.admin-actions .admin-action-button:hover:not([disabled]) {
  filter: brightness(110%);
}

.admin-summary-placeholder {
  margin-top: 2rem;
  padding: 1.5rem;
  background-color: #f8f9fa;
  border: 1px dashed var(--border-color);
  border-radius: var(--border-radius);
  text-align: center;
  color: #6c757d;
}
.admin-summary-placeholder .panel-title {
  font-size: 1.3rem;
  color: var(--header-bg-color);
  margin-bottom: 1rem;
}

@media (max-width: 768px) {
  .admin-actions {
    grid-template-columns: 1fr; /* Stack buttons on smaller screens */
  }
}
</style>
