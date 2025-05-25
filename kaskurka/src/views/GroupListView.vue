<template>
  <div class="group-list-view card-style">
    <!-- Poga, lai dotos atpakaļ uz informācijas paneli -->
    <!-- Atspējota, ja notiek ielādes vai pieteikšanās process -->
    <button
      @click="goBackToDashboard"
      class="back-button"
      :disabled="isLoading || isApplying"
    >
      <i class="fas fa-arrow-left"></i> Atpakaļ uz Paneli
    </button>
    <!-- Skata virsraksts ar ikonu -->
    <h2 class="view-title"><i class="fas fa-users"></i> Pieejamās Grupas</h2>

    <!-- Filtru panelis grupu saraksta filtrēšanai un meklēšanai -->
    <div class="filters-panel card-style-inner">
      <h3 class="filters-title"><i class="fas fa-filter"></i> Rādīt Grupas</h3>
      <!-- Filtru režģis ar dalības un meklēšanas filtriem -->
      <div class="filters-grid">
        <!-- Dalības filtrs (Visas, Manas, Var Pieteikties, Pieteikums Nosūtīts) -->
        <div class="form-group">
          <label for="membershipFilter">Dalība:</label>
          <select
            id="membershipFilter"
            v-model="membershipFilter"
            :disabled="isLoading || isApplying"
          >
            <option value="all">Visas Pieejamās Grupas</option>
            <option value="joined">Manas Grupas</option>
            <option value="available">Var Pieteikties</option>
            <option value="pending">Pieteikums Nosūtīts</option>
          </select>
        </div>
        <!-- Grupu meklēšanas lauks pēc nosaukuma -->
        <div class="form-group">
          <label for="groupSearch">Meklēt grupu:</label>
          <input
            type="text"
            id="groupSearch"
            v-model="groupSearchQuery"
            placeholder="Ievadi nosaukumu..."
            :disabled="isLoading || isApplying"
          />
        </div>
      </div>
    </div>

    <!-- Indikators, kas tiek rādīts, kamēr notiek grupu ielāde -->
    <div v-if="isLoading" class="loading-indicator">
      <i class="fas fa-spinner fa-spin"></i> Notiek grupu ielāde...
    </div>
    <!-- Kļūdas ziņojums, ja notikusi kļūda ielādējot grupas -->
    <div v-else-if="errorMessage" class="error-message">
      <i class="fas fa-exclamation-triangle"></i> {{ errorMessage }}
    </div>
    <!-- Ziņojums, ja pēc filtrēšanas nav atrasta neviena grupa -->
    <div
      v-else-if="filteredGroups.length === 0"
      class="empty-list-message card-style-inner"
    >
      <i class="fas fa-folder-open fa-3x"></i>
      <p>
        Pēc jūsu izvēlētajiem kritērijiem netika atrastas grupas, vai arī
        saraksts ir tukšs.
      </p>
      <!-- Papildu ieteikums, ja aktīvi filtri -->
      <p v-if="membershipFilter !== 'all' || groupSearchQuery">
        Mēģiniet mainīt filtru iestatījumus.
      </p>
    </div>

    <!-- Konteiners grupu sarakstam -->
    <div v-else class="groups-container">
      <!-- Cikls cauri filtrētajām grupām -->
      <div
        v-for="group in filteredGroups"
        :key="group._id"
        class="list-item group-item card-style-inner"
        :class="{
          'member-of-group': isMemberOfGroup(group),
          'application-pending':
            getApplicationStatusForGroup(group._id) === 'pending',
          'application-rejected':
            getApplicationStatusForGroup(group._id) === 'rejected',
        }"
      >
        <!-- Grupas elementa galvene ar ikonu un pamatinformāciju -->
        <div class="group-item-header">
          <i class="fas fa-layer-group group-icon"></i>
          <div class="group-info">
            <h3>{{ group.name }}</h3>
            <p v-if="group.studyYear" class="group-study-year">
              <i class="fas fa-calendar-alt"></i> Mācību gads:
              {{ group.studyYear }}
            </p>
          </div>
        </div>
        <!-- Grupas elementa saturs ar aprakstu un metadatiem -->
        <div class="group-item-content">
          <p v-if="group.description" class="group-description">
            {{ group.description }}
          </p>
          <p v-else class="group-description italic">Apraksts nav pieejams.</p>
          <small class="group-meta"
            ><i class="fas fa-clock"></i> Izveidota:
            {{ formatDate(group.createdAt) }}</small
          >
          <small class="group-meta" v-if="group.members"
            ><i class="fas fa-user-friends"></i> Dalībnieki:
            {{ group.members.length }}</small
          >

          <!-- Informācija par lietotāja pieteikumu šai grupai (ja nav dalībnieks) -->
          <div
            v-if="getApplicationDetails(group._id) && !isMemberOfGroup(group)"
            class="application-info-display"
            :class="`status-bg-${getApplicationDetails(group._id).status}`"
          >
            <p class="application-status">
              <i
                :class="
                  getIconForStatus(getApplicationDetails(group._id).status)
                "
              ></i>
              Jūsu pieteikuma statuss:
              <strong>
                {{ getStatusText(getApplicationDetails(group._id).status) }}
              </strong>
            </p>
            <!-- Parāda lietotāja ziņu, ja tāda ir pieteikumā -->
            <p
              v-if="getApplicationDetails(group._id).message"
              class="application-message-text"
            >
              <i class="fas fa-comment-alt"></i> Jūsu ziņa:
              <em>"{{ getApplicationDetails(group._id).message }}"</em>
            </p>
          </div>
        </div>

        <!-- Grupas elementa darbību sadaļa (pieteikšanās forma vai poga) -->
        <div class="group-item-actions">
          <!-- Pieteikšanās forma, ja lietotājs to ir atvēris -->
          <div
            v-if="
              showApplyFormFor === group._id &&
              !isMemberOfGroup(group) &&
              getApplicationStatusForGroup(group._id) !== 'pending'
            "
            class="apply-form-section"
          >
            <!-- Ziņas ievades lauks pieteikumam -->
            <div class="form-group application-message-group">
              <label :for="'apply-message-' + group._id"
                ><i class="fas fa-envelope-open-text"></i> Ziņa administratoram
                (neobligāti):</label
              >
              <textarea
                :id="'apply-message-' + group._id"
                v-model="applicationMessages[group._id]"
                rows="3"
                maxlength="500"
                :placeholder="
                  getApplicationDetails(group._id) &&
                  getApplicationDetails(group._id).message &&
                  getApplicationStatusForGroup(group._id) === 'rejected'
                    ? 'Iepriekšējā ziņa: ' +
                      getApplicationDetails(group._id).message
                    : 'Jūsu ziņa (līdz 500 rakstzīmēm)...'
                "
              ></textarea>
            </div>
            <!-- Pieteikšanās formas pogas (Atcelt, Nosūtīt) -->
            <div class="apply-form-buttons">
              <button
                class="action-button secondary-button cancel-apply"
                @click="cancelApplyForm(group._id)"
                :disabled="isApplying"
              >
                <i class="fas fa-times"></i> Atcelt
              </button>
              <button
                class="action-button primary-button send-application"
                @click="submitApplication(group._id)"
                :disabled="isApplying"
              >
                <i class="fas fa-paper-plane"></i>
                <!-- Dinamisks teksts pogai atkarībā no pieteikšanās stāvokļa -->
                {{ isApplying ? "Sūta..." : "Nosūtīt Pieteikumu" }}
              </button>
            </div>
          </div>
          <!-- Poga pieteikšanās formas atvēršanai vai statusa attēlošanai -->
          <button
            v-else
            class="action-button"
            :class="getButtonClass(group)"
            @click="toggleApplyForm(group._id)"
            :disabled="isButtonDisabled(group)"
          >
            <i :class="getButtonIcon(group)"></i> {{ getButtonText(group) }}
          </button>
        </div>
        <!-- Kļūdas ziņojums, ja notikusi kļūda piesakoties konkrētai grupai -->
        <div
          v-if="applyErrorMessages[group._id]"
          class="error-message apply-error-inline"
        >
          <i class="fas fa-exclamation-circle"></i>
          {{ applyErrorMessages[group._id] }}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from "axios";
import _ from "lodash"; // Importē Lodash bibliotēku (piemēram, debounce funkcijai)

export default {
  name: "GroupListView",
  props: {
    // Pašreizējā pieteiktā lietotāja objekts.
    currentUser: Object,
  },
  data() {
    return {
      allGroups: [], // Masīvs ar visām ielādētajām grupām
      userApplications: [], // Masīvs ar lietotāja pieteikumiem grupām
      isLoading: true, // Norāda, vai notiek datu ielāde
      isApplying: false, // Norāda, vai notiek pieteikšanās process kādai grupai
      errorMessage: "", // Vispārīgs kļūdas ziņojums datu ielādei
      membershipFilter: "all", // Pašreizējais dalības filtrs (all, joined, available, pending)
      groupSearchQuery: "", // Meklēšanas vaicājums grupas nosaukumam
      showApplyFormFor: null, // ID grupai, kurai ir atvērta pieteikšanās forma
      applicationMessages: {}, // Objekts, kurā glabājas ziņas pieteikumiem (atslēga ir grupas ID)
      applyErrorMessages: {}, // Objekts kļūdu ziņojumiem konkrētiem pieteikumiem
    };
  },
  computed: {
    // Aprēķinātais īpašums, kas atgriež filtrētu un sakārtotu grupu sarakstu.
    filteredGroups() {
      if (!this.allGroups) return []; // Ja nav ielādētu grupu, atgriež tukšu masīvu
      let groupsToShow = [...this.allGroups]; // Izveido darba kopiju no visām grupām

      // Filtrēšana pēc meklēšanas vaicājuma (grupas nosaukums vai apraksts)
      const searchQuery = this.groupSearchQuery.trim().toLowerCase();
      if (searchQuery) {
        groupsToShow = groupsToShow.filter(
          (group) =>
            group.name.toLowerCase().includes(searchQuery) ||
            (group.description &&
              group.description.toLowerCase().includes(searchQuery))
        );
      }

      // Filtrēšana pēc dalības statusa
      if (this.membershipFilter === "joined") {
        // Rāda tikai tās grupas, kurās lietotājs ir dalībnieks
        groupsToShow = groupsToShow.filter((group) =>
          this.isMemberOfGroup(group)
        );
      } else if (this.membershipFilter === "available") {
        // Rāda tikai tās grupas, kurām lietotājs var pieteikties
        // (nav dalībnieks un pieteikums nav 'pending' vai ir 'rejected')
        groupsToShow = groupsToShow.filter((group) => {
          const isMember = this.isMemberOfGroup(group);
          const appStatus = this.getApplicationStatusForGroup(group._id);
          return !isMember && (!appStatus || appStatus === "rejected");
        });
      } else if (this.membershipFilter === "pending") {
        // Rāda tikai tās grupas, kurām lietotāja pieteikums ir 'pending' statusā
        groupsToShow = groupsToShow.filter(
          (group) => this.getApplicationStatusForGroup(group._id) === "pending"
        );
      }
      // Ja `membershipFilter` ir 'all', netiek veikta papildu filtrēšana pēc dalības.

      // Sakārto grupas pēc nosaukuma alfabētiskā secībā.
      return groupsToShow.sort((a, b) => a.name.localeCompare(b.name));
    },
  },
  created() {
    // Izsauc datu ielādes metodi, kad komponents tiek izveidots.
    this.fetchData();
    // Izveido debounce funkciju meklēšanas vaicājuma apstrādei,
    // lai API pieprasījums netiktu veikts pie katras rakstzīmes ievades.
    // Pašreizējā implementācijā meklēšana notiek klienta pusē, tāpēc debounce
    // var nebūt obligāts datu ielādei, bet var palīdzēt ar UI atsaucību, ja būtu daudz datu.
    this.debouncedFetchData = _.debounce(this.fetchData, 300);
  },
  watch: {
    // Vēro `groupSearchQuery` izmaiņas.
    // Ja meklēšana notiktu servera pusē, šeit tiktu izsaukta `debouncedFetchData`.
    // Pašlaik filtrēšana notiek computed īpašumā, tāpēc `watch` nav nepieciešams tiešai datu ielādei.
    groupSearchQuery() {
      // this.debouncedFetchData(); // Varētu izsaukt, ja meklēšana notiktu serverī
    },
    // Vēro `membershipFilter` izmaiņas. Datu ielāde nav nepieciešama, jo filtrēšana notiek computed īpašumā.
    membershipFilter() {
      // Nav nepieciešams atkārtoti ielādēt datus, computed īpašums parūpēsies par filtrēšanu.
    },
  },
  methods: {
    // Novirza lietotāju atpakaļ uz informācijas paneli.
    goBackToDashboard() {
      this.$emit("navigateToDashboard");
    },
    // Asinhrona metode datu (grupu un lietotāja pieteikumu) ielādei no servera.
    async fetchData() {
      this.isLoading = true;
      this.errorMessage = "";
      try {
        // Vienlaicīgi pieprasa grupu sarakstu un lietotāja pieteikumu sarakstu.
        const [groupsRes, applicationsRes] = await Promise.all([
          axios.get("/api/groups"),
          axios.get("/api/groups/applications/my"),
        ]);
        this.allGroups = groupsRes.data; // Saglabā ielādētās grupas
        this.userApplications = applicationsRes.data; // Saglabā lietotāja pieteikumus
      } catch (error) {
        console.error("Kļūda ielādējot grupu datus:", error);
        this.errorMessage =
          error.response?.data?.msg || "Kļūda ielādējot grupu datus.";
      } finally {
        this.isLoading = false; // Beidz ielādes stāvokli
      }
    },
    // Formatē datuma virkni uz lokalizētu formātu (DD.MM.GGGG).
    formatDate(dateString) {
      if (!dateString) return "N/A";
      const options = { year: "numeric", month: "2-digit", day: "2-digit" };
      try {
        return new Date(dateString).toLocaleDateString("lv-LV", options);
      } catch (e) {
        return dateString; // Atgriež oriģinālo virkni, ja notiek kļūda
      }
    },
    // Pārbauda, vai pašreizējais lietotājs ir konkrētās grupas dalībnieks.
    isMemberOfGroup(group) {
      // Pārbauda, vai grupas ID ir lietotāja `enrolledCustomGroups` sarakstā.
      if (
        this.currentUser &&
        this.currentUser.enrolledCustomGroups &&
        this.currentUser.enrolledCustomGroups.includes(group._id)
      ) {
        return true;
      }
      // Papildus pārbauda, vai lietotājam ir apstiprināts pieteikums šai grupai.
      // Tas varētu būt noderīgi, ja `enrolledCustomGroups` vēl nav atjaunojies.
      const appDetails = this.getApplicationDetails(group._id);
      if (appDetails && appDetails.status === "approved") {
        return true;
      }
      return false;
    },
    // Atgriež detalizētu informāciju par lietotāja pieteikumu konkrētai grupai.
    getApplicationDetails(groupId) {
      return this.userApplications.find((a) => a.groupId === groupId);
    },
    // Atgriež lietotāja pieteikuma statusu konkrētai grupai.
    getApplicationStatusForGroup(groupId) {
      const app = this.getApplicationDetails(groupId);
      return app ? app.status : null; // Atgriež statusu vai null, ja pieteikuma nav
    },
    // Pārslēdz pieteikšanās formas redzamību konkrētai grupai.
    toggleApplyForm(groupId) {
      // Pārbauda, vai poga nav atspējota (piem., ja lietotājs jau ir dalībnieks vai pieteikums ir 'pending').
      if (this.isButtonDisabled(this.allGroups.find((g) => g._id === groupId)))
        return;

      if (this.showApplyFormFor === groupId) {
        // Ja forma jau ir atvērta šai grupai, aizver to.
        this.showApplyFormFor = null;
      } else {
        // Ja forma tiek atvērta, sagatavo to.
        this.showApplyFormFor = groupId;
        const existingApp = this.getApplicationDetails(groupId);
        // Ja lietotājam ir iepriekšējs noraidīts pieteikums ar ziņu,
        // aizpilda ziņas lauku ar iepriekšējo ziņu.
        if (
          existingApp &&
          existingApp.status === "rejected" &&
          existingApp.message
        ) {
          this.applicationMessages = {
            ...this.applicationMessages,
            [groupId]: existingApp.message,
          };
        } else {
          // Citādi atstāj ziņas lauku tukšu.
          this.applicationMessages = {
            ...this.applicationMessages,
            [groupId]: "",
          };
        }
        // Notīra iepriekšējos kļūdu ziņojumus šai grupai.
        this.applyErrorMessages = { ...this.applyErrorMessages, [groupId]: "" };
      }
    },
    // Atceļ pieteikšanās formu un notīra ziņas lauku.
    cancelApplyForm(groupId) {
      this.showApplyFormFor = null; // Aizver formu
      this.applicationMessages = { ...this.applicationMessages, [groupId]: "" }; // Notīra ziņu
      this.applyErrorMessages = { ...this.applyErrorMessages, [groupId]: "" }; // Notīra kļūdas
    },
    // Atgriež tekstu pieteikšanās/statusa pogai atkarībā no situācijas.
    getButtonText(group) {
      if (this.isMemberOfGroup(group)) return "Dalībnieks";
      const status = this.getApplicationStatusForGroup(group._id);
      if (status === "pending") return "Pieteikums Gaida";
      if (status === "rejected") return "Pieteikties Atkārtoti";
      return "Pieteikties Grupā";
    },
    // Atgriež ikonu pieteikšanās/statusa pogai.
    getButtonIcon(group) {
      if (this.isMemberOfGroup(group)) return "fas fa-user-check";
      const status = this.getApplicationStatusForGroup(group._id);
      if (status === "pending") return "fas fa-hourglass-half";
      if (status === "rejected") return "fas fa-redo";
      return "fas fa-plus-circle";
    },
    // Atgriež CSS klasi pieteikšanās/statusa pogai (krāsu maiņai).
    getButtonClass(group) {
      if (this.isMemberOfGroup(group)) return "success-button"; // Zaļa, ja dalībnieks
      const status = this.getApplicationStatusForGroup(group._id);
      if (status === "pending") return "warning-button"; // Dzeltena, ja gaida
      if (status === "rejected") return "info-button"; // Zila, ja noraidīts (var pieteikties atkārtoti)
      return "primary-button"; // Primārā krāsa, ja var pieteikties
    },
    // Atgriež ikonu pieteikuma statusa attēlošanai.
    getIconForStatus(statusKey) {
      const map = {
        pending: "fas fa-hourglass-start", // Gaida
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
    // Pārbauda, vai pieteikšanās/statusa poga ir jāatspējo.
    isButtonDisabled(group) {
      if (!group) return true; // Ja grupa nav atrasta
      // Ja pieteikšanās forma šai grupai ir atvērta, poga pati par sevi nav redzama (to aizstāj formas pogas).
      if (this.showApplyFormFor === group._id) return false;
      if (this.isMemberOfGroup(group)) return true; // Ja dalībnieks, poga atspējota
      const status = this.getApplicationStatusForGroup(group._id);
      // Ja pieteikums gaida apstiprinājumu vai notiek cits pieteikšanās process, poga atspējota.
      return status === "pending" || this.isApplying;
    },
    // Nosūta pieteikumu dalībai grupā.
    async submitApplication(groupId) {
      this.isApplying = true; // Sāk pieteikšanās procesu
      this.applyErrorMessages = { ...this.applyErrorMessages, [groupId]: "" }; // Notīra iepriekšējās kļūdas

      const message = this.applicationMessages[groupId] || ""; // Iegūst ziņu no formas
      // Pārbauda ziņas garumu.
      if (message.length > 500) {
        this.applyErrorMessages = {
          ...this.applyErrorMessages,
          [groupId]: "Ziņa nedrīkst pārsniegt 500 rakstzīmes.",
        };
        this.isApplying = false; // Beidz pieteikšanās procesu
        return;
      }

      try {
        const response = await axios.post(`/api/groups/${groupId}/apply`, {
          message, // Nosūta ziņu kopā ar pieteikumu
        });
        alert(response.data.msg); // Parāda veiksmes ziņojumu
        this.showApplyFormFor = null; // Aizver pieteikšanās formu
        this.applicationMessages = {
          ...this.applicationMessages,
          [groupId]: "", // Notīra ziņas lauku
        };
        await this.fetchData(); // Atjauno grupu un pieteikumu datus
      } catch (error) {
        // Apstrādā kļūdas, kas radušās servera pusē.
        const errMsg = error.response?.data?.msg || "Kļūda piesakoties grupai.";
        this.applyErrorMessages = {
          ...this.applyErrorMessages,
          [groupId]: errMsg, // Parāda kļūdas ziņojumu blakus formai
        };
        console.error("Kļūda piesakoties grupai:", error);
      } finally {
        this.isApplying = false; // Beidz pieteikšanās procesu
      }
    },
  },
};
</script>

<style scoped>
/* Stili tiek mantoti no globālā .card-style */
/* Grupu saraksta skata galvenā konteinera stils */
.group-list-view {
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

/* Grupu saraksta konteinera stils */
.groups-container {
  margin-top: 1rem; /* Atstarpe virs konteinera */
}
/* Atsevišķa grupas elementa stils (izmanto .card-style-inner) */
.list-item.group-item {
  margin-bottom: 1.5rem; /* Atstarpe zem elementa */
  transition: box-shadow 0.2s ease; /* Animācija ēnai */
  border-left-width: 5px; /* Kreisās apmales biezums */
  border-left-style: solid; /* Kreisās apmales stils */
  border-left-color: var(
    --secondary-color
  ); /* Noklusējuma kreisās apmales krāsa */
}
/* Grupas elementa stils, kad pele ir virs tā */
.list-item.group-item:hover {
  box-shadow: var(--shadow-md); /* Lielāka ēna */
}
/* Kreisās apmales krāsa grupai, kurā lietotājs ir dalībnieks */
.list-item.group-item.member-of-group {
  border-left-color: var(--success-color);
}
/* Kreisās apmales krāsa grupai, kurai pieteikums gaida apstiprinājumu */
.list-item.group-item.application-pending {
  border-left-color: var(--warning-color);
}
/* Kreisās apmales krāsa grupai, kurai pieteikums ir noraidīts */
.list-item.group-item.application-rejected {
  border-left-color: var(--danger-color);
}

/* Grupas elementa galvenes stils */
.group-item-header {
  display: flex; /* Izmanto flexbox elementu izkārtojumam */
  align-items: center; /* Vertikāli centrē elementus */
  gap: 0.75rem; /* Atstarpe starp ikonu un informācijas bloku */
  margin-bottom: 0.75rem; /* Atstarpe zem galvenes */
  padding-bottom: 0.75rem; /* Iekšējā atkāpe zemāk */
  border-bottom: 1px dashed var(--border-color); /* Pārtraukta līnija zem galvenes */
}
/* Grupas ikonas stils */
.group-icon {
  font-size: 1.8rem; /* Ikonas lielums */
  color: var(--primary-color); /* Primārā krāsa ikonai */
}
/* Grupas nosaukuma stils galvenē */
.group-info h3 {
  margin: 0 0 0.2rem 0; /* Atstarpes */
  color: var(--header-bg-color); /* Krāsa */
  font-size: 1.3rem; /* Fonta lielums */
  font-weight: 600; /* Fonta biezums */
}
/* Grupas mācību gada stils galvenē */
.group-study-year {
  font-size: 0.85rem; /* Fonta lielums */
  color: #6c757d; /* Teksta krāsa */
  margin: 0; /* Noņem atstarpes */
  display: flex; /* Izmanto flexbox ikonai un tekstam */
  align-items: center; /* Vertikāli centrē ikonu un tekstu */
  gap: 0.3rem; /* Atstarpe starp ikonu un tekstu */
}

/* Grupas apraksta stils */
.group-item-content .group-description {
  font-size: 0.95em; /* Fonta lielums */
  color: #495057; /* Teksta krāsa */
  margin-bottom: 0.5rem; /* Atstarpe zem apraksta */
  line-height: 1.6; /* Rindstarpa */
}
/* Slīpraksta stils, ja apraksts nav pieejams */
.group-item-content .group-description.italic {
  font-style: italic; /* Slīpraksts */
  color: #6c757d; /* Pelēka krāsa */
}
/* Grupas metadatu (izveides datums, dalībnieku skaits) stils */
.group-meta {
  display: inline-flex; /* Padara par inline-flex elementu, lai ikona un teksts būtu vienā rindā */
  align-items: center; /* Vertikāli centrē ikonu un tekstu */
  gap: 0.3rem; /* Atstarpe starp ikonu un tekstu */
  font-size: 0.8rem; /* Fonta lielums */
  color: #7f8c8d; /* Teksta krāsa */
  margin-right: 0.75rem; /* Atstarpe no labās puses starp metadatiem */
  margin-top: 0.5rem; /* Atstarpe virs metadatiem */
}

/* Lietotāja pieteikuma informācijas displeja stils */
.application-info-display {
  margin-top: 0.75rem; /* Atstarpe virs bloka */
  padding: 0.6rem 0.8rem; /* Iekšējā atkāpe */
  border-radius: var(--border-radius); /* Noapaļoti stūri */
  font-size: 0.9em; /* Fonta lielums */
}
/* Fona un apmales stils pieteikumam ar statusu 'pending' */
.application-info-display.status-bg-pending {
  background-color: #fff3cd; /* Gaiši dzeltens fons */
  border: 1px solid #ffeeba; /* Dzeltena apmale */
  color: #856404; /* Tumši dzeltens teksts */
}
/* Fona un apmales stils pieteikumam ar statusu 'approved' */
.application-info-display.status-bg-approved {
  background-color: #d4edda; /* Gaiši zaļš fons */
  border: 1px solid #c3e6cb; /* Zaļa apmale */
  color: #155724; /* Tumši zaļš teksts */
}
/* Fona un apmales stils pieteikumam ar statusu 'rejected' */
.application-info-display.status-bg-rejected {
  background-color: #f8d7da; /* Gaiši sarkans fons */
  border: 1px solid #f5c6cb; /* Sarkana apmale */
  color: #721c24; /* Tumši sarkans teksts */
}

/* Pieteikuma statusa teksta stils */
.application-status {
  font-weight: 500; /* Fonta biezums */
  margin-bottom: 0.3rem; /* Atstarpe zemāk */
  display: flex; /* Izmanto flexbox ikonai un tekstam */
  align-items: center; /* Vertikāli centrē ikonu un tekstu */
  gap: 0.4rem; /* Atstarpe starp ikonu un tekstu */
}
/* Pieteikuma statusa teksta (konkrēti statusa nosaukuma) stils */
.application-status strong {
  font-weight: 600; /* Biezāks fonts */
}
/* Pieteikuma ziņas teksta stils */
.application-message-text {
  font-size: 0.9em; /* Fonta lielums */
  margin-top: 0.3rem; /* Atstarpe virs teksta */
  display: flex; /* Izmanto flexbox ikonai un tekstam */
  align-items: flex-start; /* Līdzina elementus pie augšas */
  gap: 0.4rem; /* Atstarpe starp ikonu un tekstu */
}
/* Pieteikuma ziņas (em) teksta stils */
.application-message-text em {
  font-style: normal; /* Noņem slīprakstu, ja tas tiek mantots */
}

/* Grupas elementa darbību sadaļas stils */
.group-item-actions {
  margin-top: 1rem; /* Atstarpe virs sadaļas */
  padding-top: 0.75rem; /* Iekšējā atkāpe augšpusē */
  border-top: 1px solid var(--border-color); /* Augšējā līnija */
  text-align: right; /* Līdzina pogas pa labi */
}
/* Pogas stili (izmanto globālos .action-button un specifiskas krāsu klases) */
.action-button.primary-button {
  /* Noklusējuma pieteikšanās pogas stils */
}
.action-button.success-button {
  background-color: var(--success-color); /* Zaļa krāsa pogai */
  color: var(--text-color-light); /* Gaišs teksts */
}
.action-button.warning-button {
  background-color: var(--warning-color); /* Dzeltena krāsa pogai */
  color: var(--text-color); /* Tumšs teksts uz dzeltena fona */
}
.action-button.info-button {
  background-color: var(--info-color); /* Zila krāsa pogai */
  color: var(--text-color-light); /* Gaišs teksts */
}

/* Pieteikšanās formas sadaļas stils */
.apply-form-section {
  margin-top: 0.5rem; /* Atstarpe virs formas */
}
/* Ziņas ievades lauka grupas stils pieteikšanās formā */
.application-message-group {
  text-align: left; /* Līdzina tekstu pa kreisi */
  margin-bottom: 0.75rem; /* Atstarpe zem grupas */
}
/* Etiķetes stils ziņas ievades laukam */
.application-message-group label {
  font-size: 0.9em; /* Fonta lielums */
  color: var(--text-color); /* Teksta krāsa */
  font-weight: 500; /* Fonta biezums */
  display: flex; /* Izmanto flexbox ikonai un tekstam */
  align-items: center; /* Vertikāli centrē ikonu un tekstu */
  gap: 0.4rem; /* Atstarpe starp ikonu un tekstu */
}
/* Teksta lauka (textarea) stils ziņas ievadei */
.application-message-group textarea {
  width: 100%; /* Aizņem visu platumu */
  padding: 0.6rem; /* Iekšējā atkāpe */
  border: 1px solid var(--border-color); /* Apmale */
  border-radius: var(--border-radius); /* Noapaļoti stūri */
  font-size: 0.95em; /* Fonta lielums */
  min-height: 70px; /* Minimālais augstums */
  margin-top: 0.3rem; /* Atstarpe virs lauka */
  box-sizing: border-box; /* Iekļauj padding un border platumā */
}
/* Pieteikšanās formas pogu konteinera stils */
.apply-form-buttons {
  display: flex; /* Izmanto flexbox pogām */
  justify-content: flex-end; /* Līdzina pogas pa labi */
  gap: 0.5rem; /* Atstarpe starp pogām */
}

/* Stils inline kļūdas ziņojumam (piem., ja pieteikšanās neizdodas) */
.apply-error-inline {
  margin-top: 0.75rem; /* Atstarpe virs ziņojuma */
  font-size: 0.85em; /* Fonta lielums */
  padding: 0.5rem 0.75rem; /* Iekšējā atkāpe */
}
/* Ikonas stils inline kļūdas ziņojumā */
.apply-error-inline .fas {
  margin-right: 0.3rem; /* Atstarpe no labās puses ikonai */
}

/* Stili maziem ekrāniem */
@media (max-width: 768px) {
  /* Pārkārto filtru režģi vienā kolonnā */
  .filters-grid {
    grid-template-columns: 1fr;
  }
}
</style>
