<template>
  <div class="notification-list-view card-style">
    <!-- Poga, lai dotos atpakaļ uz informācijas paneli -->
    <button
      @click="goBackToDashboard"
      class="back-button"
      :disabled="isLoading || isProcessing"
    >
      <i class="fas fa-arrow-left"></i> Atpakaļ uz Paneli
    </button>
    <!-- Skata virsraksts ar ikonu -->
    <h2 class="view-title"><i class="fas fa-bell"></i> Visi Paziņojumi</h2>

    <!-- Filtru panelis paziņojumu saraksta filtrēšanai -->
    <div class="filters-panel card-style-inner">
      <div class="filters-header">
        <!-- Filtru paneļa virsraksts -->
        <h3 class="filters-title"><i class="fas fa-filter"></i> Filtri</h3>
        <!-- Poga "Atzīmēt visus kā izlasītus", redzama, ja ir nelasīti paziņojumi -->
        <button
          v-if="hasUnreadNotifications"
          @click="markAllAsRead"
          class="action-button-small mark-all-view-btn"
          :disabled="isProcessing"
          title="Atzīmēt visus kā izlasītus"
        >
          <i class="fas fa-check-double"></i> Atzīmēt Visus kā Izlasītus
        </button>
      </div>
      <!-- Filtru grupa statusa izvēlei -->
      <div class="filter-group">
        <label for="statusFilter">Rādīt:</label>
        <select
          id="statusFilter"
          v-model="statusFilter"
          @change="filterNotifications"
          :disabled="isLoading || isProcessing"
        >
          <option value="all">Visi</option>
          <option value="unread">Neizlasītie</option>
          <option value="read">Izlasītie</option>
        </select>
      </div>
    </div>

    <!-- Indikators, kas tiek rādīts, kamēr notiek paziņojumu ielāde -->
    <div v-if="isLoading" class="loading-indicator">
      <i class="fas fa-spinner fa-spin"></i> Notiek paziņojumu ielāde...
    </div>
    <!-- Kļūdas ziņojums, ja notikusi kļūda ielādējot paziņojumus -->
    <div v-else-if="errorMessage" class="error-message">
      <i class="fas fa-exclamation-triangle"></i> {{ errorMessage }}
    </div>
    <!-- Ziņojums, ja pēc filtrēšanas nav atrasts neviens paziņojums -->
    <div
      v-else-if="displayedNotifications.length === 0"
      class="empty-list-message card-style-inner"
    >
      <i class="fas fa-folder-open fa-3x"></i>
      <p>Nav paziņojumu, kas atbilst jūsu filtriem.</p>
      <p v-if="statusFilter !== 'all'">Mēģiniet izvēlēties "Visi".</p>
    </div>

    <!-- Konteiners paziņojumu sarakstam -->
    <div v-else class="notifications-container">
      <!-- Cikls cauri attēlojamajiem paziņojumiem -->
      <div
        v-for="notification in displayedNotifications"
        :key="notification._id"
        class="list-item notification-entry card-style-inner"
        :class="{ 'is-unread': !notification.isRead }"
      >
        <!-- Paziņojuma elementa galvene ar ikonu un saturu -->
        <div class="notification-entry-header">
          <!-- Paziņojuma tipa ikona -->
          <div class="notification-icon-type">
            <i :class="getNotificationIcon(notification.type)"></i>
          </div>
          <!-- Paziņojuma galvenais saturs (ziņa un laika zīmogs) -->
          <div class="notification-main-content">
            <p class="notification-message">{{ notification.message }}</p>
            <small class="notification-timestamp">{{
              formatFullDateTime(notification.createdAt)
            }}</small>
          </div>
        </div>
        <!-- Paziņojuma darbību pogas (atzīmēt kā izlasītu, dzēst) -->
        <div class="notification-entry-actions">
          <!-- Poga "Atzīmēt kā izlasītu", redzama tikai nelasītiem paziņojumiem -->
          <button
            v-if="!notification.isRead"
            @click="markOneAsRead(notification._id)"
            class="action-button-small mark-as-read-btn"
            :disabled="isProcessing"
            title="Atzīmēt kā izlasītu"
          >
            <i class="fas fa-envelope-open"></i>
          </button>
          <!-- Dzēšanas poga -->
          <button
            @click="deleteNotification(notification._id)"
            class="action-button-small delete-notification-btn"
            :disabled="isProcessing"
            title="Dzēst paziņojumu"
          >
            <i class="fas fa-trash-alt"></i>
          </button>
        </div>
      </div>
    </div>
    <!-- Nākotnē: Pievienot lapošanu, ja ir daudz paziņojumu -->
  </div>
</template>

<script>
import axios from "axios";

export default {
  name: "NotificationListView", // Komponenta nosaukums
  props: {
    currentUser: Object, // Pašreizējā lietotāja dati (varētu būt nepieciešami nākotnē)
  },
  inject: ["fetchUserNotifications"], // Injektē funkciju no App.vue, lai atjaunotu paziņojumu skaitu galvenē
  data() {
    return {
      allNotifications: [], // Visi ielādētie paziņojumi
      displayedNotifications: [], // Paziņojumi, kas tiek attēloti pēc filtrēšanas
      isLoading: true, // Vai notiek datu ielāde
      isProcessing: false, // Vai notiek kāda darbība (atzīmēšana, dzēšana)
      errorMessage: "", // Kļūdas ziņojums
      statusFilter: "all", // Pašreizējais statusa filtrs ('all', 'unread', 'read')
    };
  },
  computed: {
    // Aprēķina, vai ir kāds nelasīts paziņojums
    hasUnreadNotifications() {
      return this.allNotifications.some((n) => !n.isRead);
    },
  },
  created() {
    this.loadAllNotifications(); // Ielādē visus paziņojumus, kad komponents tiek izveidots
  },
  methods: {
    // Novirza lietotāju atpakaļ uz informācijas paneli
    goBackToDashboard() {
      this.$emit("navigateToDashboard");
    },
    // Ielādē visus lietotāja paziņojumus no servera
    async loadAllNotifications() {
      this.isLoading = true; // Sāk ielādes stāvokli
      this.errorMessage = ""; // Notīra iepriekšējo kļūdas ziņojumu
      try {
        const response = await axios.get("/api/notifications/all"); // API pieprasījums
        this.allNotifications = response.data; // Saglabā saņemtos datus
        this.filterNotifications(); // Piemēro sākotnējo filtru
      } catch (error) {
        console.error("Error fetching all notifications:", error);
        this.errorMessage =
          error.response?.data?.msg || "Kļūda ielādējot visus paziņojumus.";
      } finally {
        this.isLoading = false; // Beidz ielādes stāvokli
      }
    },
    // Filtrē paziņojumus atbilstoši izvēlētajam statusa filtram
    filterNotifications() {
      if (this.statusFilter === "all") {
        this.displayedNotifications = [...this.allNotifications];
      } else if (this.statusFilter === "unread") {
        this.displayedNotifications = this.allNotifications.filter(
          (n) => !n.isRead
        );
      } else if (this.statusFilter === "read") {
        this.displayedNotifications = this.allNotifications.filter(
          (n) => n.isRead
        );
      }
    },
    // Formatē datuma un laika virkni uz lokalizētu formātu
    formatFullDateTime(dateString) {
      if (!dateString) return "N/A"; // Ja datums nav norādīts
      const options = {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      };
      try {
        return new Date(dateString).toLocaleString("lv-LV", options);
      } catch (e) {
        return dateString; // Atgriež oriģinālo virkni, ja kļūda
      }
    },
    // Atgriež ikonu klasi atkarībā no paziņojuma tipa
    getNotificationIcon(type) {
      switch (type) {
        case "NEW_HOMEWORK":
          return "fas fa-book"; // Jauns mājasdarbs
        case "NEW_TEST":
          return "fas fa-file-alt"; // Jauns pārbaudes darbs
        case "GROUP_APPLICATION_APPROVED":
          return "fas fa-user-check"; // Grupas pieteikums apstiprināts
        case "GROUP_APPLICATION_REJECTED":
          return "fas fa-user-times"; // Grupas pieteikums noraidīts
        case "ADMIN_ADDED_TO_GROUP":
          return "fas fa-user-plus"; // Administrators pievienoja grupai
        case "ADMIN_REMOVED_FROM_GROUP":
          return "fas fa-user-minus"; // Administrators noņēma no grupas
        case "COMMENT_ON_OWNED_ITEM":
          return "fas fa-comment"; // Komentārs jūsu ierakstam
        case "GROUP_DELETED_MEMBER":
          return "fas fa-users-slash"; // Noņemts no grupas, jo grupa dzēsta
        default:
          return "fas fa-info-circle"; // Noklusējuma ikona
      }
    },
    // Atzīmē vienu paziņojumu kā izlasītu
    async markOneAsRead(notificationId) {
      this.isProcessing = true; // Sāk apstrādes stāvokli
      try {
        await axios.put(`/api/notifications/${notificationId}/read`); // API pieprasījums
        await this.loadAllNotifications(); // Pārlādē visus paziņojumus, lai atspoguļotu izmaiņas
        if (this.fetchUserNotifications) this.fetchUserNotifications(); // Atjaunina nelasīto skaitu App.vue
      } catch (error) {
        alert("Kļūda, atzīmējot paziņojumu kā izlasītu."); // Parāda kļūdas ziņojumu
      } finally {
        this.isProcessing = false; // Beidz apstrādes stāvokli
      }
    },
    // Atzīmē visus nelasītos paziņojumus kā izlasītus
    async markAllAsRead() {
      this.isProcessing = true;
      try {
        await axios.put("/api/notifications/read-all");
        await this.loadAllNotifications();
        if (this.fetchUserNotifications) this.fetchUserNotifications();
      } catch (error) {
        alert("Kļūda, atzīmējot visus paziņojumus kā izlasītus.");
      } finally {
        this.isProcessing = false;
      }
    },
    // Dzēš paziņojumu
    async deleteNotification(notificationId) {
      if (!confirm("Vai tiešām vēlaties dzēst šo paziņojumu?")) return; // Pieprasa apstiprinājumu
      this.isProcessing = true;
      try {
        await axios.delete(`/api/notifications/${notificationId}`);
        await this.loadAllNotifications();
        if (this.fetchUserNotifications) this.fetchUserNotifications();
      } catch (error) {
        alert("Kļūda, dzēšot paziņojumu.");
      } finally {
        this.isProcessing = false;
      }
    },
  },
};
</script>

<style scoped>
/* Paziņojumu saraksta skata galvenā konteinera stils */
.notification-list-view {
  padding: 1.5rem; /* Iekšējā atkāpe */
}
/* Skata virsraksta stils */
.view-title {
  color: var(--header-bg-color); /* Virsraksta krāsa */
  margin: 0 0 1.5rem 0; /* Atstarpes ap virsrakstu */
  font-size: 1.8rem; /* Virsraksta fonta lielums */
  font-weight: 600; /* Virsraksta fonta biezums */
  display: flex; /* Izmanto flexbox elementu izlīdzināšanai */
  align-items: center; /* Vertikāli centrē elementus */
  justify-content: center; /* Horizontāli centrē elementus */
  gap: 0.75rem; /* Atstarpe starp ikonu un tekstu virsrakstā */
}

/* Filtru paneļa stils */
.filters-panel {
  margin-bottom: 1.5rem; /* Atstarpe zem filtra paneļa */
  padding: 1rem; /* Iekšējā atkāpe */
}
/* Filtru paneļa galvenes stils */
.filters-header {
  display: flex; /* Izmanto flexbox elementu izlīdzināšanai */
  justify-content: space-between; /* Izlīdzina elementus ar atstarpi starp tiem */
  align-items: center; /* Vertikāli centrē elementus */
  margin-bottom: 1rem; /* Atstarpe zem galvenes */
  padding-bottom: 0.5rem; /* Iekšējā atkāpe zemāk */
  border-bottom: 1px solid var(--border-color); /* Apakšējā līnija */
}
/* Filtru paneļa virsraksta stils */
.filters-title {
  font-size: 1.2rem; /* Fonta lielums */
  color: var(--primary-color); /* Primārā krāsa virsrakstam */
  margin: 0; /* Noņem atstarpes */
  display: flex; /* Izmanto flexbox ikonai un tekstam */
  align-items: center; /* Vertikāli centrē ikonu un tekstu */
  gap: 0.5rem; /* Atstarpe starp ikonu un tekstu */
}
/* Filtru grupas stils */
.filter-group {
  display: flex; /* Izmanto flexbox elementu izlīdzināšanai */
  align-items: center; /* Vertikāli centrē elementus */
  gap: 0.5rem; /* Atstarpe starp etiķeti un izvēles lauku */
}
/* Etiķetes stils filtru grupā */
.filter-group label {
  font-size: 0.9em; /* Fonta lielums */
  font-weight: 500; /* Fonta biezums */
}
/* Izvēles lauka (select) stils filtru grupā */
.filter-group select {
  padding: 0.6rem; /* Iekšējā atkāpe */
  font-size: 0.95em; /* Fonta lielums */
  border-radius: var(--border-radius); /* Noapaļoti stūri */
  border: 1px solid var(--border-color); /* Apmale */
}
/* Pogas "Atzīmēt visus kā izlasītus" stils */
.mark-all-view-btn {
  background-color: var(--info-color); /* Fona krāsa */
  color: white; /* Teksta krāsa */
  padding: 0.4rem 0.8rem; /* Iekšējā atkāpe, līdzīgi kā nolaižamajā sarakstā */
  font-size: 0.85rem; /* Fonta lielums */
}
/* Pogas stils, kad pele ir virs tās */
.mark-all-view-btn:hover {
  background-color: #138496; /* Tumšāka fona krāsa */
}

/* Ziņojuma stils, ja saraksts ir tukšs */
.empty-list-message {
  text-align: center; /* Teksta līdzināšana centrā */
  padding: 2rem; /* Iekšējā atkāpe */
  color: #6c757d; /* Teksta krāsa */
}
/* Ikonas stils tukša saraksta ziņojumā */
.empty-list-message .fas {
  display: block; /* Padara ikonu par bloka elementu */
  margin-bottom: 1rem; /* Atstarpe zem ikonas */
  color: var(--secondary-color); /* Sekundārā krāsa ikonai */
  opacity: 0.5; /* Nedaudz caurspīdīga ikona */
}
/* Teksta stils tukša saraksta ziņojumā */
.empty-list-message p {
  font-size: 1.05rem; /* Fonta lielums */
  margin-bottom: 0.5rem; /* Atstarpe zem teksta */
}

/* Paziņojumu saraksta konteinera stils */
.notifications-container {
  margin-top: 1rem; /* Atstarpe virs konteinera */
}
/* Atsevišķa paziņojuma elementa stils */
.list-item.notification-entry {
  margin-bottom: 1rem; /* Atstarpe zem elementa */
  padding: 1rem; /* Iekšējā atkāpe */
  display: flex; /* Izmanto flexbox elementu izlīdzināšanai */
  justify-content: space-between; /* Izlīdzina elementus ar atstarpi starp tiem */
  align-items: flex-start; /* Līdzina elementus pie augšas (svarīgi darbību pogām) */
  gap: 1rem; /* Atstarpe starp galveno saturu un darbību pogām */
  border-left-width: 4px; /* Kreisās apmales biezums */
  border-left-style: solid; /* Kreisās apmales stils */
  border-left-color: var(
    --secondary-color
  ); /* Noklusējuma krāsa izlasītiem paziņojumiem */
}
/* Stils nelasītam paziņojumam */
.list-item.notification-entry.is-unread {
  background-color: #e9f5ff; /* Gaiši zils fons */
  border-left-color: var(--primary-color); /* Primārā krāsa kreisajai apmalei */
}
/* Stils nelasīta paziņojuma ziņai (biezāks fonts) */
.list-item.notification-entry.is-unread .notification-message {
  font-weight: 500; /* Biezāks fonts */
}

/* Paziņojuma elementa galvenes (ikona + saturs) stils */
.notification-entry-header {
  display: flex; /* Izmanto flexbox elementu izlīdzināšanai */
  align-items: flex-start; /* Līdzina elementus pie augšas */
  gap: 0.75rem; /* Atstarpe starp ikonu un saturu */
  flex-grow: 1; /* Ļauj šim blokam aizpildīt pieejamo vietu */
}
/* Paziņojuma tipa ikonas stils */
.notification-icon-type {
  font-size: 1.3rem; /* Ikonas lielums */
  color: var(--primary-color); /* Primārā krāsa ikonai */
  margin-top: 2px; /* Neliela atkāpe no augšas labākai līdzināšanai ar tekstu */
  width: 25px; /* Fiksēts platums ikonai */
  text-align: center; /* Centrē ikonu tās platumā */
}
/* Paziņojuma galvenā satura (ziņa, laika zīmogs) bloka stils */
.notification-main-content {
  flex-grow: 1; /* Ļauj šim blokam aizpildīt pieejamo vietu */
}
/* Paziņojuma ziņas stils */
.notification-message {
  margin: 0 0 0.3rem 0; /* Atstarpes */
  font-size: 0.95rem; /* Fonta lielums */
  line-height: 1.5; /* Rindstarpa */
  color: var(--text-color); /* Teksta krāsa */
  word-break: break-word; /* Pārnes garus vārdus jaunā rindā */
}
/* Paziņojuma laika zīmoga stils */
.notification-timestamp {
  font-size: 0.8rem; /* Fonta lielums */
  color: #6c757d; /* Sekundārā teksta krāsa */
}

/* Paziņojuma darbību pogu bloka stils */
.notification-entry-actions {
  display: flex; /* Izmanto flexbox elementu izlīdzināšanai */
  flex-direction: column; /* Sakārto pogas vertikāli */
  align-items: flex-end; /* Līdzina pogas pa labi */
  gap: 0.5rem; /* Atstarpe starp pogām */
  margin-left: 1rem; /* Atstarpe no kreisās puses (no galvenā satura) */
}
/* Mazo darbību pogu stils */
.action-button-small {
  padding: 0.3rem 0.6rem; /* Iekšējā atkāpe */
  font-size: 0.8rem; /* Fonta lielums */
  min-width: 30px; /* Minimālais platums pogām ar tikai ikonu */
  text-align: center; /* Centrē tekstu/ikonu pogā */
}
/* Pogas "Atzīmēt kā izlasītu" stils */
.mark-as-read-btn {
  background-color: var(--info-color); /* Fona krāsa */
  color: white; /* Teksta krāsa */
}
/* Pogas "Atzīmēt kā izlasītu" stils, kad pele ir virs tās */
.mark-as-read-btn:hover {
  background-color: #138496; /* Tumšāka fona krāsa */
}
/* Dzēšanas pogas stils */
.delete-notification-btn {
  background-color: var(--danger-color); /* Fona krāsa */
  color: white; /* Teksta krāsa */
}
/* Dzēšanas pogas stils, kad pele ir virs tās */
.delete-notification-btn:hover {
  background-color: #c82333; /* Tumšāka fona krāsa */
}
</style>
