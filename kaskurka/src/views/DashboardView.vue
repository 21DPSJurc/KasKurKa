<template>
  <div class="dashboard-view card-style">
    <!-- Informācijas paneļa galvene -->
    <header class="dashboard-view-header">
      <div class="header-content">
        <!-- Dinamisks virsraksts atkarībā no tā, vai administrators skatās kā students -->
        <h2 class="view-title">
          <i class="fas fa-tachometer-alt"></i>
          {{
            isAdminViewingAsStudent
              ? "Studentu Panelis (Admina Skats)"
              : "Mans Panelis"
          }}
        </h2>
        <!-- Izrakstīšanās poga, redzama tikai tad, ja administrators neskatās kā students -->
        <button
          v-if="!isAdminViewingAsStudent"
          @click="logout"
          class="action-button danger-button logout-button"
        >
          <i class="fas fa-sign-out-alt"></i> Iziet
        </button>
        <!-- Paziņojums administratoram, ja viņš skatās kā students -->
        <div v-if="isAdminViewingAsStudent" class="admin-view-notice">
          <i class="fas fa-info-circle"></i> Jūs redzat studentu paneli. Dati
          tiek rādīti ar administratora tiesībām.
        </div>
      </div>
    </header>

    <!-- Ievada sekcija ar sveiciena tekstu -->
    <section class="dashboard-intro">
      <!-- Teksts parastam studentam -->
      <p v-if="!isAdminViewingAsStudent">
        Sveicināti KasKurKa! Šeit jūs varat ērti pārvaldīt savus mācību darbus,
        sekot līdzi termiņiem un sadarboties ar kursabiedriem.
      </p>
      <!-- Teksts administratoram, kurš skatās kā students -->
      <p v-else>
        Šis ir studentu paneļa priekšskatījums. Šeit varat redzēt, kā studenti
        mijiedarbojas ar sistēmu. Ņemiet vērā, ka datu apjoms (piem., mājasdarbu
        saraksts) atspoguļo jūsu administratora tiesības (redzat visu).
      </p>
    </section>

    <!-- Navigācijas pogas dažādām darbībām -->
    <nav class="dashboard-actions">
      <!-- Poga mājasdarba pievienošanai -->
      <button class="action-button" @click="navigateToAddHomework">
        <i class="fas fa-plus-circle"></i> Pievienot Mājasdarbu
      </button>
      <!-- Poga pārbaudes darba pievienošanai -->
      <button class="action-button" @click="navigateToAddTest">
        <i class="fas fa-calendar-plus"></i> Pievienot Pārbaudes Darbu
      </button>
      <!-- Poga, lai pārietu uz visu darbu sarakstu -->
      <button class="action-button" @click="navigateToHomeworkList">
        <i class="fas fa-list-ul"></i> Visi Darbi
      </button>
      <!-- Poga, lai pārietu uz grupu sarakstu -->
      <button class="action-button" @click="navigateToGroupList">
        <i class="fas fa-users"></i> Manas Grupas
      </button>
    </nav>

    <!-- Horizontāls sadalītājs starp sekcijām -->
    <hr class="section-divider" />

    <!-- Sekcija ar tuvākajiem notikumiem (mājasdarbiem un pārbaudes darbiem) -->
    <section class="upcoming-items-panel">
      <h3 class="panel-title"><i class="fas fa-bell"></i> Tuvākie Notikumi</h3>
      <!-- Indikators, kas tiek rādīts, kamēr notiek aktuālo darbu ielāde -->
      <div v-if="isLoadingItems" class="loading-indicator">
        <i class="fas fa-spinner fa-spin"></i> Notiek aktuālo darbu ielāde...
      </div>
      <!-- Kļūdas ziņojums, ja notikusi kļūda ielādējot darbus -->
      <div v-if="fetchError" class="error-message">{{ fetchError }}</div>

      <!-- Konteiners ar divām kolonnām: mājasdarbiem un pārbaudes darbiem -->
      <!-- Redzams tikai tad, ja ielāde pabeigta un nav kļūdu -->
      <div
        v-if="!isLoadingItems && !fetchError"
        class="upcoming-columns-container"
      >
        <!-- Kolonna tuvākajiem mājasdarbiem -->
        <div class="upcoming-column card-style-inner">
          <h4>
            <i class="fas fa-book-reader icon-homework"></i> Tuvākie Mājasdarbi
            <!-- Papildu indikators administratoram, ja skatās kā students -->
            <span v-if="isAdminViewingAsStudent" class="admin-scope-indicator"
              >(Admina Skats)</span
            >
          </h4>
          <!-- Mājasdarbu saraksts, ja tādi ir -->
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
          <!-- Ziņojums, ja nav tuvāko mājasdarbu -->
          <p v-else class="no-items-message">
            <i class="fas fa-folder-open"></i> Nav tuvāko mājasdarbu.
          </p>
        </div>

        <!-- Kolonna tuvākajiem pārbaudes darbiem -->
        <div class="upcoming-column card-style-inner">
          <h4>
            <i class="fas fa-feather-alt icon-test"></i> Tuvākie Pārbaudes Darbi
            <!-- Papildu indikators administratoram -->
            <span v-if="isAdminViewingAsStudent" class="admin-scope-indicator"
              >(Admina Skats)</span
            >
          </h4>
          <!-- Pārbaudes darbu saraksts, ja tādi ir -->
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
          <!-- Ziņojums, ja nav tuvāko pārbaudes darbu -->
          <p v-else class="no-items-message">
            <i class="fas fa-folder-open"></i> Nav tuvāko pārbaudes darbu.
          </p>
        </div>
      </div>
      <!-- Poga "Skatīt Visus Darbus Sarakstā", redzama, ja ir kādi aktuālie darbi -->
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
    // Pašreizējā pieteiktā lietotāja objekts.
    currentUser: Object,
    // Būla vērtība, kas norāda, vai administrators skatās studenta paneli.
    isAdminViewingAsStudent: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      upcomingHomeworks: [], // Masīvs tuvākajiem mājasdarbiem
      upcomingTests: [], // Masīvs tuvākajiem pārbaudes darbiem
      isLoadingItems: true, // Norāda, vai notiek aktuālo darbu ielāde
      fetchError: "", // Kļūdas ziņojums darbu ielādei
      MAX_DISPLAY_ITEMS: 3, // Maksimālais attēlojamo vienumu skaits katrā sarakstā
    };
  },
  methods: {
    // Izsauc 'logout' notikumu, lai izrakstītos.
    logout() {
      this.$emit("logout");
    },
    // Izsauc 'navigateToAddHomework' notikumu, lai pārietu uz mājasdarba pievienošanas skatu.
    navigateToAddHomework() {
      this.$emit("navigateToAddHomework");
    },
    // Izsauc 'navigateToAddTest' notikumu, lai pārietu uz pārbaudes darba pievienošanas skatu.
    navigateToAddTest() {
      this.$emit("navigateToAddTest");
    },
    // Izsauc 'navigateToHomeworkList' notikumu, lai pārietu uz visu darbu sarakstu.
    navigateToHomeworkList() {
      this.$emit("navigateToHomeworkList");
    },
    // Izsauc 'navigateToGroupList' notikumu, lai pārietu uz grupu sarakstu.
    navigateToGroupList() {
      this.$emit("navigateToGroupList");
    },
    // Asinhrona metode, lai ielādētu tuvākos mājasdarbus un pārbaudes darbus.
    async fetchUpcomingItems() {
      this.isLoadingItems = true; // Sāk ielādes stāvokli
      this.fetchError = ""; // Notīra iepriekšējo kļūdas ziņojumu
      // API pieprasījumi izmantos administratora pilnvaru, ja administrators skatās kā students.
      // Servera puse atgriezīs visus vienumus administratoram.
      try {
        // Vienlaicīgi izsauc abus API pieprasījumus.
        const [homeworkRes, testsRes] = await Promise.all([
          axios.get("/api/homework"), // Pieprasījums mājasdarbiem
          axios.get("/api/tests"), // Pieprasījums pārbaudes darbiem
        ]);
        // Saglabā tikai noteiktu skaitu tuvāko mājasdarbu un pārbaudes darbu.
        this.upcomingHomeworks = homeworkRes.data.slice(
          0,
          this.MAX_DISPLAY_ITEMS
        );
        this.upcomingTests = testsRes.data.slice(0, this.MAX_DISPLAY_ITEMS);
      } catch (error) {
        console.error("Kļūda ielādējot aktuālos darbus:", error);
        this.fetchError =
          error.response?.data?.msg || "Kļūda ielādējot aktuālos darbus.";
      } finally {
        this.isLoadingItems = false; // Beidz ielādes stāvokli
      }
    },
    // Formatē datuma virkni uz lokalizētu formātu (DD.MM.GGGG).
    formatDate(dateString) {
      if (!dateString) return "N/A"; // Ja datums nav norādīts
      const options = { year: "numeric", month: "2-digit", day: "2-digit" };
      try {
        return new Date(dateString).toLocaleDateString("lv-LV", options);
      } catch (e) {
        return dateString; // Atgriež oriģinālo virkni, ja notiek kļūda
      }
    },
    // Metode, lai pārietu uz konkrēta vienuma detaļu skatu (pašlaik novirza uz kopējo sarakstu).
    navigateToItemDetails(itemId, itemType) {
      console.log(`Navigēt uz detaļām priekš ${itemType} ID: ${itemId}`);
      // Pašlaik novirza uz kopējo darbu sarakstu.
      // Nākotnē varētu novirzīt uz specifisku vienuma skatu, ja tāds tiktu izveidots.
      this.$emit("navigateToHomeworkList");
    },
  },
  watch: {
    // Vēro `currentUser` objekta izmaiņas.
    // Tas ir svarīgi, ja administrators pārslēdzas uz studenta skatu pēc komponenta ielādes,
    // vai ja lietotājs izrakstās un šis komponents kaut kādā veidā paliek aktīvs (maz ticams ar pašreizējo App.vue loģiku).
    currentUser: {
      handler() {
        // Ja `currentUser` mainās, atkārtoti ielādē aktuālos darbus.
        this.fetchUpcomingItems();
      },
      deep: true, // Dziļā novērošana, ja mainās `currentUser` iekšējās īpašības, kas ietekmē datu ielādi.
      immediate: true, // Izsauc `fetchUpcomingItems` arī sākotnējās komponenta ielādes brīdī.
    },
  },
};
</script>

<style scoped>
/* Informācijas paneļa skata stili. Daži stili, piemēram, .card-style, tiek mantoti no globālajiem stiliem App.vue. */
.dashboard-view {
  padding: 1.5rem; /* Iekšējā atkāpe visam panelim */
}

/* Paneļa galvenes stili */
.dashboard-view-header {
  margin-bottom: 1.5rem; /* Atstarpe zem galvenes */
  padding-bottom: 1rem; /* Iekšējā atkāpe zem galvenes satura */
  border-bottom: 1px solid var(--border-color); /* Apakšējā līnija galvenei */
}
/* Galvenes satura konteiners */
.dashboard-view-header .header-content {
  display: flex; /* Flexbox izkārtojums elementiem galvenē */
  justify-content: space-between; /* Izlīdzina elementus ar atstarpi starp tiem */
  align-items: center; /* Vertikāli centrē elementus */
  flex-wrap: wrap; /* Atļauj elementiem pāriet jaunā rindā, ja nepietiek vietas */
  gap: 0.5rem; /* Atstarpe starp elementiem, ja tie pārnesas jaunā rindā */
}
/* Skata virsraksts galvenē */
.dashboard-view-header .view-title {
  color: var(--header-bg-color); /* Virsraksta krāsa */
  margin: 0; /* Noņem noklusējuma atstarpes */
  font-size: 1.8rem; /* Virsraksta fonta lielums */
  font-weight: 600; /* Virsraksta fonta biezums */
  display: flex; /* Flexbox ikonai un tekstam virsrakstā */
  align-items: center; /* Vertikāli centrē ikonu un tekstu */
  gap: 0.75rem; /* Atstarpe starp ikonu un tekstu */
  flex-grow: 1; /* Ļauj virsrakstam aizņemt pieejamo vietu */
}
/* Paziņojums administratoram, kad tas skatās studenta paneli */
.admin-view-notice {
  font-size: 0.85rem; /* Fonta lielums */
  color: var(--warning-color); /* Brīdinājuma krāsa tekstam */
  background-color: rgba(255, 193, 7, 0.1); /* Gaišs brīdinājuma fons */
  padding: 0.5rem 0.75rem; /* Iekšējā atkāpe */
  border-radius: var(--border-radius); /* Noapaļoti stūri */
  border: 1px solid var(--warning-color); /* Apmale brīdinājuma krāsā */
  display: flex; /* Flexbox ikonai un tekstam */
  align-items: center; /* Vertikāli centrē ikonu un tekstu */
  gap: 0.5rem; /* Atstarpe starp ikonu un tekstu */
}

/* Izrakstīšanās pogas stili (izmanto globālos .action-button un .danger-button) */
.logout-button {
  /* Papildu specifiski stili, ja nepieciešams */
}
/* Bīstamības pogas (piem., Iziet) stili */
.action-button.danger-button {
  background-color: var(--danger-color); /* Fona krāsa */
  color: var(--text-color-light); /* Teksta krāsa */
}
/* Bīstamības pogas stils, kad pele ir virs tās (un tā nav atspējota) */
.action-button.danger-button:hover:not([disabled]) {
  background-color: #c82333; /* Tumšāka fona krāsa */
}

/* Paneļa ievada teksta stils */
.dashboard-intro p {
  font-size: 1.05rem; /* Fonta lielums */
  color: #555; /* Teksta krāsa */
  margin-bottom: 1.5rem; /* Atstarpe zem teksta */
  line-height: 1.7; /* Rindstarpa */
  text-align: center; /* Teksta līdzināšana centrā */
}

/* Paneļa darbību pogu konteinera stils */
.dashboard-actions {
  margin-bottom: 1.5rem; /* Atstarpe zem pogu bloka */
  display: flex; /* Flexbox izkārtojums pogām */
  flex-wrap: wrap; /* Atļauj pogām pāriet jaunā rindā */
  gap: 0.75rem; /* Atstarpe starp pogām */
  justify-content: center; /* Centrē pogas */
}
/* Darbību pogu stils (izmanto globālo .action-button) */
.dashboard-actions .action-button {
  flex-grow: 1; /* Ļauj pogām aizpildīt pieejamo vietu */
  min-width: 200px; /* Minimālais pogas platums labākai pārnešanai */
  background-color: var(--primary-color); /* Noklusējuma fona krāsa */
}
/* Atšķirīgas krāsas dažādām pogām */
.dashboard-actions .action-button:nth-child(2) {
  background-color: var(--info-color); /* Otrajai pogai informācijas krāsa */
}
.dashboard-actions .action-button:nth-child(3) {
  background-color: var(--success-color); /* Trešajai pogai veiksmes krāsa */
}
.dashboard-actions .action-button:nth-child(4) {
  background-color: var(
    --secondary-color
  ); /* Ceturtajai pogai sekundārā krāsa */
}

/* Darbību pogu stils, kad pele ir virs tām (un tās nav atspējotas) */
.dashboard-actions .action-button:hover:not([disabled]) {
  filter: brightness(110%); /* Nedaudz paspilgtina pogu */
}

/* Horizontālā sadalītāja līnija starp sekcijām */
.section-divider {
  border: 0; /* Noņem noklusējuma apmali */
  height: 1px; /* Līnijas augstums */
  background-color: var(--border-color); /* Līnijas krāsa */
  margin: 2rem 0; /* Atstarpes virs un zem līnijas */
}

/* Tuvāko notikumu paneļa stili */
.upcoming-items-panel {
  margin-top: 1.5rem; /* Atstarpe virs paneļa */
}
/* Tuvāko notikumu paneļa virsraksta stils */
.upcoming-items-panel .panel-title {
  font-size: 1.5rem; /* Fonta lielums */
  color: var(--header-bg-color); /* Virsraksta krāsa */
  margin-bottom: 1.5rem; /* Atstarpe zem virsraksta */
  text-align: center; /* Teksta līdzināšana centrā */
  display: flex; /* Flexbox ikonai un tekstam */
  align-items: center; /* Vertikāli centrē ikonu un tekstu */
  justify-content: center; /* Horizontāli centrē ikonu un tekstu */
  gap: 0.75rem; /* Atstarpe starp ikonu un tekstu */
}

/* Konteiners kolonnām ar aktuālajiem darbiem */
.upcoming-columns-container {
  display: flex; /* Flexbox izkārtojums kolonnām */
  flex-wrap: wrap; /* Atļauj kolonnām pāriet jaunā rindā */
  gap: 1.5rem; /* Atstarpe starp kolonnām */
}
/* Stils atsevišķai kolonnai (mājasdarbiem vai pārbaudes darbiem) */
.upcoming-column {
  flex: 1; /* Ļauj kolonnai aizpildīt pieejamo vietu */
  min-width: 300px; /* Minimālais kolonnas platums pirms pārnešanas */
}
/* Stils iekšējām kartītēm (piem., katrai kolonnai) */
.card-style-inner {
  background-color: var(--card-bg-color); /* Fona krāsa */
  border-radius: var(--border-radius); /* Noapaļoti stūri */
  box-shadow: var(--shadow-sm); /* Neliela ēna */
  padding: 1.25rem; /* Iekšējā atkāpe */
  border: 1px solid var(--border-color); /* Apmale */
}

/* Kolonnas virsraksta stils (piem., "Tuvākie Mājasdarbi") */
.upcoming-column h4 {
  color: var(--header-bg-color); /* Virsraksta krāsa */
  margin-top: 0; /* Noņem augšējo atstarpi */
  margin-bottom: 1rem; /* Atstarpe zem virsraksta */
  padding-bottom: 0.75rem; /* Iekšējā atkāpe zemāk */
  border-bottom: 1px solid var(--border-color); /* Apakšējā līnija */
  font-size: 1.25rem; /* Pielāgots fonta lielums */
  font-weight: 600; /* Fonta biezums */
  display: flex; /* Flexbox ikonai un tekstam */
  align-items: center; /* Vertikāli centrē ikonu un tekstu */
  gap: 0.6rem; /* Atstarpe starp ikonu un tekstu */
}
/* Indikatora stils administratoram, kad skatās studenta paneli */
.admin-scope-indicator {
  font-size: 0.7rem; /* Fonta lielums */
  font-weight: normal; /* Parasts fonta biezums */
  color: var(--secondary-color); /* Sekundārā krāsa */
  margin-left: 0.5em; /* Atstarpe no kreisās puses */
}
/* Mājasdarbu ikonas krāsa */
.icon-homework {
  color: var(--primary-color);
}
/* Pārbaudes darbu ikonas krāsa */
.icon-test {
  color: var(--warning-color);
}

/* Tuvāko notikumu saraksta stils */
.upcoming-list {
  list-style: none; /* Noņem saraksta marķierus */
  padding: 0; /* Noņem iekšējo atkāpi */
  margin: 0; /* Noņem ārējās atstarpes */
}
/* Atsevišķa vienuma stils tuvāko notikumu sarakstā */
.upcoming-item {
  padding: 0.8rem 1rem; /* Iekšējā atkāpe */
  margin-bottom: 0.75rem; /* Atstarpe zem vienuma */
  border-radius: var(--border-radius); /* Noapaļoti stūri */
  border-left-width: 5px; /* Kreisās apmales biezums */
  border-left-style: solid; /* Kreisās apmales stils */
  background-color: #f8f9fa; /* Gaišāks fons vienumiem */
  box-shadow: var(--shadow-sm); /* Neliela ēna */
  transition: transform 0.2s ease, box-shadow 0.2s ease; /* Animācija pārejām */
  cursor: pointer; /* Rāda norādes kursoru */
}
/* Vienuma stils, kad pele ir virs tā */
.upcoming-item:hover {
  transform: translateY(-2px); /* Nedaudz paceļ vienumu */
  box-shadow: var(--shadow-md); /* Lielāka ēna */
}
/* Mājasdarba vienuma kreisās apmales krāsa */
.upcoming-item.homework-item {
  border-left-color: var(--primary-color);
}
/* Pārbaudes darba vienuma kreisās apmales krāsa */
.upcoming-item.test-item {
  border-left-color: var(--warning-color);
}

/* Stils tekstam vienuma iekšienē */
.upcoming-item span {
  display: block; /* Katrs span elements jaunā rindā */
  font-size: 0.95rem; /* Fonta lielums */
}
/* Vienuma priekšmeta (virsraksta) stils */
.upcoming-item .item-subject {
  font-weight: 600; /* Biezāks fonts */
  color: var(--text-color); /* Teksta krāsa */
  margin-bottom: 0.3rem; /* Atstarpe zemāk */
  font-size: 1.05rem; /* Nedaudz lielāks fonts */
}
/* Vienuma datuma un grupas teksta stils */
.upcoming-item .item-date,
.upcoming-item .item-group {
  color: #6c757d; /* Sekundārā teksta krāsa */
  font-size: 0.85rem; /* Mazāks fonts */
  margin-bottom: 0.2rem; /* Neliela atstarpe zemāk */
  display: flex; /* Flexbox ikonai un tekstam */
  align-items: center; /* Vertikāli centrē ikonu un tekstu */
  gap: 0.4rem; /* Atstarpe starp ikonu un tekstu */
}
/* Ziņojuma stils, ja nav aktuālo darbu */
.no-items-message {
  color: #6c757d; /* Teksta krāsa */
  font-style: italic; /* Slīpraksts */
  padding: 1rem 0; /* Iekšējā atkāpe */
  text-align: center; /* Teksta līdzināšana centrā */
  display: flex; /* Flexbox ikonai un tekstam */
  align-items: center; /* Vertikāli centrē ikonu un tekstu */
  justify-content: center; /* Horizontāli centrē ikonu un tekstu */
  gap: 0.5rem; /* Atstarpe starp ikonu un tekstu */
  font-size: 0.95rem; /* Fonta lielums */
}
/* Konteiners pogai "Skatīt Visus Darbus Sarakstā" */
.view-all-link-container {
  text-align: center; /* Centrē pogu */
  margin-top: 1.5rem; /* Atstarpe virs pogas */
}
/* Stils pogai "Skatīt Visus Darbus Sarakstā" (izmanto globālos .action-button un .secondary-button) */
.view-all-link-container .action-button {
  /* Papildu specifiski stili, ja nepieciešams */
}
</style>
