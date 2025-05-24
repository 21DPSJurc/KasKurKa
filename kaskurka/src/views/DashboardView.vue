<template>
  <div class="dashboard-view">
    <header class="dashboard-header">
      <h2>Mājasdarbu Panelis</h2>
      <button @click="logout" class="action-button logout-button">Iziet</button>
    </header>
    <section class="dashboard-content">
      <p>
        Laipni lūgti KasKurKa sistēmā! Pārvaldiet savus mājasdarbus, pārbaudes
        darbus un grupas šeit.
      </p>

      <nav class="dashboard-actions">
        <button class="action-button" @click="navigateToAddHomework">
          Pievienot Mājasdarbu (2.2.3)
        </button>
        <button class="action-button" @click="navigateToAddTest">
          Pievienot Pārbaudes Darbu (2.2.4)
        </button>
        <button class="action-button" @click="navigateToHomeworkList">
          Skatīt Sarakstu (2.2.5)
        </button>
        <button class="action-button" @click="navigateToGroupList">
          Skatīt/Pievienoties Grupām
        </button>
      </nav>

      <!-- Removed content-placeholder section -->
    </section>
  </div>
</template>

<script>
export default {
  name: "DashboardView",
  props: {
    currentUser: Object,
  },
  methods: {
    logout() {
      this.$emit("logout");
    },
    navigateToAddHomework() {
      this.$emit("navigateToAddHomework");
    },
    navigateToAddTest() {
      this.$emit("navigateToAddTest");
    },
    navigateToHomeworkList() {
      this.$emit("navigateToHomeworkList");
    },
    navigateToGroupList() {
      this.$emit("navigateToGroupList");
    }, // Added
  },
};
</script>

<style scoped>
/* Styles are the same as previous DashboardView.vue */
.dashboard-view {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  text-align: left;
  width: 100%;
}
.dashboard-header {
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
  background-color: #e74c3c;
  padding: 10px 20px;
}
.logout-button:hover {
  background-color: #c0392b;
}
.dashboard-content p {
  font-size: 1.1em;
  color: #555;
  margin-bottom: 20px;
}
.dashboard-actions {
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
.dashboard-actions .action-button[disabled] {
  background-color: #bdc3c7;
  cursor: not-allowed;
}
.dashboard-actions .action-button[disabled]:hover {
  background-color: #bdc3c7;
}
/* .content-placeholder styles are no longer needed as the div is removed */
</style>
