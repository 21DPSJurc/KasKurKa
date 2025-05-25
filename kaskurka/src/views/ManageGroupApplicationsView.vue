<template>
  <div class="manage-group-applications-view card-style">
    <!-- Poga, lai dotos atpakaļ uz administratora paneli -->
    <!-- Atspējota, ja notiek ielādes vai apstrādes process -->
    <button
      @click="goBackToAdminDashboard"
      class="back-button"
      :disabled="isLoading || isProcessing"
    >
      <i class="fas fa-arrow-left"></i> Atpakaļ uz Admin Paneli
    </button>
    <!-- Skata virsraksts ar ikonu -->
    <h2 class="view-title">
      <i class="fas fa-clipboard-check"></i> Grupu Pieteikumu Pārvaldība
    </h2>

    <!-- Filtru panelis pieteikumu saraksta filtrēšanai -->
    <div class="filters-panel card-style-inner">
      <h3 class="filters-title">
        <i class="fas fa-filter"></i> Filtrēt Pieteikumus
      </h3>
      <!-- Filtru režģis ar statusa un grupas nosaukuma filtriem -->
      <div class="filters-grid">
        <!-- Statusa filtrs (Gaida, Apstiprinātie, Noraidītie, Visi) -->
        <div class="form-group">
          <label for="statusFilter">Statuss:</label>
          <select
            id="statusFilter"
            v-model="statusFilter"
            @change="fetchApplications"
            :disabled="isLoading || isProcessing"
          >
            <option value="pending">Gaida Apstiprinājumu</option>
            <option value="approved">Apstiprinātie</option>
            <option value="rejected">Noraidītie</option>
            <option value="">Visi Statusi</option>
          </select>
        </div>
        <!-- Grupas nosaukuma meklēšanas lauks -->
        <div class="form-group">
          <label for="groupNameFilter">Grupas nosaukums:</label>
          <input
            type="text"
            id="groupNameFilter"
            v-model="groupNameFilter"
            @input="debouncedFetchApplications"
            placeholder="Meklēt grupu..."
            :disabled="isLoading || isProcessing"
          />
        </div>
      </div>
    </div>

    <!-- Indikators, kas tiek rādīts, kamēr notiek pieteikumu ielāde -->
    <div v-if="isLoading" class="loading-indicator">
      <i class="fas fa-spinner fa-spin"></i> Notiek pieteikumu ielāde...
    </div>
    <!-- Kļūdas ziņojums, ja notikusi kļūda ielādējot pieteikumus -->
    <div v-else-if="errorMessage" class="error-message">
      <i class="fas fa-exclamation-triangle"></i> {{ errorMessage }}
    </div>
    <!-- Ziņojums, ja pēc filtrēšanas nav atrasts neviens pieteikums -->
    <div
      v-else-if="applications.length === 0"
      class="empty-list-message card-style-inner"
    >
      <i class="fas fa-folder-open fa-3x"></i>
      <p>Pēc izvēlētajiem kritērijiem nav atrasts neviens pieteikums.</p>
      <!-- Papildu ieteikums, ja aktīvi filtri -->
      <p v-if="statusFilter !== 'pending' || groupNameFilter">
        Mēģiniet mainīt filtru iestatījumus vai pārbaudīt "Gaida Apstiprinājumu"
        statusu.
      </p>
    </div>

    <!-- Konteiners pieteikumu sarakstam -->
    <div v-else class="applications-container">
      <!-- Cikls cauri pieteikumiem -->
      <div
        v-for="app in applications"
        :key="app._id"
        class="list-item application-item card-style-inner"
        :class="`status-border-${app.status}`"
      >
        <!-- Pieteikuma elementa galvene ar ikonu un pamatinformāciju -->
        <div class="app-item-header">
          <!-- Statusa ikona -->
          <div class="app-icon" :class="`status-icon-${app.status}`">
            <i :class="getIconForStatus(app.status)"></i>
          </div>
          <!-- Informācija par pieteikumu (grupa, pieteicējs) -->
          <div class="app-header-info">
            <h3>
              Pieteikums grupai:
              <span>{{ app.groupName || "Nezināma Grupa" }}</span>
            </h3>
            <p class="applicant-info">
              <i class="fas fa-user"></i> {{ app.userFirstName }} ({{
                app.userEmail
              }})
            </p>
          </div>
        </div>
        <!-- Pieteikuma elementa saturs ar metadatiem un ziņu -->
        <div class="app-item-content">
          <p class="app-meta">
            <i class="fas fa-calendar-plus"></i> Pieteikts:
            <strong>{{ formatDate(app.appliedAt) }}</strong>
          </p>
          <p class="app-meta">
            <i class="fas fa-info-circle"></i> Statuss:
            <span class="status-text" :class="`status-text-${app.status}`">{{
              getStatusText(app.status)
            }}</span>
          </p>
          <!-- Pieteicēja ziņa, ja tāda ir -->
          <div v-if="app.message" class="application-message-display">
            <strong><i class="fas fa-comment-alt"></i> Pieteicēja ziņa:</strong>
            <p class="message-text">{{ app.message }}</p>
          </div>
          <!-- Informācija par apstrādi, ja pieteikums ir apstrādāts -->
          <div v-if="app.processedAt" class="app-meta processed-info">
            <i class="fas fa-user-check"></i> Apstrādāja:
            {{ app.processedBy ? "Administrators" : "Neznāms" }} |
            <i class="fas fa-clock"></i> {{ formatDate(app.processedAt) }}
            <!-- Apstrādes iemesls, ja tāds ir (piem., ja grupa dzēsta) -->
            <span v-if="app.reason">
              | <i class="fas fa-info-circle"></i> Iemesls:
              {{ app.reason }}</span
            >
          </div>
        </div>

        <!-- Darbību pogas pieteikumiem ar statusu 'pending' -->
        <div class="app-item-actions" v-if="app.status === 'pending'">
          <!-- Apstiprināšanas poga -->
          <button
            class="action-button success-button"
            @click="processApplication(app._id, 'approve')"
            :disabled="isProcessing && processingId === app._id"
          >
            <i class="fas fa-check-circle"></i>
            <!-- Dinamisks teksts pogai atkarībā no apstrādes stāvokļa -->
            {{
              isProcessing &&
              processingId === app._id &&
              currentAction === "approve"
                ? "Apstiprina..."
                : "Apstiprināt"
            }}
          </button>
          <!-- Noraidīšanas poga -->
          <button
            class="action-button danger-button"
            @click="processApplication(app._id, 'reject')"
            :disabled="isProcessing && processingId === app._id"
          >
            <i class="fas fa-times-circle"></i>
            <!-- Dinamisks teksts pogai -->
            {{
              isProcessing &&
              processingId === app._id &&
              currentAction === "reject"
                ? "Noraida..."
                : "Noraidīt"
            }}
          </button>
        </div>
        <!-- Ziņojums par darbības rezultātu (veiksme/kļūda) konkrētam pieteikumam -->
        <div
          v-if="actionMessage[app._id]"
          :class="
            actionMessage[app._id].type === 'success'
              ? 'success-message-inline'
              : 'error-message-inline'
          "
        >
          <i
            :class="
              actionMessage[app._id].type === 'success'
                ? 'fas fa-check-circle'
                : 'fas fa-exclamation-circle'
            "
          ></i>
          {{ actionMessage[app._id].text }}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from "axios";
import _ from "lodash"; // Importē Lodash bibliotēku (piemēram, debounce funkcijai)

export default {
  name: "ManageGroupApplicationsView",
  data() {
    return {
      applications: [], // Masīvs ar ielādētajiem grupu pieteikumiem
      isLoading: true, // Norāda, vai notiek datu ielāde
      isProcessing: false, // Norāda, vai notiek pieteikuma apstrāde (apstiprināšana/noraidīšana)
      processingId: null, // ID pieteikumam, kas pašlaik tiek apstrādāts
      currentAction: "", // Pašreizējā darbība ('approve' vai 'reject')
      errorMessage: "", // Vispārīgs kļūdas ziņojums datu ielādei
      actionMessage: {}, // Objekts ziņojumiem par konkrētu pieteikumu apstrādes rezultātiem (atslēga ir pieteikuma ID)
      statusFilter: "pending", // Pašreizējais statusa filtrs (noklusējums: 'pending')
      groupNameFilter: "", // Meklēšanas vaicājums grupas nosaukumam
    };
  },
  created() {
    // Izsauc pieteikumu ielādes metodi, kad komponents tiek izveidots.
    this.fetchApplications();
    // Izveido debounce funkciju grupas nosaukuma meklēšanas apstrādei,
    // lai API pieprasījums netiktu veikts pie katras rakstzīmes ievades.
    this.debouncedFetchApplications = _.debounce(this.fetchApplications, 500);
  },
  watch: {
    // Vēro statusa filtra izmaiņas un atkārtoti ielādē pieteikumus.
    statusFilter() {
      this.fetchApplications();
    },
    // Grupas nosaukuma filtra izmaiņas tiek apstrādātas ar `debouncedFetchApplications` metodi `input` notikumā.
  },
  methods: {
    // Novirza lietotāju atpakaļ uz administratora paneli.
    goBackToAdminDashboard() {
      this.$emit("navigateToAdminDashboard");
    },
    // Asinhrona metode grupu pieteikumu ielādei no servera.
    async fetchApplications() {
      this.isLoading = true;
      this.errorMessage = "";
      // Notīra iepriekšējos darbību ziņojumus, jo saraksts tiek pārlādēts.
      // Varētu ieviest sarežģītāku loģiku, lai saglabātu ziņojumus redzamajiem elementiem.
      this.actionMessage = {};

      let params = {}; // Parametri API pieprasījumam
      if (this.statusFilter) params.status = this.statusFilter; // Pievieno statusa filtru
      // Ja serveris atbalsta filtrēšanu pēc grupas nosaukuma šim pieprasījumam,
      // pievieno to parametriem.
      if (this.groupNameFilter.trim())
        params.groupName = this.groupNameFilter.trim();

      try {
        // Nosūta GET pieprasījumu uz serveri ar sagatavotajiem parametriem.
        const response = await axios.get("/api/groups/applications", {
          params,
        });
        this.applications = response.data; // Saglabā saņemtos pieteikumus
      } catch (error) {
        console.error("Kļūda ielādējot grupu pieteikumus:", error);
        this.errorMessage =
          error.response?.data?.msg || "Kļūda ielādējot grupu pieteikumus.";
      } finally {
        this.isLoading = false; // Beidz ielādes stāvokli
      }
    },
    // Formatē datuma virkni uz lokalizētu formātu (DD.MM.GGGG HH:MM).
    formatDate(dateString) {
      if (!dateString) return "N/A";
      const options = {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      };
      try {
        return new Date(dateString).toLocaleDateString("lv-LV", options);
      } catch (e) {
        return dateString; // Atgriež oriģinālo virkni, ja kļūda
      }
    },
    // Atgriež ikonu atbilstoši pieteikuma statusam.
    getIconForStatus(statusKey) {
      const map = {
        pending: "fas fa-hourglass-half", // Gaida
        approved: "fas fa-check-circle", // Apstiprināts
        rejected: "fas fa-times-circle", // Noraidīts
      };
      return map[statusKey] || "fas fa-question-circle"; // Noklusējuma ikona
    },
    // Atgriež tekstuālu pieteikuma statusa aprakstu.
    getStatusText(statusKey) {
      const map = {
        pending: "Gaida apstiprinājumu",
        approved: "Apstiprināts",
        rejected: "Noraidīts",
      };
      return map[statusKey] || statusKey; // Atgriež statusa atslēgu, ja nav tulkojuma
    },
    // Asinhrona metode pieteikuma apstrādei (apstiprināšanai vai noraidīšanai).
    async processApplication(applicationId, action) {
      this.isProcessing = true; // Sāk apstrādes stāvokli
      this.processingId = applicationId; // Saglabā apstrādājamā pieteikuma ID
      this.currentAction = action; // Saglabā veicamo darbību ('approve' vai 'reject')
      // Notīra iepriekšējo darbības ziņojumu šim pieteikumam.
      this.actionMessage = { ...this.actionMessage, [applicationId]: null };

      // Izveido API URL atbilstoši darbībai.
      const url = `/api/groups/applications/${applicationId}/${action}`;

      try {
        // Nosūta PUT pieprasījumu uz serveri.
        const response = await axios.put(url);
        // Saglabā veiksmes ziņojumu no servera.
        this.actionMessage = {
          ...this.actionMessage,
          [applicationId]: { text: response.data.msg, type: "success" },
        };
        // Pēc īsa brīža atkārtoti ielādē pieteikumu sarakstu, lai atspoguļotu izmaiņas.
        setTimeout(() => {
          this.fetchApplications();
        }, 1800); // Gaida 1.8 sekundes
      } catch (error) {
        console.error(`Kļūda ${action} pieteikumu ${applicationId}:`, error);
        // Saglabā kļūdas ziņojumu no servera vai vispārīgu kļūdas ziņojumu.
        const errMsg =
          error.response?.data?.msg ||
          `Kļūda ${
            action === "approve" ? "apstiprinot" : "noraidot"
          } pieteikumu.`;
        this.actionMessage = {
          ...this.actionMessage,
          [applicationId]: { text: errMsg, type: "error" },
        };
      } finally {
        // Pēc noteikta laika beidz apstrādes stāvokli, lai poga atkal kļūtu aktīva
        // un lietotājs varētu izlasīt ziņojumu.
        setTimeout(() => {
          this.isProcessing = false;
          this.processingId = null;
          this.currentAction = "";
        }, 1800);
      }
    },
  },
};
</script>

<style scoped>
/* Stili tiek mantoti no globālā .card-style */
/* Grupu pieteikumu pārvaldības skata galvenā konteinera stils */
.manage-group-applications-view {
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

/* Filtru paneļa stils (izmanto .card-style-inner) */
.filters-panel {
  margin-bottom: 1.5rem; /* Atstarpe zem filtra paneļa */
  padding: 1rem; /* Iekšējā atkāpe */
}
/* Filtru paneļa virsraksta stils */
.filters-title {
  font-size: 1.2rem; /* Fonta lielums */
  color: var(--primary-color); /* Primārā krāsa virsrakstam */
  margin-top: 0; /* Noņem augšējo atstarpi */
  margin-bottom: 1rem; /* Atstarpe zem virsraksta */
  padding-bottom: 0.5rem; /* Iekšējā atkāpe zemāk */
  border-bottom: 1px solid var(--border-color); /* Apakšējā līnija */
  display: flex; /* Izmanto flexbox ikonai un tekstam */
  align-items: center; /* Vertikāli centrē ikonu un tekstu */
  gap: 0.5rem; /* Atstarpe starp ikonu un tekstu */
}
/* Filtru režģa stils */
.filters-grid {
  display: grid; /* Izmanto grid izkārtojumu */
  /* Automātiski pielāgo kolonnu skaitu, katra kolonna vismaz 220px plata */
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem; /* Atstarpe starp filtriem */
}
/* Formas grupas stils filtru režģī */
.filters-grid .form-group {
  margin-bottom: 0; /* Noņem apakšējo atstarpi, jo to kontrolē grid `gap` */
}
/* Etiķetes stils filtru režģī */
.filters-grid .form-group label {
  font-size: 0.9em; /* Fonta lielums */
  font-weight: 500; /* Fonta biezums */
}
/* Izvēles un ievades lauku stils filtru režģī */
.filters-grid .form-group select,
.filters-grid .form-group input[type="text"] {
  padding: 0.6rem; /* Iekšējā atkāpe */
  font-size: 0.95em; /* Fonta lielums */
}

/* Ziņojuma stils, ja saraksts ir tukšs (izmanto .card-style-inner) */
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

/* Pieteikumu saraksta konteinera stils */
.applications-container {
  margin-top: 1rem; /* Atstarpe virs konteinera */
}
/* Atsevišķa pieteikuma elementa stils (izmanto .card-style-inner) */
.list-item.application-item {
  margin-bottom: 1.5rem; /* Atstarpe zem elementa */
  transition: box-shadow 0.2s ease; /* Animācija ēnai */
  border-left-width: 5px; /* Kreisās apmales biezums */
  border-left-style: solid; /* Kreisās apmales stils */
}
/* Pieteikuma elementa stils, kad pele ir virs tā */
.list-item.application-item:hover {
  box-shadow: var(--shadow-md); /* Lielāka ēna */
}

/* Kreisās apmales krāsa pieteikumam ar statusu 'pending' */
.status-border-pending {
  border-left-color: var(--warning-color);
}
/* Kreisās apmales krāsa pieteikumam ar statusu 'approved' */
.status-border-approved {
  border-left-color: var(--success-color);
}
/* Kreisās apmales krāsa pieteikumam ar statusu 'rejected' */
.status-border-rejected {
  border-left-color: var(--danger-color);
}

/* Pieteikuma elementa galvenes stils */
.app-item-header {
  display: flex; /* Izmanto flexbox elementu izkārtojumam */
  align-items: center; /* Vertikāli centrē elementus */
  gap: 1rem; /* Atstarpe starp statusa ikonu un informācijas bloku */
  margin-bottom: 0.75rem; /* Atstarpe zem galvenes */
  padding-bottom: 0.75rem; /* Iekšējā atkāpe zemāk */
  border-bottom: 1px dashed var(--border-color); /* Pārtraukta līnija zem galvenes */
}
/* Statusa ikonas stils */
.app-icon {
  font-size: 2rem; /* Lielāka statusa ikona */
  width: 40px; /* Fiksēts platums ikonai labai līdzināšanai */
  text-align: center; /* Centrē ikonu tās platumā */
}
/* Statusa ikonas krāsa, ja statuss ir 'pending' */
.status-icon-pending {
  color: var(--warning-color);
}
/* Statusa ikonas krāsa, ja statuss ir 'approved' */
.status-icon-approved {
  color: var(--success-color);
}
/* Statusa ikonas krāsa, ja statuss ir 'rejected' */
.status-icon-rejected {
  color: var(--danger-color);
}

/* Pieteikuma galvenes informācijas bloka stils */
.app-header-info h3 {
  margin: 0 0 0.25rem 0; /* Atstarpes */
  color: var(--header-bg-color); /* Krāsa */
  font-size: 1.2rem; /* Fonta lielums */
  font-weight: 600; /* Fonta biezums */
}
/* Grupas nosaukuma stils pieteikuma galvenē */
.app-header-info h3 span {
  color: var(--primary-color); /* Primārā krāsa grupas nosaukumam */
  font-weight: 500; /* Vieglāks fonta biezums */
}
/* Pieteicēja informācijas (vārds, e-pasts) stils */
.applicant-info {
  font-size: 0.9rem; /* Fonta lielums */
  color: #555; /* Teksta krāsa */
  margin: 0; /* Noņem atstarpes */
  display: flex; /* Izmanto flexbox ikonai un tekstam */
  align-items: center; /* Vertikāli centrē ikonu un tekstu */
  gap: 0.4rem; /* Atstarpe starp ikonu un tekstu */
}

/* Pieteikuma metadatu (pieteikšanas datums, statuss) stils */
.app-item-content .app-meta {
  margin: 0.3rem 0; /* Atstarpes */
  font-size: 0.9rem; /* Fonta lielums */
  color: #495057; /* Teksta krāsa */
  display: flex; /* Izmanto flexbox ikonai un tekstam */
  align-items: center; /* Vertikāli centrē ikonu un tekstu */
  gap: 0.4rem; /* Atstarpe starp ikonu un tekstu */
}
/* Metadatu teksta (strong) stils */
.app-item-content .app-meta strong {
  font-weight: 500; /* Fonta biezums */
}
/* Metadatu ikonu stils */
.app-item-content .app-meta .fas {
  color: var(--secondary-color); /* Sekundārā krāsa ikonām */
  font-size: 0.9em; /* Fonta lielums */
}

/* Statusa teksta specifiskās krāsas */
.status-text {
  font-weight: 600; /* Biezāks fonts statusam */
  text-transform: capitalize; /* Pirmais burts liels */
}
/* Krāsa statusam 'pending' */
.status-text-pending {
  color: #856404; /* Tumši dzeltens teksts, lai būtu labi redzams uz gaiša fona */
}
/* Krāsa statusam 'approved' */
.status-text-approved {
  color: #155724; /* Tumši zaļš teksts */
}
/* Krāsa statusam 'rejected' */
.status-text-rejected {
  color: #721c24; /* Tumši sarkans teksts */
}

/* Pieteicēja ziņas displeja bloka stils */
.application-message-display {
  margin-top: 0.75rem; /* Atstarpe virs bloka */
  padding: 0.75rem; /* Iekšējā atkāpe */
  background-color: #f8f9fa; /* Gaišs fons */
  border: 1px solid #e9ecef; /* Viegla apmale */
  border-radius: var(--border-radius); /* Noapaļoti stūri */
}
/* "Pieteicēja ziņa:" teksta stils */
.application-message-display strong {
  display: block; /* Padara par bloka elementu */
  margin-bottom: 0.3rem; /* Atstarpe zemāk */
  font-size: 0.9em; /* Fonta lielums */
  color: var(--text-color); /* Teksta krāsa */
  font-weight: 500; /* Fonta biezums */
  display: flex; /* Izmanto flexbox ikonai un tekstam */
  align-items: center; /* Vertikāli centrē ikonu un tekstu */
  gap: 0.4rem; /* Atstarpe starp ikonu un tekstu */
}
/* Pašas ziņas teksta stils */
.message-text {
  font-size: 0.95em; /* Fonta lielums */
  color: #333; /* Tumšāka teksta krāsa */
  white-space: pre-wrap; /* Saglabā atstarpes un pārnes vārdus jaunā rindā */
  word-wrap: break-word; /* Pārnes garus vārdus jaunā rindā */
  margin: 0; /* Noņem atstarpes */
  padding-left: 1.5rem; /* Atkāpe no kreisās puses, lai vizuāli atdalītu no virsraksta */
}

/* Informācijas par pieteikuma apstrādi stils */
.processed-info {
  margin-top: 0.5rem; /* Atstarpe virs bloka */
  padding-top: 0.5rem; /* Iekšējā atkāpe augšpusē */
  border-top: 1px dotted #e0e0e0; /* Punktēta līnija augšpusē */
  font-size: 0.85rem; /* Fonta lielums */
  color: #6c757d; /* Teksta krāsa */
}

/* Pieteikuma darbību pogu konteinera stils */
.app-item-actions {
  margin-top: 1rem; /* Atstarpe virs pogu bloka */
  padding-top: 0.75rem; /* Iekšējā atkāpe augšpusē */
  border-top: 1px solid var(--border-color); /* Augšējā līnija */
  display: flex; /* Izmanto flexbox pogām */
  gap: 0.75rem; /* Atstarpe starp pogām */
  justify-content: flex-end; /* Līdzina pogas pa labi */
  flex-wrap: wrap; /* Atļauj pogām pāriet jaunā rindā */
}
/* Veiksmes pogas (piem., Apstiprināt) stils */
.action-button.success-button {
  background-color: var(--success-color); /* Fona krāsa */
}
/* Veiksmes pogas stils, kad pele ir virs tās (un tā nav atspējota) */
.action-button.success-button:hover:not([disabled]) {
  background-color: #1e7e34; /* Tumšāka fona krāsa */
}
/* Bīstamības pogas (piem., Noraidīt) stils */
.action-button.danger-button {
  background-color: var(--danger-color); /* Fona krāsa */
}
/* Bīstamības pogas stils, kad pele ir virs tās (un tā nav atspējota) */
.action-button.danger-button:hover:not([disabled]) {
  background-color: #c82333; /* Tumšāka fona krāsa */
}

/* Stils inline veiksmes un kļūdas ziņojumiem */
.success-message-inline,
.error-message-inline {
  margin-top: 0.75rem; /* Atstarpe virs ziņojuma */
  font-size: 0.9em; /* Fonta lielums */
}
/* Ikonu stils inline ziņojumos */
.success-message-inline .fas,
.error-message-inline .fas {
  margin-right: 0.4rem; /* Atstarpe no labās puses ikonai */
}
</style>
