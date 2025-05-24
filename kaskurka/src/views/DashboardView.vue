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

      <!-- Upcoming Items Panel -->
      <section class="upcoming-items-panel">
        <div v-if="isLoadingItems" class="loading-message">
          <p>Notiek aktuālo darbu ielāde...</p>
        </div>
        <div v-if="fetchError" class="error-message">{{ fetchError }}</div>

        <div
          v-if="!isLoadingItems && !fetchError"
          class="upcoming-columns-container"
        >
          <div class="upcoming-column">
            <h4>
              <i class="fas fa-book-reader icon-homework"></i> Tuvākie
              Mājasdarbi
            </h4>
            <ul v-if="upcomingHomeworks.length > 0" class="upcoming-list">
              <li
                v-for="hw in upcomingHomeworks"
                :key="hw._id"
                class="upcoming-item homework-item"
              >
                <span class="item-subject">{{ hw.subject }}</span>
                <span class="item-date"
                  >Termiņš: {{ formatDate(hw.dueDate) }}</span
                >
                <span class="item-group">Grupa: {{ hw.customGroupName }}</span>
              </li>
            </ul>
            <p v-else class="no-items-message">Nav tuvāko mājasdarbu.</p>
          </div>

          <div class="upcoming-column">
            <h4>
              <i class="fas fa-feather-alt icon-test"></i> Tuvākie Pārbaudes
              Darbi
            </h4>
            <ul v-if="upcomingTests.length > 0" class="upcoming-list">
              <li
                v-for="test in upcomingTests"
                :key="test._id"
                class="upcoming-item test-item"
              >
                <span class="item-subject">{{ test.subject }}</span>
                <span class="item-date"
                  >Norise: {{ formatDate(test.eventDate)
                  }}{{ test.eventTime ? ", " + test.eventTime : "" }}</span
                >
                <span class="item-group"
                  >Grupa: {{ test.customGroupName }}</span
                >
              </li>
            </ul>
            <p v-else class="no-items-message">Nav tuvāko pārbaudes darbu.</p>
          </div>
        </div>
        <div
          v-if="
            !isLoadingItems &&
            !fetchError &&
            (upcomingHomeworks.length > 0 || upcomingTests.length > 0)
          "
          class="view-all-link-container"
        >
          <button class="action-button-small" @click="navigateToHomeworkList">
            Skatīt Visus Darbus Sarakstā
          </button>
        </div>
      </section>
    </section>
  </div>
</template>

<script>
import axios from "axios";

export default {
  name: "DashboardView",
  props: {
    currentUser: Object,
  },
  data() {
    return {
      upcomingHomeworks: [],
      upcomingTests: [],
      isLoadingItems: true,
      fetchError: "",
      MAX_DISPLAY_ITEMS: 3, // Max items to show in each list
    };
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
    },
    async fetchUpcomingItems() {
      this.isLoadingItems = true;
      this.fetchError = "";
      try {
        const [homeworkRes, testsRes] = await Promise.all([
          axios.get("/api/homework"),
          axios.get("/api/tests"),
        ]);
        this.upcomingHomeworks = homeworkRes.data.slice(
          0,
          this.MAX_DISPLAY_ITEMS
        );
        this.upcomingTests = testsRes.data.slice(0, this.MAX_DISPLAY_ITEMS);
      } catch (error) {
        console.error("Error fetching upcoming items:", error);
        this.fetchError =
          error.response?.data?.msg || "Kļūda ielādējot aktuālos darbus.";
      } finally {
        this.isLoadingItems = false;
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
  },
  mounted() {
    this.fetchUpcomingItems();
    // Font Awesome link - ideally add this to public/index.html head for global use
    if (!document.getElementById("font-awesome-css")) {
      const link = document.createElement("link");
      link.id = "font-awesome-css";
      link.rel = "stylesheet";
      link.href =
        "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css";
      document.head.appendChild(link);
    }
  },
};
</script>

<style scoped>
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

/* Upcoming Items Panel Styles */
.upcoming-items-panel {
  margin-top: 30px;
  padding: 20px;
  background-color: #f8f9fa; /* Light grey background */
  border-radius: 8px;
  border: 1px solid #e9ecef;
}
.upcoming-columns-container {
  display: flex;
  flex-wrap: wrap; /* Allow wrapping on smaller screens */
  gap: 20px;
}
.upcoming-column {
  flex: 1;
  min-width: 280px; /* Minimum width before wrapping */
  background-color: #ffffff;
  padding: 15px;
  border-radius: 6px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.07);
}
.upcoming-column h4 {
  color: #34495e;
  margin-top: 0;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #ecf0f1;
  font-size: 1.2em;
  display: flex;
  align-items: center;
}
.upcoming-column h4 .fas {
  margin-right: 10px;
  font-size: 1.1em;
}
.icon-homework {
  color: #3498db; /* Blue for homework */
}
.icon-test {
  color: #e67e22; /* Orange for tests */
}

.upcoming-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.upcoming-item {
  padding: 12px;
  margin-bottom: 10px;
  border-radius: 4px;
  border-left-width: 4px;
  border-left-style: solid;
  background-color: #fdfdfd;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}
.upcoming-item.homework-item {
  border-left-color: #3498db;
}
.upcoming-item.test-item {
  border-left-color: #e67e22;
}
.upcoming-item span {
  display: block;
  font-size: 0.95em;
}
.upcoming-item .item-subject {
  font-weight: bold;
  color: #2c3e50;
  margin-bottom: 4px;
}
.upcoming-item .item-date {
  color: #7f8c8d;
  font-size: 0.9em;
  margin-bottom: 3px;
}
.upcoming-item .item-group {
  color: #2980b9;
  font-size: 0.85em;
  font-style: italic;
}
.no-items-message {
  color: #777;
  font-style: italic;
  padding: 10px 0;
}
.loading-message,
.error-message {
  text-align: center;
  padding: 15px;
}
.view-all-link-container {
  text-align: center;
  margin-top: 20px;
}
.action-button-small {
  padding: 8px 15px;
  font-size: 0.9em;
  border-radius: 4px;
  cursor: pointer;
  border: none;
  color: white;
  background-color: #3498db;
}
.action-button-small:hover:not([disabled]) {
  background-color: #2980b9;
}
</style>
