<template>
  <div class="dashboard-view card-style">
    <header class="dashboard-view-header">
      <div class="header-content">
        <h2 class="view-title">
          <i class="fas fa-tachometer-alt"></i>
          {{
            isAdminViewingAsStudent
              ? "Studentu Panelis (Admina Skats)"
              : "Mans Panelis"
          }}
        </h2>
        <button
          v-if="!isAdminViewingAsStudent"
          @click="logout"
          class="action-button danger-button logout-button"
        >
          <i class="fas fa-sign-out-alt"></i> Iziet
        </button>
        <div v-if="isAdminViewingAsStudent" class="admin-view-notice">
          <i class="fas fa-info-circle"></i> Jūs redzat studentu paneli. Dati
          tiek rādīti ar administratora tiesībām.
        </div>
      </div>
    </header>

    <section class="dashboard-intro">
      <p v-if="!isAdminViewingAsStudent">
        Sveicināti KasKurKa! Šeit jūs varat ērti pārvaldīt savus mācību darbus,
        sekot līdzi termiņiem un sadarboties ar kursabiedriem.
      </p>
      <p v-else>
        Šis ir studentu paneļa priekšskatījums. Šeit varat redzēt, kā studenti
        mijiedarbojas ar sistēmu. Ņemiet vērā, ka datu apjoms (piem., mājasdarbu
        saraksts) atspoguļo jūsu administratora tiesības (redzat visu).
      </p>
    </section>

    <nav class="dashboard-actions">
      <button class="action-button" @click="navigateToAddHomework">
        <i class="fas fa-plus-circle"></i> Pievienot Mājasdarbu
      </button>
      <button class="action-button" @click="navigateToAddTest">
        <i class="fas fa-calendar-plus"></i> Pievienot Pārbaudes Darbu
      </button>
      <button class="action-button" @click="navigateToHomeworkList">
        <i class="fas fa-list-ul"></i> Visi Darbi
      </button>
      <button class="action-button" @click="navigateToGroupList">
        <i class="fas fa-users"></i> Manas Grupas
      </button>
    </nav>

    <hr class="section-divider" />

    <!-- Upcoming Items Panel -->
    <section class="upcoming-items-panel">
      <h3 class="panel-title"><i class="fas fa-bell"></i> Tuvākie Notikumi</h3>
      <div v-if="isLoadingItems" class="loading-indicator">
        <i class="fas fa-spinner fa-spin"></i> Notiek aktuālo darbu ielāde...
      </div>
      <div v-if="fetchError" class="error-message">{{ fetchError }}</div>

      <div
        v-if="!isLoadingItems && !fetchError"
        class="upcoming-columns-container"
      >
        <div class="upcoming-column card-style-inner">
          <h4>
            <i class="fas fa-book-reader icon-homework"></i> Tuvākie Mājasdarbi
            <span v-if="isAdminViewingAsStudent" class="admin-scope-indicator"
              >(Admina Skats)</span
            >
          </h4>
          <ul v-if="upcomingHomeworks.length > 0" class="upcoming-list">
            <li
              v-for="hw in upcomingHomeworks"
              :key="hw._id"
              class="upcoming-item homework-item"
              @click="navigateToItemDetails(hw._id, 'homework')"
              title="Skatīt mājasdarba detaļas"
            >
              <span class="item-subject">{{ hw.subject }}</span>
              <span class="item-date">
                <i class="fas fa-calendar-alt"></i> Termiņš:
                {{ formatDate(hw.dueDate) }}
              </span>
              <span class="item-group">
                <i class="fas fa-layer-group"></i>
                {{ hw.customGroupName || "Nezināma grupa" }}
              </span>
            </li>
          </ul>
          <p v-else class="no-items-message">
            <i class="fas fa-folder-open"></i> Nav tuvāko mājasdarbu.
          </p>
        </div>

        <div class="upcoming-column card-style-inner">
          <h4>
            <i class="fas fa-feather-alt icon-test"></i> Tuvākie Pārbaudes Darbi
            <span v-if="isAdminViewingAsStudent" class="admin-scope-indicator"
              >(Admina Skats)</span
            >
          </h4>
          <ul v-if="upcomingTests.length > 0" class="upcoming-list">
            <li
              v-for="test in upcomingTests"
              :key="test._id"
              class="upcoming-item test-item"
              @click="navigateToItemDetails(test._id, 'test')"
              title="Skatīt pārbaudes darba detaļas"
            >
              <span class="item-subject">{{ test.subject }}</span>
              <span class="item-date">
                <i class="fas fa-calendar-check"></i> Norise:
                {{ formatDate(test.eventDate)
                }}{{ test.eventTime ? ", " + test.eventTime : "" }}
              </span>
              <span class="item-group">
                <i class="fas fa-layer-group"></i>
                {{ test.customGroupName || "Nezināma grupa" }}
              </span>
            </li>
          </ul>
          <p v-else class="no-items-message">
            <i class="fas fa-folder-open"></i> Nav tuvāko pārbaudes darbu.
          </p>
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
        <button
          class="action-button secondary-button"
          @click="navigateToHomeworkList"
        >
          <i class="fas fa-eye"></i> Skatīt Visus Darbus Sarakstā
        </button>
      </div>
    </section>
  </div>
</template>

<script>
import axios from "axios";

export default {
  name: "DashboardView",
  props: {
    currentUser: Object,
    isAdminViewingAsStudent: {
      // New prop
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      upcomingHomeworks: [],
      upcomingTests: [],
      isLoadingItems: true,
      fetchError: "",
      MAX_DISPLAY_ITEMS: 3,
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
      // API calls will use the admin token if admin is viewing as student.
      // Backend will return all items for admin.
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
        return dateString; // Fallback
      }
    },
    navigateToItemDetails(itemId, itemType) {
      console.log(`Navigate to details for ${itemType} ID: ${itemId}`);
      this.$emit("navigateToHomeworkList");
    },
  },
  watch: {
    // Watch for currentUser changes, especially if admin switches to student view after component is mounted.
    // Or if user logs out and this component was somehow still active (less likely with current App.vue logic)
    currentUser: {
      handler() {
        this.fetchUpcomingItems();
      },
      deep: true, // In case currentUser internal properties change that affect data fetching
      immediate: true, // Fetch on initial mount
    },
  },
};
</script>

<style scoped>
.dashboard-view {
  /* Inherits .card-style from App.vue global styles */
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
  flex-wrap: wrap; /* Allow wrapping if space is tight */
  gap: 0.5rem;
}
.dashboard-view-header .view-title {
  color: var(--header-bg-color);
  margin: 0;
  font-size: 1.8rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-grow: 1; /* Allow title to take space */
}
.admin-view-notice {
  font-size: 0.85rem;
  color: var(--warning-color);
  background-color: rgba(255, 193, 7, 0.1);
  padding: 0.5rem 0.75rem;
  border-radius: var(--border-radius);
  border: 1px solid var(--warning-color);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.logout-button {
  /* Using global .action-button and specific .danger-button */
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

.dashboard-actions {
  margin-bottom: 1.5rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem; /* Space between buttons */
  justify-content: center; /* Center buttons */
}
.dashboard-actions .action-button {
  /* Uses global .action-button */
  flex-grow: 1; /* Allow buttons to grow */
  min-width: 200px; /* Minimum width for better wrapping */
  background-color: var(--primary-color); /* Default to primary */
}
.dashboard-actions .action-button:nth-child(2) {
  background-color: var(--info-color);
}
.dashboard-actions .action-button:nth-child(3) {
  background-color: var(--success-color);
}
.dashboard-actions .action-button:nth-child(4) {
  background-color: var(--secondary-color);
}

.dashboard-actions .action-button:hover:not([disabled]) {
  filter: brightness(110%);
}

.section-divider {
  border: 0;
  height: 1px;
  background-color: var(--border-color);
  margin: 2rem 0;
}

/* Upcoming Items Panel Styles */
.upcoming-items-panel {
  margin-top: 1.5rem;
}
.upcoming-items-panel .panel-title {
  font-size: 1.5rem;
  color: var(--header-bg-color);
  margin-bottom: 1.5rem;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
}

.upcoming-columns-container {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem; /* Space between columns */
}
.upcoming-column {
  flex: 1;
  min-width: 300px; /* Minimum width before wrapping */
}
.card-style-inner {
  /* For cards within the main card */
  background-color: var(--card-bg-color);
  border-radius: var(--border-radius);
  box-shadow: var(--shadow-sm);
  padding: 1.25rem;
  border: 1px solid var(--border-color);
}

.upcoming-column h4 {
  color: var(--header-bg-color);
  margin-top: 0;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--border-color);
  font-size: 1.25rem; /* Adjusted size */
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.6rem;
}
.admin-scope-indicator {
  font-size: 0.7rem;
  font-weight: normal;
  color: var(--secondary-color);
  margin-left: 0.5em;
}
.icon-homework {
  color: var(--primary-color);
}
.icon-test {
  color: var(--warning-color);
}

.upcoming-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.upcoming-item {
  padding: 0.8rem 1rem;
  margin-bottom: 0.75rem;
  border-radius: var(--border-radius);
  border-left-width: 5px;
  border-left-style: solid;
  background-color: #f8f9fa; /* Lighter background for items */
  box-shadow: var(--shadow-sm);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  cursor: pointer;
}
.upcoming-item:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}
.upcoming-item.homework-item {
  border-left-color: var(--primary-color);
}
.upcoming-item.test-item {
  border-left-color: var(--warning-color);
}

.upcoming-item span {
  display: block;
  font-size: 0.95rem;
}
.upcoming-item .item-subject {
  font-weight: 600;
  color: var(--text-color);
  margin-bottom: 0.3rem;
  font-size: 1.05rem;
}
.upcoming-item .item-date,
.upcoming-item .item-group {
  color: #6c757d;
  font-size: 0.85rem;
  margin-bottom: 0.2rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.no-items-message {
  color: #6c757d;
  font-style: italic;
  padding: 1rem 0;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-size: 0.95rem;
}
.view-all-link-container {
  text-align: center;
  margin-top: 1.5rem;
}
.view-all-link-container .action-button {
  /* Using global .action-button and .secondary-button */
}

/* Loading and Error messages inherit from global */
</style>
