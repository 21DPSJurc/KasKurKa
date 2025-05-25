<template>
  <div class="homework-list-view card-style">
    <!-- Poga, lai dotos atpakaļ uz informācijas paneli -->
    <!-- Atspējota, ja notiek kāda no ielādes vai apstrādes darbībām -->
    <button
      @click="goBackToDashboard"
      class="back-button"
      :disabled="isLoading || isUpdatingProgress || isDeleting"
    >
      <i class="fas fa-arrow-left"></i> Atpakaļ uz Paneli
    </button>
    <!-- Skata virsraksts ar ikonu -->
    <h2 class="view-title">
      <i class="fas fa-clipboard-list"></i> Darbu Saraksts
    </h2>

    <!-- Filtru panelis darbu saraksta filtrēšanai un kārtošanai -->
    <div class="filters-panel card-style-inner">
      <h3 class="filters-title">
        <i class="fas fa-filter"></i> Filtri un Kārtošana
      </h3>
      <!-- Filtru režģis ar dažādiem filtriem -->
      <div class="filters-grid">
        <!-- Tips (Visi, Mājasdarbi, Pārbaudes Darbi) -->
        <div class="form-group">
          <label for="typeFilter">Tips:</label>
          <select
            id="typeFilter"
            v-model="typeFilter"
            :disabled="isLoading || isUpdatingProgress || isDeleting"
          >
            <option value="">Visi Tipi</option>
            <option value="homework">Mājasdarbi</option>
            <option value="test">Pārbaudes Darbi</option>
          </select>
        </div>
        <!-- Priekšmeta meklēšanas lauks -->
        <div class="form-group">
          <label for="subjectFilter">Priekšmets:</label>
          <input
            type="text"
            id="subjectFilter"
            v-model="subjectFilter"
            placeholder="Meklēt priekšmetu..."
            :disabled="isLoading || isUpdatingProgress || isDeleting"
          />
        </div>
        <!-- Grupas filtrs (tikai lietotāja grupas) -->
        <div class="form-group">
          <label for="groupFilter">Grupa:</label>
          <select
            id="groupFilter"
            v-model="groupFilter"
            :disabled="
              isLoading ||
              isUpdatingProgress ||
              isDeleting ||
              uniqueCustomGroupNames.length === 0
            "
          >
            <option value="">Visas Manas Grupas</option>
            <option
              v-for="groupName in uniqueCustomGroupNames"
              :key="groupName"
              :value="groupName"
            >
              {{ groupName }}
            </option>
          </select>
          <!-- Ziņojums, ja nav grupu, ko filtrēt -->
          <small v-if="uniqueCustomGroupNames.length === 0 && !isLoading"
            >Nav grupu, ko filtrēt.</small
          >
        </div>
        <!-- Kārtošanas kritērija izvēle -->
        <div class="form-group">
          <label for="sortBy">Kārtot pēc:</label>
          <select
            id="sortBy"
            v-model="sortBy"
            :disabled="isLoading || isUpdatingProgress || isDeleting"
          >
            <option value="date_desc">Datums (Tuvākie)</option>
            <option value="date_asc">Datums (Tālākie)</option>
            <option value="subject_asc">Priekšmets (A-Z)</option>
            <option value="subject_desc">Priekšmets (Z-A)</option>
            <option value="added_desc">Pievienošanas datums (Jaunākie)</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Indikators, kas tiek rādīts, kamēr notiek datu ielāde -->
    <div v-if="isLoading" class="loading-indicator">
      <i class="fas fa-spinner fa-spin"></i> Notiek ielāde...
    </div>
    <!-- Kļūdas ziņojums, ja notikusi kļūda ielādējot datus -->
    <div v-else-if="errorMessage" class="error-message">
      <i class="fas fa-exclamation-triangle"></i> {{ errorMessage }}
    </div>
    <!-- Ziņojums, ja pēc filtrēšanas nav atrasts neviens darbs -->
    <div
      v-else-if="filteredAndSortedItems.length === 0"
      class="empty-list-message card-style-inner"
    >
      <i class="fas fa-folder-open fa-3x"></i>
      <p>
        Pēc jūsu izvēlētajiem kritērijiem nekas nav atrasts, vai arī saraksts ir
        tukšs.
      </p>
      <!-- Papildu ieteikums, ja aktīvi filtri -->
      <p v-if="typeFilter || subjectFilter || groupFilter">
        Mēģiniet mainīt filtru iestatījumus.
      </p>
    </div>

    <!-- Konteiners darbu sarakstam -->
    <div v-else class="items-container">
      <!-- Cikls cauri filtrētajiem un sakārtotajiem darbiem -->
      <div
        v-for="item in filteredAndSortedItems"
        :key="item._id"
        class="list-item card-style-inner"
        :class="[item.type, { 'item-done': item.isDone }]"
      >
        <!-- Darba galvenās informācijas bloks -->
        <div class="item-main-info">
          <!-- Darba tipa ikona -->
          <div class="item-type-icon" :class="item.type">
            <i
              :class="
                item.type === 'homework'
                  ? 'fas fa-book-reader'
                  : 'fas fa-feather-alt'
              "
            ></i>
          </div>
          <!-- Darba detaļu bloks (priekšmets, tips, datums, grupa) -->
          <div class="item-details">
            <h3 class="item-subject">{{ item.subject }}</h3>
            <span class="item-type-badge" :class="item.type">{{
              item.type === "homework" ? "Mājasdarbs" : "Pārbaudes Darbs"
            }}</span>
            <p class="item-date">
              <i class="fas fa-calendar-alt"></i>
              {{ item.type === "homework" ? "Termiņš" : "Norise" }}:
              <strong>{{
                formatDate(
                  item.type === "homework" ? item.dueDate : item.eventDate
                )
              }}</strong>
              <!-- Laiks pārbaudes darbam, ja norādīts -->
              <span v-if="item.type === 'test' && item.eventTime"
                >, {{ item.eventTime }}</span
              >
            </p>
            <p class="item-group-display">
              <i class="fas fa-layer-group"></i> Grupa:
              {{ item.customGroupName || "Nezināma" }}
            </p>
          </div>
        </div>

        <!-- Izvēršamais saturs ar detalizētāku informāciju -->
        <div
          class="item-content collapsible-content"
          :class="{ expanded: item.expanded }"
        >
          <!-- Apraksts vai tēmas -->
          <p class="item-description">
            <strong>Apraksts:</strong>
            {{ item.description || item.topics || "Nav norādīts" }}
          </p>
          <!-- Papildus informācija, ja ir -->
          <p v-if="item.additionalInfo" class="item-additional-info">
            <strong>Papildus Info:</strong> {{ item.additionalInfo }}
          </p>

          <!-- Saites, ja ir pievienotas -->
          <div v-if="item.links && item.links.length > 0" class="item-links">
            <strong><i class="fas fa-link"></i> Saites:</strong>
            <ul>
              <li v-for="(link, index) in item.links" :key="index">
                <a :href="link" target="_blank" rel="noopener noreferrer">{{
                  link
                }}</a>
              </li>
            </ul>
          </div>

          <!-- Informācija par autoru un pievienošanas datumu -->
          <div class="item-meta">
            <p class="item-author">
              <i class="fas fa-user-edit"></i> Pievienoja:
              {{ item.userFirstName }} ({{ item.userGroup }})
            </p>
            <p class="item-added-date">
              <i class="fas fa-clock"></i> Pievienots:
              {{ formatDate(item.createdAt, true) }}
            </p>
          </div>
        </div>

        <!-- Darbību panelis (progresa atzīmēšana, izvērst, komentāri, rediģēt, dzēst) -->
        <div class="item-actions-footer">
          <!-- Galvenās darbības (progress, izvērst) -->
          <div class="main-actions">
            <!-- Progresa atzīmēšanas lauciņš -->
            <label
              class="progress-checkbox-label"
              :for="'progress-' + item._id"
              title="Atzīmēt kā izpildītu/neizpildītu"
            >
              <input
                type="checkbox"
                :id="'progress-' + item._id"
                :checked="item.isDone"
                @change="toggleProgress(item)"
                :disabled="
                  isUpdatingProgress || isDeleting || isCommentingBusy(item._id)
                "
              />
              <i
                :class="item.isDone ? 'fas fa-check-square' : 'far fa-square'"
              ></i>
              <span>{{ item.isDone ? "Izpildīts" : "Nav Izpildīts" }}</span>
            </label>
            <!-- Poga satura izvēršanai/savēršanai -->
            <button
              @click="toggleItemExpansion(item._id)"
              class="action-button-small expand-toggle"
              :title="item.expanded ? 'Slēpt detaļas' : 'Rādīt detaļas'"
            >
              <i
                :class="
                  item.expanded ? 'fas fa-chevron-up' : 'fas fa-chevron-down'
                "
              ></i>
              {{ item.expanded ? "Mazāk" : "Vairāk" }}
            </button>
          </div>
          <!-- Papildu darbības (komentāri, rediģēt, dzēst) -->
          <div class="contextual-actions">
            <!-- Poga komentāru sadaļas atvēršanai/aizvēršanai -->
            <button
              @click="toggleComments(item._id)"
              class="action-button-small comments-toggle"
              :disabled="isCommentingBusy(item._id)"
              :title="
                itemComments[item._id] && itemComments[item._id].show
                  ? 'Slēpt komentārus'
                  : 'Rādīt/Pievienot komentārus'
              "
            >
              <i class="fas fa-comments"></i> Komentāri
              <!-- Komentāru skaits, ja tādi ir -->
              <span
                v-if="
                  itemComments[item._id] &&
                  itemComments[item._id].list.length > 0
                "
                class="comment-count"
              >
                ({{ itemComments[item._id].list.length }})</span
              >
            </button>
            <!-- Darbības, kas pieejamas tikai ieraksta autoram vai administratoram -->
            <div
              v-if="
                currentUserId &&
                (item.userId === currentUserId || currentUserRole === 'admin')
              "
              class="owner-admin-actions"
            >
              <!-- Rediģēšanas poga -->
              <button
                @click="editItem(item)"
                class="action-button-small edit-btn"
                :disabled="
                  isUpdatingProgress || isDeleting || isCommentingBusy(item._id)
                "
                title="Rediģēt"
              >
                <i class="fas fa-edit"></i>
              </button>
              <!-- Dzēšanas poga -->
              <button
                @click="confirmDeleteItem(item)"
                class="action-button-small delete-btn"
                :disabled="
                  isUpdatingProgress || isDeleting || isCommentingBusy(item._id)
                "
                title="Dzēst"
              >
                <i class="fas fa-trash-alt"></i>
              </button>
            </div>
          </div>
        </div>

        <!-- Komentāru sadaļa, redzama, ja ir atvērta -->
        <div
          v-if="itemComments[item._id] && itemComments[item._id].show"
          class="comments-area-wrapper"
        >
          <div class="comments-area card-style-inner">
            <h4>
              <i class="fas fa-comment-dots"></i> Komentāri par "{{
                item.subject
              }}"
            </h4>
            <!-- Indikators, kamēr notiek komentāru ielāde -->
            <div
              v-if="itemComments[item._id].isLoading"
              class="loading-indicator small"
            >
              <i class="fas fa-spinner fa-spin"></i> Notiek komentāru ielāde...
            </div>
            <!-- Kļūdas ziņojums, ja neizdevās ielādēt komentārus -->
            <div
              v-if="itemComments[item._id].error"
              class="error-message small"
            >
              <i class="fas fa-exclamation-triangle"></i>
              {{ itemComments[item._id].error }}
            </div>

            <!-- Ziņojums, ja nav komentāru -->
            <div
              v-if="
                !itemComments[item._id].isLoading &&
                itemComments[item._id].list.length === 0 &&
                !itemComments[item._id].error
              "
              class="no-comments"
            >
              <i class="fas fa-comment-slash"></i> Nav komentāru. Esi pirmais!
            </div>
            <!-- Komentāru saraksts -->
            <ul
              v-else-if="!itemComments[item._id].isLoading"
              class="comments-list"
            >
              <li
                v-for="comment in itemComments[item._id].list"
                :key="comment._id"
                class="comment-item"
              >
                <p class="comment-text">{{ comment.text }}</p>
                <p class="comment-meta">
                  <span
                    ><i class="fas fa-user"></i> {{ comment.userName }}</span
                  >
                  <span
                    ><i class="fas fa-clock"></i>
                    {{ formatDate(comment.createdAt, true) }}</span
                  >
                  <!-- Komentāra dzēšanas poga (autoram vai adminam) -->
                  <button
                    v-if="
                      currentUserId === comment.userId ||
                      currentUserRole === 'admin'
                    "
                    @click="deleteComment(item._id, comment._id)"
                    class="delete-comment-btn"
                    :disabled="isCommentingBusy(item._id)"
                    title="Dzēst komentāru"
                  >
                    <i class="fas fa-times-circle"></i>
                  </button>
                </p>
              </li>
            </ul>

            <!-- Forma jauna komentāra pievienošanai -->
            <form
              @submit.prevent="addComment(item._id)"
              class="add-comment-form"
            >
              <textarea
                v-model="newCommentText[item._id]"
                placeholder="Rakstiet savu komentāru šeit..."
                rows="3"
                :disabled="isCommentingBusy(item._id)"
              ></textarea>
              <button
                type="submit"
                class="action-button primary-button"
                :disabled="
                  !newCommentText[item._id] ||
                  !newCommentText[item._id].trim() ||
                  isCommentingBusy(item._id)
                "
              >
                <i class="fas fa-paper-plane"></i> Pievienot Komentāru
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from "axios";

export default {
  name: "HomeworkListView",
  props: {
    // Pašreizējā pieteiktā lietotāja ID.
    currentUserId: String,
    // Pašreizējā pieteiktā lietotāja loma (piem., 'student', 'admin').
    currentUserRole: String,
  },
  data() {
    return {
      allItems: [], // Masīvs ar visiem ielādētajiem mājasdarbiem un pārbaudes darbiem
      userProgress: {}, // Objekts, kas glabā lietotāja progresu katram darbam (ID: true/false)
      itemComments: {}, // Objekts, kas glabā komentārus katram darbam (ID: {show, list, isLoading, error})
      newCommentText: {}, // Objekts, kas glabā jauna komentāra tekstu katram darbam (ID: "teksts")
      commentingBusyStates: {}, // Objekts, kas norāda, vai notiek komentāru apstrāde katram darbam (ID: true/false)
      isLoading: true, // Norāda, vai notiek sākotnējā datu ielāde
      isUpdatingProgress: false, // Norāda, vai notiek progresa atjaunināšana
      isDeleting: false, // Norāda, vai notiek darba dzēšana
      errorMessage: "", // Vispārīgs kļūdas ziņojums
      typeFilter: "", // Pašreizējais tipa filtrs (homework, test, vai tukšs)
      subjectFilter: "", // Pašreizējais priekšmeta meklēšanas vaicājums
      groupFilter: "", // Pašreizējais grupas filtrs (grupas nosaukums)
      sortBy: "date_desc", // Pašreizējais kārtošanas kritērijs
    };
  },
  computed: {
    // Aprēķinātais īpašums, kas atgriež unikālos pielāgoto grupu nosaukumus no visiem ielādētajiem darbiem.
    // Izmanto, lai aizpildītu grupu filtra izvēlni.
    uniqueCustomGroupNames() {
      const groupNames = new Set(); // Izmanto Set, lai automātiski nodrošinātu unikalitāti
      this.allItems.forEach((item) => {
        if (item.customGroupName && item.customGroupName !== "Nezināma grupa") {
          groupNames.add(item.customGroupName);
        }
      });
      // Pārveido Set par masīvu un sakārto alfabētiski.
      return Array.from(groupNames).sort((a, b) => a.localeCompare(b));
    },
    // Aprēķinātais īpašums, kas atgriež filtrētu un sakārtotu darbu sarakstu.
    filteredAndSortedItems() {
      let itemsToDisplay = this.allItems
        // Pievieno `isDone` īpašību katram darbam, balstoties uz `userProgress` datiem.
        .map((item) => ({
          ...item,
          isDone: !!this.userProgress[item._id], // Pārveido uz boolean vērtību
        }))
        // Filtrē darbus atbilstoši aktīvajiem filtriem.
        .filter((item) => {
          if (this.typeFilter && item.type !== this.typeFilter) return false;
          if (this.subjectFilter.trim()) {
            const subjectQuery = this.subjectFilter.trim().toLowerCase();
            if (!item.subject.toLowerCase().includes(subjectQuery))
              return false;
          }
          if (this.groupFilter && item.customGroupName !== this.groupFilter)
            return false;
          return true; // Ja darbs atbilst visiem filtriem (vai filtri nav aktīvi)
        })
        // Sakārto filtrētos darbus atbilstoši izvēlētajam kārtošanas kritērijam.
        .sort((a, b) => {
          const dateA = new Date(
            a.type === "homework" ? a.dueDate : a.eventDate
          );
          const dateB = new Date(
            b.type === "homework" ? b.dueDate : b.eventDate
          );
          const createdA = new Date(a.createdAt);
          const createdB = new Date(b.createdAt);

          switch (this.sortBy) {
            case "date_asc": // Datums augoši (tālākie pirmie)
              return dateA - dateB;
            case "date_desc": // Datums dilstoši (tuvākie pirmie) - noklusējums
              return dateB - dateA;
            case "subject_asc": // Priekšmets alfabētiski (A-Z)
              return a.subject.localeCompare(b.subject);
            case "subject_desc": // Priekšmets alfabētiski (Z-A)
              return b.subject.localeCompare(a.subject);
            case "added_desc": // Pievienošanas datums (jaunākie pirmie)
              return createdB - createdA;
            default: // Noklusējuma kārtošana (tuvākie datumi pirmie)
              return dateB - dateA;
          }
        });
      return itemsToDisplay;
    },
  },
  // Izsauc datu ielādes metodi, kad komponents tiek izveidots.
  created() {
    this.fetchAllData();
  },
  methods: {
    // Pārslēdz konkrētā darba izvērstā satura redzamību.
    toggleItemExpansion(itemId) {
      const itemIndex = this.allItems.findIndex((i) => i._id === itemId);
      if (itemIndex !== -1) {
        // Invertē `expanded` stāvokli atrastajam darbam.
        // Vue automātiski atjaunos DOM, jo `allItems` ir reaktīvs.
        this.allItems[itemIndex].expanded = !this.allItems[itemIndex].expanded;
      }
    },
    // Pārbauda, vai notiek kāda darbība ar konkrētā darba komentāriem.
    isCommentingBusy(itemId) {
      return !!this.commentingBusyStates[itemId];
    },
    // Iestata komentāru apstrādes stāvokli konkrētam darbam.
    setCommentingBusy(itemId, state) {
      this.commentingBusyStates = {
        ...this.commentingBusyStates,
        [itemId]: state,
      };
    },
    // Novirza lietotāju atpakaļ uz informācijas paneli.
    goBackToDashboard() {
      this.$emit("navigateToDashboard");
    },
    // Asinhrona metode visu nepieciešamo datu (darbi, progress) ielādei.
    async fetchAllData() {
      this.isLoading = true;
      this.errorMessage = "";
      try {
        // Vienlaicīgi pieprasa mājasdarbus, pārbaudes darbus un lietotāja progresu.
        const [homeworkRes, testsRes, progressRes] = await Promise.all([
          axios.get("/api/homework"),
          axios.get("/api/tests"),
          axios.get("/api/progress"),
        ]);

        // Apvieno mājasdarbus un pārbaudes darbus vienā sarakstā.
        const combinedItems = [...homeworkRes.data, ...testsRes.data];
        // Inicializē objektus komentāru un jaunu komentāru glabāšanai katram darbam.
        const initialItemComments = {};
        const initialNewCommentText = {};

        combinedItems.forEach((item) => {
          initialItemComments[item._id] = {
            show: false, // Vai komentāru sadaļa ir redzama
            list: [], // Komentāru saraksts
            isLoading: false, // Vai notiek komentāru ielāde
            error: null, // Kļūdas ziņojums komentāru ielādei
          };
          initialNewCommentText[item._id] = ""; // Sākotnēji tukšs teksts jaunam komentāram
        });
        this.itemComments = initialItemComments;
        this.newCommentText = initialNewCommentText;

        // Saglabā apvienotos darbus, pievienojot `expanded` stāvokli katram.
        this.allItems = combinedItems.map((item) => ({
          ...item,
          expanded: false, // Sākotnēji visi darbi ir savērsti
        }));
        this.userProgress = progressRes.data; // Saglabā lietotāja progresu
      } catch (error) {
        console.error("Kļūda ielādējot datus:", error);
        this.errorMessage =
          error.response?.data?.msg || "Kļūda ielādējot sarakstu.";
      } finally {
        this.isLoading = false; // Beidz ielādes stāvokli
      }
    },
    // Formatē datuma virkni uz lokalizētu formātu (DD.MM.GGGG vai ar laiku).
    formatDate(dateString, includeTime = false) {
      if (!dateString) return "N/A";
      const options = { year: "numeric", month: "2-digit", day: "2-digit" };
      if (includeTime) {
        options.hour = "2-digit";
        options.minute = "2-digit";
      }
      try {
        return new Date(dateString).toLocaleDateString("lv-LV", options);
      } catch (e) {
        return dateString; // Atgriež oriģinālo virkni, ja kļūda
      }
    },
    // Pārslēdz konkrētā darba progresa stāvokli (izpildīts/neizpildīts).
    async toggleProgress(itemFromTemplate) {
      this.isUpdatingProgress = true; // Sāk progresa atjaunināšanas stāvokli
      const newStatus = !itemFromTemplate.isDone; // Invertē pašreizējo statusu

      try {
        // Nosūta pieprasījumu serverim, lai atjauninātu progresu.
        await axios.post("/api/progress", {
          itemId: itemFromTemplate._id,
          status: newStatus,
        });
        // Atjaunina `userProgress` objektu lokāli, lai izmaiņas uzreiz atspoguļotos.
        this.userProgress = {
          ...this.userProgress,
          [itemFromTemplate._id]: newStatus,
        };
      } catch (error) {
        console.error("Kļūda atjauninot progresu:", error);
        alert("Kļūda, atjauninot progresu."); // Parāda kļūdas ziņojumu
      } finally {
        this.isUpdatingProgress = false; // Beidz progresa atjaunināšanas stāvokli
      }
    },
    // Izsauc 'editItem' notikumu, lai pārietu uz darba rediģēšanas skatu.
    editItem(item) {
      this.$emit("editItem", { itemId: item._id, itemType: item.type });
    },
    // Apstiprina un dzēš darbu.
    async confirmDeleteItem(itemFromTemplate) {
      // Pieprasa lietotājam apstiprinājumu pirms dzēšanas.
      if (
        confirm(
          `Vai tiešām vēlaties dzēst ierakstu "${itemFromTemplate.subject}"? Šī darbība ir neatgriezeniska.`
        )
      ) {
        this.isDeleting = true; // Sāk dzēšanas stāvokli
        this.errorMessage = ""; // Notīra kļūdas ziņojumu
        try {
          // Nosaka API URL atkarībā no darba tipa.
          const url =
            itemFromTemplate.type === "homework"
              ? `/api/homework/${itemFromTemplate._id}`
              : `/api/tests/${itemFromTemplate._id}`;
          const response = await axios.delete(url); // Nosūta dzēšanas pieprasījumu

          // Atjaunina lokālos datus, noņemot dzēsto darbu.
          this.allItems = this.allItems.filter(
            (i) => i._id !== itemFromTemplate._id
          );
          // Noņem dzēstā darba progresu, komentārus un jauna komentāra tekstu.
          const newProgress = { ...this.userProgress };
          delete newProgress[itemFromTemplate._id];
          this.userProgress = newProgress;

          const newComments = { ...this.itemComments };
          delete newComments[itemFromTemplate._id];
          this.itemComments = newComments;

          const newCommentTexts = { ...this.newCommentText };
          delete newCommentTexts[itemFromTemplate._id];
          this.newCommentText = newCommentTexts;

          // Paziņo vecākkomponentam par veiksmīgu dzēšanu.
          this.$emit(
            "itemDeleted",
            response.data.msg || "Ieraksts veiksmīgi dzēsts."
          );
          alert(response.data.msg || "Ieraksts veiksmīgi dzēsts.");
        } catch (error) {
          console.error("Kļūda dzēšot ierakstu:", error);
          this.errorMessage =
            error.response?.data?.msg || "Kļūda dzēšot ierakstu.";
          alert(this.errorMessage); // Parāda kļūdas ziņojumu
        } finally {
          this.isDeleting = false; // Beidz dzēšanas stāvokli
        }
      }
    },
    // Pārslēdz konkrētā darba komentāru sadaļas redzamību un ielādē komentārus, ja nepieciešams.
    async toggleComments(itemId) {
      // Ja konkrētajam darbam vēl nav komentāru objekta, inicializē to.
      if (!this.itemComments[itemId]) {
        this.itemComments[itemId] = {
          show: false,
          list: [],
          isLoading: false,
          error: null,
        };
      }
      const currentItemComments = this.itemComments[itemId];
      currentItemComments.show = !currentItemComments.show; // Invertē redzamības stāvokli

      // Ja komentāru sadaļa tiek atvērta, saraksts ir tukšs un nav kļūdas, ielādē komentārus.
      if (
        currentItemComments.show &&
        currentItemComments.list.length === 0 &&
        !currentItemComments.error
      ) {
        currentItemComments.isLoading = true; // Sāk komentāru ielādi
        this.setCommentingBusy(itemId, true); // Iestata aizņemtības stāvokli
        try {
          const response = await axios.get(`/api/comments/${itemId}`);
          currentItemComments.list = response.data; // Saglabā ielādētos komentārus
        } catch (error) {
          console.error(`Kļūda ielādējot komentārus priekš ${itemId}:`, error);
          currentItemComments.error =
            error.response?.data?.msg || "Neizdevās ielādēt komentārus.";
        } finally {
          currentItemComments.isLoading = false; // Beidz komentāru ielādi
          this.setCommentingBusy(itemId, false); // Noņem aizņemtības stāvokli
        }
      }
    },
    // Pievieno jaunu komentāru konkrētam darbam.
    async addComment(itemId) {
      const text = this.newCommentText[itemId]?.trim(); // Iegūst komentāra tekstu un noņem liekās atstarpes
      if (!text) return; // Ja teksts ir tukšs, pārtrauc

      const currentItemComments = this.itemComments[itemId];
      this.setCommentingBusy(itemId, true); // Sāk komentāra pievienošanas stāvokli
      currentItemComments.error = null; // Notīra iepriekšējo kļūdas ziņojumu
      try {
        // Nosūta pieprasījumu serverim, lai pievienotu komentāru.
        const response = await axios.post(`/api/comments/${itemId}`, { text });
        currentItemComments.list.push(response.data.comment); // Pievieno jauno komentāru lokālajam sarakstam
        this.newCommentText[itemId] = ""; // Notīra jauna komentāra ievades lauku
      } catch (error) {
        console.error(`Kļūda pievienojot komentāru priekš ${itemId}:`, error);
        currentItemComments.error =
          error.response?.data?.msg || "Neizdevās pievienot komentāru.";
      } finally {
        this.setCommentingBusy(itemId, false); // Beidz komentāra pievienošanas stāvokli
      }
    },
    // Dzēš komentāru.
    async deleteComment(itemId, commentId) {
      if (!confirm("Vai tiešām vēlaties dzēst šo komentāru?")) return; // Pieprasa apstiprinājumu

      const currentItemComments = this.itemComments[itemId];
      this.setCommentingBusy(itemId, true); // Sāk komentāra dzēšanas stāvokli
      currentItemComments.error = null;
      try {
        await axios.delete(`/api/comments/${commentId}`); // Nosūta dzēšanas pieprasījumu
        // Izfiltrē dzēsto komentāru no lokālā saraksta.
        currentItemComments.list = currentItemComments.list.filter(
          (c) => c._id !== commentId
        );
      } catch (error) {
        console.error(`Kļūda dzēšot komentāru ${commentId}:`, error);
        currentItemComments.error =
          error.response?.data?.msg || "Neizdevās dzēst komentāru.";
      } finally {
        this.setCommentingBusy(itemId, false); // Beidz komentāra dzēšanas stāvokli
      }
    },
  },
};
</script>

<style scoped>
/* Darbu saraksta skata galvenā konteinera stils */
.homework-list-view {
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
  /* Automātiski pielāgo kolonnu skaitu, katra kolonna vismaz 200px plata */
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
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

/* Darbu saraksta konteinera stils */
.items-container {
  margin-top: 1rem; /* Atstarpe virs konteinera */
}
/* Atsevišķa darba elementa stils */
.list-item {
  margin-bottom: 1.5rem; /* Atstarpe zem elementa */
  transition: box-shadow 0.2s ease; /* Animācija ēnai */
  overflow: hidden; /* Paslēpj saturu, kas pārsniedz robežas (svarīgi `collapsible-content`) */
}
/* Darba elementa stils, kad pele ir virs tā */
.list-item:hover {
  box-shadow: var(--shadow-md); /* Lielāka ēna */
}

/* Darba galvenās informācijas bloka stils */
.item-main-info {
  display: flex; /* Izmanto flexbox elementu izkārtojumam */
  align-items: flex-start; /* Līdzina elementus pie augšas */
  gap: 1rem; /* Atstarpe starp tipa ikonu un detaļām */
  padding-bottom: 0.75rem; /* Iekšējā atkāpe zemāk */
  border-bottom: 1px dashed var(--border-color); /* Pārtraukta līnija zemāk */
  margin-bottom: 0.75rem; /* Atstarpe zemāk */
}
/* Darba tipa ikonas stils */
.item-type-icon {
  font-size: 1.8rem; /* Ikonas lielums */
  padding-top: 0.2rem; /* Neliela atkāpe no augšas, lai labāk līdzinātos ar tekstu */
}
/* Mājasdarba tipa ikonas krāsa */
.item-type-icon.homework {
  color: var(--primary-color);
}
/* Pārbaudes darba tipa ikonas krāsa */
.item-type-icon.test {
  color: var(--warning-color);
}

/* Darba detaļu bloka stils */
.item-details {
  flex-grow: 1; /* Ļauj šim blokam aizpildīt pieejamo vietu */
}
/* Darba priekšmeta (virsraksta) stils */
.item-subject {
  margin: 0 0 0.25rem 0; /* Atstarpes */
  color: var(--header-bg-color); /* Krāsa */
  font-size: 1.3rem; /* Fonta lielums */
  font-weight: 600; /* Fonta biezums */
}
/* Darba tipa emblēmas (badge) stils */
.item-type-badge {
  font-size: 0.75rem; /* Fonta lielums */
  padding: 0.2rem 0.6rem; /* Iekšējā atkāpe */
  border-radius: 10px; /* Noapaļoti stūri */
  color: white; /* Teksta krāsa */
  font-weight: 500; /* Fonta biezums */
  text-transform: uppercase; /* Lielie burti */
  letter-spacing: 0.5px; /* Atstarpe starp burtiem */
  display: inline-block; /* Padara par inline bloku */
  margin-bottom: 0.5rem; /* Atstarpe zemāk */
}
/* Mājasdarba tipa emblēmas fona krāsa */
.list-item.homework .item-type-badge {
  background-color: var(--primary-color);
}
/* Pārbaudes darba tipa emblēmas fona krāsa (ar tumšu tekstu) */
.list-item.test .item-type-badge {
  background-color: var(--warning-color);
  color: var(--text-color);
}

/* Darba datuma un grupas teksta stils */
.item-date,
.item-group-display {
  font-size: 0.9rem; /* Fonta lielums */
  color: #555; /* Teksta krāsa */
  margin: 0.25rem 0; /* Atstarpes */
  display: flex; /* Izmanto flexbox ikonai un tekstam */
  align-items: center; /* Vertikāli centrē ikonu un tekstu */
  gap: 0.4rem; /* Atstarpe starp ikonu un tekstu */
}
/* Ikonu krāsa datuma un grupas tekstā */
.item-date .fas,
.item-group-display .fas {
  color: var(--secondary-color);
}

/* Stils izvēršamajam saturam */
.collapsible-content {
  max-height: 0; /* Sākotnēji augstums ir 0 (savērsts) */
  overflow: hidden; /* Paslēpj saturu, kas pārsniedz augstumu */
  /* Animācija augstuma, caurspīdīguma un iekšējās atkāpes maiņai */
  transition: max-height 0.4s ease-out, opacity 0.3s ease-out,
    padding-top 0.4s ease-out, padding-bottom 0.4s ease-out;
  opacity: 0; /* Sākotnēji caurspīdīgs */
  padding-top: 0; /* Sākotnēji nav augšējās atkāpes */
  padding-bottom: 0; /* Sākotnēji nav apakšējās atkāpes */
}
/* Stils izvērstam saturam */
.collapsible-content.expanded {
  max-height: 1000px; /* Pietiekami liels augstums, lai ietilpinātu saturu */
  opacity: 1; /* Pilnībā redzams */
  padding-top: 0.75rem; /* Pievieno augšējo atkāpi */
  padding-bottom: 0.75rem; /* Pievieno apakšējo atkāpi */
}

/* Darba apraksta un papildus informācijas stils */
.item-description,
.item-additional-info {
  font-size: 0.95rem; /* Fonta lielums */
  line-height: 1.6; /* Rindstarpa */
  color: #495057; /* Teksta krāsa */
  margin-bottom: 0.5rem; /* Atstarpe zemāk */
}
/* "Apraksts:" un "Papildus Info:" teksta stils */
.item-description strong,
.item-additional-info strong {
  color: var(--text-color); /* Tumšāka teksta krāsa */
}

/* Saišu bloka stils */
.item-links {
  margin-top: 0.75rem; /* Atstarpe virs bloka */
}
/* "Saites:" teksta stils */
.item-links strong {
  display: flex; /* Izmanto flexbox ikonai un tekstam */
  align-items: center; /* Vertikāli centrē ikonu un tekstu */
  gap: 0.4rem; /* Atstarpe starp ikonu un tekstu */
  font-size: 0.9rem; /* Fonta lielums */
  color: var(--text-color); /* Teksta krāsa */
  margin-bottom: 0.3rem; /* Atstarpe zemāk */
}
/* Saišu saraksta (ul) stils */
.item-links ul {
  list-style-type: none; /* Noņem saraksta marķierus */
  padding-left: 1.5rem; /* Iekšējā atkāpe no kreisās puses */
  margin: 0; /* Noņem ārējās atstarpes */
}
/* Atsevišķas saites (li) stils */
.item-links li {
  font-size: 0.9em; /* Fonta lielums */
  margin-bottom: 0.25rem; /* Atstarpe zemāk */
  word-break: break-all; /* Pārnes garas saites jaunā rindā */
  display: flex; /* Izmanto flexbox ikonai un tekstam (ja būtu ikona) */
  align-items: center; /* Vertikāli centrē ikonu un tekstu */
  gap: 0.3rem; /* Atstarpe starp ikonu un tekstu */
}
/* Hipersaites (a) stils */
.item-links a {
  color: var(--link-color); /* Saites krāsa */
  text-decoration: none; /* Noņem pasvītrojumu */
}
/* Hipersaites stils, kad pele ir virs tās */
.item-links a:hover {
  text-decoration: underline; /* Pievieno pasvītrojumu */
}

/* Darba metadatu (autors, pievienošanas datums) konteinera stils */
.item-meta {
  margin-top: 1rem; /* Atstarpe virs bloka */
  padding-top: 0.5rem; /* Iekšējā atkāpe augšpusē */
  border-top: 1px dotted #e0e0e0; /* Punktēta līnija augšpusē */
  font-size: 0.8rem; /* Fonta lielums */
  color: #7f8c8d; /* Teksta krāsa */
}
/* Atsevišķa metadatu elementa (p) stils */
.item-meta p {
  margin: 0.25rem 0; /* Atstarpes */
  display: flex; /* Izmanto flexbox ikonai un tekstam */
  align-items: center; /* Vertikāli centrē ikonu un tekstu */
  gap: 0.4rem; /* Atstarpe starp ikonu un tekstu */
}
/* Metadatu ikonas stils */
.item-meta .fas {
  font-size: 0.9em; /* Fonta lielums */
}

/* Stils izpildītam darbam */
.list-item.item-done {
  background-color: #e9f5e9; /* Gaiši zaļš fons */
  border-left-color: var(--success-color); /* Zaļa kreisā apmale */
}
/* Izpildīta mājasdarba tipa ikonas krāsa */
.list-item.item-done .item-main-info .item-type-icon.homework {
  color: var(--success-color);
}
/* Izpildīta pārbaudes darba tipa ikonas krāsa */
.list-item.item-done .item-main-info .item-type-icon.test {
  color: var(--success-color);
}
/* Izpildīta darba priekšmeta (virsraksta) stils (pārsvītrots) */
.list-item.item-done .item-subject {
  text-decoration: line-through; /* Pārsvītro tekstu */
  color: #5a6268; /* Tumšāka pelēka krāsa */
}

/* Darba darbību paneļa (apakšējā daļa) stils */
.item-actions-footer {
  margin-top: 1rem; /* Atstarpe virs paneļa */
  padding-top: 0.75rem; /* Iekšējā atkāpe augšpusē */
  border-top: 1px solid var(--border-color); /* Augšējā līnija */
  display: flex; /* Izmanto flexbox elementu izkārtojumam */
  justify-content: space-between; /* Izlīdzina elementus ar atstarpi starp tiem */
  align-items: center; /* Vertikāli centrē elementus */
  flex-wrap: wrap; /* Atļauj elementiem pāriet jaunā rindā */
  gap: 0.75rem; /* Atstarpe starp elementiem */
}
/* Galveno darbību (progresa atzīmēšana, izvērst) bloka stils */
.main-actions {
  display: flex; /* Izmanto flexbox elementu izkārtojumam */
  align-items: center; /* Vertikāli centrē elementus */
  gap: 0.75rem; /* Atstarpe starp elementiem */
}
/* Papildu (kontekstuālo) darbību (komentāri, rediģēt, dzēst) bloka stils */
.contextual-actions {
  display: flex; /* Izmanto flexbox elementu izkārtojumam */
  align-items: center; /* Vertikāli centrē elementus */
  gap: 0.5rem; /* Atstarpe starp elementiem */
}

/* Progresa atzīmēšanas lauciņa etiķetes stils */
.progress-checkbox-label {
  display: flex; /* Izmanto flexbox elementu izkārtojumam */
  align-items: center; /* Vertikāli centrē elementus */
  cursor: pointer; /* Rāda norādes kursoru */
  font-size: 0.9em; /* Fonta lielums */
  color: var(--text-color); /* Teksta krāsa */
  padding: 0.4rem 0.6rem; /* Iekšējā atkāpe */
  border-radius: var(--border-radius); /* Noapaļoti stūri */
  transition: background-color 0.2s; /* Animācija fona krāsas maiņai */
}
/* Etiķetes stils, kad pele ir virs tās */
.progress-checkbox-label:hover {
  background-color: #e9ecef; /* Gaišāks fons */
}
/* Paslēpj noklusējuma checkbox elementu */
.progress-checkbox-label input[type="checkbox"] {
  display: none;
}
/* Ikonu stils progresa atzīmēšanas lauciņā */
.progress-checkbox-label .fas,
.progress-checkbox-label .far {
  margin-right: 0.5rem; /* Atstarpe no labās puses ikonai */
  font-size: 1.2em; /* Ikonas lielums */
  color: var(--primary-color); /* Primārā krāsa ikonai */
}
/* Ikonu krāsa izpildītam darbam */
.list-item.item-done .progress-checkbox-label .fas,
.list-item.item-done .progress-checkbox-label .far {
  color: var(--success-color); /* Zaļa krāsa ikonai */
}

/* Mazo darbību pogu stils */
.action-button-small {
  padding: 0.4rem 0.8rem; /* Iekšējā atkāpe */
  font-size: 0.85em; /* Fonta lielums */
}
/* Ikonas stils mazajās pogās */
.action-button-small i {
  margin-right: 0.3rem; /* Atstarpe no labās puses ikonai */
}
/* Izvēršanas/savēršanas pogas fona krāsa */
.expand-toggle {
  background-color: var(--secondary-color);
}
/* Komentāru pogas fona krāsa */
.comments-toggle {
  background-color: var(--info-color);
}
/* Komentāru skaita stils */
.comment-count {
  font-size: 0.85em; /* Fonta lielums */
  margin-left: 0.25rem; /* Atstarpe no kreisās puses */
}
/* Darbību bloka stils, kas pieejams tikai autoram vai administratoram */
.owner-admin-actions {
  display: flex; /* Izmanto flexbox elementu izkārtojumam */
  gap: 0.5rem; /* Atstarpe starp pogām */
}
/* Rediģēšanas pogas fona un teksta krāsa */
.edit-btn {
  background-color: var(--warning-color);
  color: var(--text-color);
}
/* Dzēšanas pogas fona krāsa */
.delete-btn {
  background-color: var(--danger-color);
}

/* Komentāru sadaļas ārējā konteinera stils */
.comments-area-wrapper {
  margin-top: 1rem; /* Atstarpe virs sadaļas */
}
/* Komentāru sadaļas iekšējā konteinera stils */
.comments-area {
  padding: 1rem; /* Iekšējā atkāpe */
  margin-top: 0.5rem; /* Neliela atstarpe virs sadaļas */
}
/* Komentāru sadaļas virsraksta stils */
.comments-area h4 {
  font-size: 1.1rem; /* Fonta lielums */
  color: var(--primary-color); /* Primārā krāsa virsrakstam */
  margin-top: 0; /* Noņem augšējo atstarpi */
  margin-bottom: 1rem; /* Atstarpe zem virsraksta */
  display: flex; /* Izmanto flexbox ikonai un tekstam */
  align-items: center; /* Vertikāli centrē ikonu un tekstu */
  gap: 0.5rem; /* Atstarpe starp ikonu un tekstu */
}
/* Ziņojuma stils, ja nav komentāru */
.no-comments {
  color: #6c757d; /* Teksta krāsa */
  font-style: italic; /* Slīpraksts */
  text-align: center; /* Teksta līdzināšana centrā */
  padding: 1rem 0; /* Iekšējā atkāpe */
  display: flex; /* Izmanto flexbox elementu izkārtojumam */
  flex-direction: column; /* Sakārto elementus vertikāli */
  align-items: center; /* Horizontāli centrē elementus */
  gap: 0.5rem; /* Atstarpe starp ikonu un tekstu */
}
/* Ikonas stils ziņojumā "Nav komentāru" */
.no-comments .fas {
  font-size: 1.5rem; /* Ikonas lielums */
  opacity: 0.6; /* Nedaudz caurspīdīga ikona */
}

/* Komentāru saraksta (ul) stils */
.comments-list {
  list-style-type: none; /* Noņem saraksta marķierus */
  padding: 0; /* Noņem iekšējo atkāpi */
  margin: 0 0 1rem 0; /* Atstarpe zem saraksta */
}
/* Atsevišķa komentāra (li) stils */
.comment-item {
  border-bottom: 1px dotted #e0e0e0; /* Punktēta līnija starp komentāriem */
  padding: 0.75rem 0; /* Iekšējā atkāpe augšā un apakšā */
}
/* Noņem apakšējo līniju pēdējam komentāram */
.comment-item:last-child {
  border-bottom: none;
}
/* Komentāra teksta stils */
.comment-text {
  margin: 0 0 0.5rem 0; /* Atstarpe zem teksta */
  white-space: pre-wrap; /* Saglabā atstarpes un pārnes vārdus jaunā rindā */
  word-wrap: break-word; /* Pārnes garus vārdus jaunā rindā */
  font-size: 0.95rem; /* Fonta lielums */
  color: var(--text-color); /* Teksta krāsa */
}
/* Komentāra metadatu (autors, datums) stils */
.comment-meta {
  font-size: 0.8rem; /* Fonta lielums */
  color: #6c757d; /* Teksta krāsa */
  display: flex; /* Izmanto flexbox elementu izkārtojumam */
  justify-content: space-between; /* Izlīdzina elementus ar atstarpi starp tiem */
  align-items: center; /* Vertikāli centrē elementus */
  flex-wrap: wrap; /* Atļauj elementiem pāriet jaunā rindā */
  gap: 0.5rem; /* Atstarpe starp elementiem */
}
/* Atsevišķa metadatu elementa (span) stils */
.comment-meta span {
  display: flex; /* Izmanto flexbox ikonai un tekstam */
  align-items: center; /* Vertikāli centrē ikonu un tekstu */
  gap: 0.3rem; /* Atstarpe starp ikonu un tekstu */
}
/* Komentāra dzēšanas pogas stils */
.delete-comment-btn {
  background: none; /* Noņem fona krāsu */
  border: none; /* Noņem apmali */
  color: var(--danger-color); /* Bīstamības krāsa pogai */
  font-size: 1em; /* Fonta lielums, lai atbilstu apkārtējam tekstam */
  cursor: pointer; /* Rāda norādes kursoru */
  padding: 0.25rem; /* Neliela iekšējā atkāpe */
  line-height: 1; /* Rindstarpa */
}
/* Dzēšanas pogas stils, kad pele ir virs tās */
.delete-comment-btn:hover {
  color: #c82333; /* Tumšāka bīstamības krāsa */
}
/* Dzēšanas pogas ikonas stils */
.delete-comment-btn .fas {
  font-size: 1.1em; /* Nedaudz lielāka ikona */
}

/* Jauna komentāra pievienošanas formas stils */
.add-comment-form {
  margin-top: 1rem; /* Atstarpe virs formas */
  display: flex; /* Izmanto flexbox elementu izkārtojumam */
  flex-direction: column; /* Sakārto elementus vertikāli */
  gap: 0.5rem; /* Atstarpe starp teksta lauku un pogu */
}
/* Teksta lauka (textarea) stils jaunam komentāram */
.add-comment-form textarea {
  min-height: 70px; /* Minimālais augstums */
  font-size: 0.95em; /* Fonta lielums */
}
/* Pievienošanas pogas stils jaunajam komentāram */
.add-comment-form .action-button {
  align-self: flex-end; /* Līdzina pogu pa labi */
  padding: 0.5rem 1rem; /* Iekšējā atkāpe */
}

/* Maza ielādes indikatora stils */
.loading-indicator.small {
  font-size: 0.95em; /* Fonta lielums */
  padding: 0.5rem; /* Iekšējā atkāpe */
}
/* Maza kļūdas ziņojuma stils */
.error-message.small {
  font-size: 0.9em; /* Fonta lielums */
  padding: 0.5rem; /* Iekšējā atkāpe */
  margin-bottom: 0.5rem; /* Atstarpe zemāk */
}

/* Stili maziem ekrāniem */
@media (max-width: 768px) {
  /* Pārkārto filtru režģi vienā kolonnā */
  .filters-grid {
    grid-template-columns: 1fr;
  }
  /* Pārkārto darba darbību paneli vertikāli un pa kreisi */
  .item-actions-footer {
    flex-direction: column;
    align-items: flex-start;
  }
  /* Papildu darbības aizņem visu platumu un ir izlīdzinātas ar atstarpi starp tām */
  .contextual-actions {
    margin-top: 0.5rem;
    width: 100%;
    justify-content: space-between;
  }
}
</style>
