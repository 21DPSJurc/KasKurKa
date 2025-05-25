<template>
  <div class="form-view add-test-view card-style">
    <!-- Poga, lai dotos atpakaļ uz iepriekšējo skatu -->
    <!-- Atspējota, ja notiek ielāde vai sākotnējo datu ielāde -->
    <button
      @click="handleBackNavigation"
      class="back-button"
      :disabled="isLoading || isLoadingInitialData"
    >
      <i class="fas fa-arrow-left"></i>
      <!-- Dinamisks teksts pogai -->
      {{ itemIdToEdit ? "Atpakaļ uz Sarakstu" : "Atpakaļ uz Paneli" }}
    </button>
    <!-- Skata virsraksts, mainās atkarībā no režīma (pievienošana/rediģēšana) -->
    <h2 class="view-title">
      <i :class="itemIdToEdit ? 'fas fa-edit' : 'fas fa-calendar-plus'"></i>
      {{
        itemIdToEdit
          ? "Rediģēt Pārbaudes Darbu"
          : "Pievienot Jaunu Pārbaudes Darbu"
      }}
    </h2>

    <!-- Ielādes indikators sākotnējiem datiem -->
    <div v-if="isLoadingInitialData" class="loading-indicator">
      <i class="fas fa-spinner fa-spin"></i> Notiek datu ielāde...
    </div>
    <!-- Kļūdas ziņojums, ja nav tiesību pievienot/rediģēt -->
    <div v-else-if="!canAddOrEditLogic" class="error-message">
      <i class="fas fa-exclamation-triangle"></i> {{ addEditNotAllowedMessage }}
    </div>

    <!-- Galvenā forma pārbaudes darba datu ievadei -->
    <!-- Redzama, ja ir tiesības un sākotnējā ielāde pabeigta -->
    <form
      @submit.prevent="submitTest"
      class="test-form"
      v-if="canAddOrEditLogic && !isLoadingInitialData"
    >
      <!-- Grupas izvēles lauks -->
      <div class="form-group">
        <label for="customGroupIdTest"
          ><i class="fas fa-users form-icon"></i> Grupa (kam redzams pārbaudes
          darbs): <span class="required-field">*</span></label
        >
        <select
          id="customGroupIdTest"
          v-model="test.customGroupId"
          required
          :disabled="isLoading || availableCustomGroups.length === 0"
        >
          <option disabled value="">Izvēlieties grupu</option>
          <option
            v-for="group in availableCustomGroups"
            :key="group._id"
            :value="group._id"
          >
            {{ group.name }}
          </option>
        </select>
        <!-- Informatīvs teksts studentam, ja nav pieejamu grupu -->
        <small
          v-if="
            currentUser &&
            currentUser.role === 'student' &&
            availableCustomGroups.length === 0
          "
          class="info-text"
          ><i class="fas fa-info-circle"></i> Jums jābūt vismaz vienas grupas
          dalībniekam.</small
        >
        <!-- Informatīvs teksts administratoram, ja nav pieejamu grupu -->
        <small
          v-if="
            currentUser &&
            currentUser.role === 'admin' &&
            availableCustomGroups.length === 0
          "
          class="info-text"
          ><i class="fas fa-info-circle"></i> Nav pieejamu grupu sistēmā. Lūdzu,
          izveidojiet grupu.</small
        >
      </div>

      <!-- Mācību priekšmeta ievades lauks -->
      <div class="form-group">
        <label for="subject"
          ><i class="fas fa-book form-icon"></i> Mācību priekšmets:
          <span class="required-field">*</span></label
        >
        <input
          type="text"
          id="subject"
          v-model="test.subject"
          required
          maxlength="50"
          placeholder="Piem., Latviešu valoda"
          :disabled="isLoading"
        />
        <small>Līdz 50 rakstzīmēm.</small>
      </div>

      <!-- Rinda ar datuma un laika ievades laukiem -->
      <div class="form-row">
        <!-- Norises datuma ievades lauks -->
        <div class="form-group half-width">
          <label for="eventDate"
            ><i class="fas fa-calendar-alt form-icon"></i> Norises datums:
            <span class="required-field">*</span></label
          >
          <input
            type="date"
            id="eventDate"
            v-model="test.eventDate"
            required
            :min="today"
            :disabled="isLoading"
          />
        </div>

        <!-- Norises laika ievades lauks -->
        <div class="form-group half-width">
          <label for="eventTime"
            ><i class="fas fa-clock form-icon"></i> Norises laiks:</label
          >
          <input
            type="time"
            id="eventTime"
            v-model="test.eventTime"
            :disabled="isLoading"
          />
          <small>Piemēram, 10:00</small>
        </div>
      </div>

      <!-- Formas sadalītājs -->
      <hr class="form-divider" />
      <!-- Detalizētākas informācijas sadaļas virsraksts -->
      <h3 class="form-section-title">
        <i class="fas fa-info-circle"></i> Detalizētāka Informācija
      </h3>

      <!-- Tēmu/apraksta ievades lauks -->
      <div class="form-group">
        <label for="topics"
          ><i class="fas fa-tasks form-icon"></i> Pārbaudes darba
          tēmas/apraksts:</label
        >
        <textarea
          id="topics"
          v-model="test.topics"
          rows="4"
          placeholder="Piemēram: Komati, Pieturzīmes teikuma beigās. Līdz 1000 rakstzīmēm."
          maxlength="1000"
          :disabled="isLoading"
        ></textarea>
        <small>Līdz 1000 rakstzīmēm.</small>
      </div>

      <!-- Formāta ievades lauks -->
      <div class="form-group">
        <label for="format"
          ><i class="fas fa-pencil-ruler form-icon"></i> Formāts:</label
        >
        <input
          type="text"
          id="format"
          v-model="test.format"
          placeholder="Piemēram: tests, eseja, prezentācija"
          maxlength="50"
          :disabled="isLoading"
        />
        <small>Līdz 50 rakstzīmēm.</small>
      </div>

      <!-- Citas būtiskas informācijas ievades lauks -->
      <div class="form-group">
        <label for="additionalInfo"
          ><i class="fas fa-comment-dots form-icon"></i> Cita būtiska
          informācija:</label
        >
        <textarea
          id="additionalInfo"
          v-model="test.additionalInfo"
          rows="3"
          placeholder="Jebkādas papildu piezīmes vai norādes..."
          :disabled="isLoading"
        ></textarea>
      </div>

      <!-- Veiksmes ziņojuma attēlošana -->
      <div v-if="successMessage" class="success-message">
        <i class="fas fa-check-circle"></i> {{ successMessage }}
      </div>
      <!-- Kļūdas ziņojuma attēlošana -->
      <div v-if="errorMessage" class="error-message">
        <i class="fas fa-exclamation-triangle"></i> {{ errorMessage }}
      </div>

      <!-- Formas darbību pogas (Atcelt, Iesniegt/Saglabāt) -->
      <div class="form-actions">
        <!-- Atcelšanas poga, redzama tikai rediģēšanas režīmā -->
        <button
          v-if="itemIdToEdit"
          type="button"
          @click="cancelEdit"
          class="action-button secondary-button"
          :disabled="isLoading"
        >
          <i class="fas fa-times"></i> Atcelt
        </button>
        <!-- Tukšs elements izlīdzināšanai, ja atcelšanas poga nav redzama -->
        <span v-else></span>
        <!-- Iesniegšanas/Saglabāšanas poga -->
        <button
          type="submit"
          class="action-button primary-button"
          :disabled="isLoading || !canAddOrEditLogic"
        >
          <i :class="itemIdToEdit ? 'fas fa-save' : 'fas fa-plus-circle'"></i>
          <!-- Dinamisks teksts pogai -->
          {{
            isLoading
              ? itemIdToEdit
                ? "Saglabā..."
                : "Pievieno..."
              : itemIdToEdit
              ? "Saglabāt Izmaiņas"
              : "Pievienot Pārbaudes Darbu"
          }}
        </button>
      </div>
    </form>
  </div>
</template>

<script>
import axios from "axios";

export default {
  name: "AddTestView",
  props: {
    // ID pārbaudes darbam, kas tiek rediģēts. Ja null, tad tiek pievienots jauns.
    itemIdToEdit: {
      type: String,
      default: null,
    },
    // Pašreizējā pieteiktā lietotāja objekts.
    currentUser: {
      type: Object,
      required: true,
    },
  },
  // Injektē funkciju no vecākkomponenta (App.vue), lai atjaunotu lietotāja datus.
  inject: ["refreshUser"],
  data() {
    // Sagatavo šodienas datumu 'YYYY-MM-DD' formātā.
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const day = now.getDate().toString().padStart(2, "0");

    return {
      // Objekts, kas satur pārbaudes darba formas datus.
      test: {
        subject: "", // Mācību priekšmets
        eventDate: `${year}-${month}-${day}`, // Norises datums, noklusēts uz šodienu
        eventTime: "", // Norises laiks
        topics: "", // Tēmas/apraksts
        format: "", // Formāts
        additionalInfo: "", // Papildus informācija
        customGroupId: "", // Pielāgotās grupas ID
      },
      today: `${year}-${month}-${day}`, // Šodienas datums string formātā
      errorMessage: "", // Kļūdas ziņojums
      successMessage: "", // Veiksmes ziņojums
      isLoading: false, // Norāda, vai notiek datu nosūtīšana/ielāde
      isLoadingInitialData: false, // Norāda, vai notiek sākotnējā datu ielāde
      allSystemGroups: [], // Masīvs administratora pieejamajām grupām
    };
  },
  computed: {
    // Aprēķina pieejamās pielāgotās grupas atkarībā no lietotāja lomas.
    availableCustomGroups() {
      if (!this.currentUser) return [];
      if (this.currentUser.role === "admin") {
        return this.allSystemGroups; // Administrators redz visas grupas
      }
      // Students redz tikai tās grupas, kurās ir reģistrēts
      return this.currentUser.enrolledCustomGroupsDetails || [];
    },
    // Nosaka, vai lietotājam ir tiesības pievienot vai rediģēt pārbaudes darbu.
    canAddOrEditLogic() {
      if (!this.currentUser) return false;
      if (this.itemIdToEdit) return true; // Ja rediģē, pieņem, ka tiesības ir (pārbaudīs serveris)

      if (this.currentUser.role === "admin") {
        // Administratoram jābūt vismaz vienai grupai sistēmā
        return this.allSystemGroups.length > 0;
      }
      if (this.currentUser.role === "student") {
        // Studentam jābūt reģistrētam vismaz vienā grupā
        return (
          this.currentUser.enrolledCustomGroupsDetails &&
          this.currentUser.enrolledCustomGroupsDetails.length > 0
        );
      }
      return false; // Pēc noklusējuma nav tiesību
    },
    // Ģenerē ziņojumu, ja lietotājam nav tiesību pievienot/rediģēt.
    addEditNotAllowedMessage() {
      if (this.itemIdToEdit) return ""; // Nav aktuāls rediģēšanas režīmā
      if (
        this.currentUser &&
        this.currentUser.role === "admin" &&
        this.allSystemGroups.length === 0 &&
        !this.isLoadingInitialData
      ) {
        return "Lai pievienotu pārbaudes darbu, vispirms sistēmā ir jāizveido vismaz viena grupa.";
      }
      if (
        this.currentUser &&
        this.currentUser.role === "student" &&
        (!this.currentUser.enrolledCustomGroupsDetails ||
          this.currentUser.enrolledCustomGroupsDetails.length === 0) &&
        !this.isLoadingInitialData
      ) {
        return "Lai pievienotu pārbaudes darbu, Jums ir jābūt dalībniekam vismaz vienā grupā. Ja nesen tikāt pievienots, mēģiniet pārlādēt lapu vai doties atpakaļ uz paneli un atgriezties šeit.";
      }
      if (!this.isLoadingInitialData)
        return "Jums nav tiesību pievienot jaunus pārbaudes darbus.";
      return "Notiek datu ielāde..."; // Kamēr ielādē datus
    },
  },
  watch: {
    // Vēro `itemIdToEdit` izmaiņas, lai ielādētu/atiestatītu formu.
    itemIdToEdit(newVal, oldVal) {
      if (newVal !== oldVal && !this.isLoadingInitialData) {
        this.handleIdOrUserChange();
      }
    },
  },
  // Izsauc metodi, kad komponents ir uzmontēts.
  async mounted() {
    await this.performInitialSetup();
  },
  methods: {
    // Veic sākotnējo komponenta iestatīšanu.
    async performInitialSetup() {
      this.isLoadingInitialData = true;
      this.errorMessage = "";
      try {
        if (this.refreshUser) {
          // Atjauno lietotāja datus, lai nodrošinātu aktuālu informāciju par grupām.
          await this.refreshUser();
        }
        await this.handleIdOrUserChange();
      } catch (error) {
        console.error("Kļūda sākotnējā iestatīšanā AddTestView:", error);
        this.errorMessage =
          "Kļūda ielādējot nepieciešamos datus. " + (error.message || "");
      } finally {
        this.isLoadingInitialData = false;
      }
    },
    // Apstrādā `itemIdToEdit` vai lietotāja datu izmaiņas.
    async handleIdOrUserChange() {
      if (this.currentUser && this.currentUser.role === "admin") {
        await this.fetchAllSystemGroups(); // Administratoriem ielādē visas grupas
      }

      if (this.itemIdToEdit) {
        await this.loadTestForEditing(this.itemIdToEdit); // Ielādē pārbaudes darbu rediģēšanai
      } else {
        this.resetForm(); // Atiestata formu jauna ieraksta pievienošanai
      }
    },
    // Ielādē visas sistēmas grupas (administratoriem).
    async fetchAllSystemGroups() {
      if (this.currentUser && this.currentUser.role === "admin") {
        if (this.allSystemGroups.length > 0 && !this.itemIdToEdit) {
          // Vienkāršs kešatmiņas mehānisms - ja grupas jau ir ielādētas un netiek rediģēts,
          // varētu izlaist atkārtotu ielādi. Pašreizējā implementācija varētu to darīt vienmēr.
        }
        try {
          const response = await axios.get("/api/groups");
          this.allSystemGroups = response.data;
        } catch (error) {
          console.error("Kļūda ielādējot visas grupas administratoram:", error);
          this.errorMessage = "Kļūda ielādējot grupu sarakstu administratoram.";
        }
      }
    },
    // Atiestata formas laukus uz sākotnējām vērtībām.
    resetForm() {
      const now = new Date();
      const year = now.getFullYear();
      const month = (now.getMonth() + 1).toString().padStart(2, "0");
      const day = now.getDate().toString().padStart(2, "0");
      this.test = {
        subject: "",
        eventDate: `${year}-${month}-${day}`,
        eventTime: "",
        topics: "",
        format: "",
        additionalInfo: "",
        // Ja ir pieejama tikai viena grupa, automātiski to atlasa.
        customGroupId:
          this.availableCustomGroups.length === 1
            ? this.availableCustomGroups[0]._id
            : "",
      };
      this.successMessage = "";
    },
    // Ielādē pārbaudes darba datus rediģēšanai.
    async loadTestForEditing(itemId) {
      this.isLoading = true;
      this.successMessage = "";
      try {
        const response = await axios.get(`/api/tests/${itemId}`);
        const data = response.data;
        // Aizpilda formas laukus ar ielādētajiem datiem.
        this.test.subject = data.subject;
        this.test.eventDate = data.eventDate
          ? new Date(data.eventDate).toISOString().split("T")[0] // Pārveido datumu pareizā formātā
          : this.today;
        this.test.eventTime = data.eventTime || "";
        this.test.topics = data.topics || "";
        this.test.format = data.format || "";
        this.test.additionalInfo = data.additionalInfo || "";
        this.test.customGroupId = data.customGroupId
          ? data.customGroupId.toString()
          : "";
      } catch (error) {
        console.error("Kļūda ielādējot pārbaudes darbu rediģēšanai:", error);
        this.errorMessage =
          error.response?.data?.msg ||
          "Kļūda ielādējot pārbaudes darba datus rediģēšanai. " +
            (this.errorMessage || "");
        // Ja serveris atgriež 403 vai 404, novirza uz paneli.
        if (error.response?.status === 403 || error.response?.status === 404) {
          setTimeout(() => this.$emit("navigateToDashboard"), 2000);
        }
      } finally {
        this.isLoading = false;
      }
    },
    // Navigācijas metode atpakaļ.
    handleBackNavigation() {
      if (this.itemIdToEdit) {
        this.$emit("cancelEdit"); // Ja rediģē, atceļ rediģēšanu
      } else {
        this.$emit("navigateToDashboard"); // Ja pievieno, dodas atpakaļ uz paneli
      }
    },
    // Atceļ rediģēšanu.
    cancelEdit() {
      this.$emit("cancelEdit");
    },
    // Klienta puses formas validācija.
    validateClientSideForm() {
      // Notīra iepriekšējos validācijas ziņojumus.
      if (
        (this.errorMessage && this.errorMessage.startsWith("Lūdzu")) || // "Lūdzu, aizpildiet..."
        this.errorMessage.startsWith("Norādītais laiks") || // "Norādītais laiks nav korekts..."
        this.errorMessage.includes("rakstzīmes") // "...nedrīkst pārsniegt X rakstzīmes."
      ) {
        this.errorMessage = "";
      }
      this.successMessage = "";

      // Veic lauku pārbaudes.
      if (!this.test.customGroupId) {
        this.errorMessage =
          "Lūdzu, izvēlieties grupu, kurai pievienot pārbaudes darbu.";
        return false;
      }
      if (!this.test.subject.trim()) {
        this.errorMessage = "Mācību priekšmets ir obligāts lauks.";
        return false;
      }
      if (this.test.subject.trim().length > 50) {
        this.errorMessage =
          "Mācību priekšmeta nosaukums nedrīkst pārsniegt 50 rakstzīmes.";
        return false;
      }
      if (this.test.topics && this.test.topics.trim().length > 1000) {
        this.errorMessage =
          "Pārbaudes darba tēmas/apraksts nedrīkst pārsniegt 1000 rakstzīmes.";
        return false;
      }
      if (this.test.format && this.test.format.trim().length > 50) {
        this.errorMessage = "Formāta lauks nedrīkst pārsniegt 50 rakstzīmes.";
        return false;
      }
      if (!this.test.eventDate) {
        this.errorMessage = "Norises datums ir obligāts lauks.";
        return false;
      }
      // Pārbauda laika formātu, ja tas ir ievadīts un nav tukša virkne.
      if (
        this.test.eventTime &&
        !/^\d{2}:\d{2}$/.test(this.test.eventTime) &&
        this.test.eventTime.trim() !== ""
      ) {
        this.errorMessage =
          "Norādītais laiks nav korekts. Izmantojiet HH:MM formātu.";
        return false;
      }
      return true; // Ja visas pārbaudes veiksmīgas
    },
    // Metode pārbaudes darba iesniegšanai.
    async submitTest() {
      if (!this.validateClientSideForm()) return; // Pārtrauc, ja validācija neizdodas

      this.isLoading = true;
      // Notīra iepriekšējos validācijas kļūdu ziņojumus.
      if (
        this.errorMessage &&
        (this.errorMessage.startsWith("Lūdzu") ||
          this.errorMessage.startsWith("Norādītais laiks") ||
          this.errorMessage.includes("rakstzīmes"))
      ) {
        this.errorMessage = "";
      }
      this.successMessage = "";

      const testData = { ...this.test }; // Izveido datu kopiju nosūtīšanai

      try {
        let response;
        if (this.itemIdToEdit) {
          // Ja rediģē, izmanto PUT pieprasījumu.
          response = await axios.put(
            `/api/tests/${this.itemIdToEdit}`,
            testData
          );
        } else {
          // Ja pievieno jaunu, izmanto POST pieprasījumu.
          response = await axios.post("/api/tests", testData);
        }
        // Parāda veiksmes ziņojumu no servera.
        this.successMessage =
          response.data.msg ||
          (this.itemIdToEdit
            ? "Pārbaudes darbs veiksmīgi atjaunināts!"
            : "Pārbaudes darbs veiksmīgi pievienots!");

        // Ja pievienots jauns ieraksts, saglabā atlasīto grupu un atiestata formu.
        const previousCustomGroupId = this.test.customGroupId;
        if (!this.itemIdToEdit) {
          this.resetForm();
          // Atjauno grupas izvēli, ja tā joprojām ir derīga.
          if (
            this.availableCustomGroups.some(
              (g) => g._id === previousCustomGroupId
            )
          ) {
            this.test.customGroupId = previousCustomGroupId;
          }
        }

        // Pēc īsa brīža paziņo vecākkomponentam par veiksmīgu darbību.
        setTimeout(() => {
          this.$emit("itemActionSuccess", this.successMessage);
        }, 1500);
      } catch (error) {
        // Apstrādā servera kļūdas.
        this.errorMessage =
          error.response?.data?.msg || "Darbības kļūda. Lūdzu, mēģiniet vēlāk.";
        console.error(
          "Pārbaudes darba iesniegšanas/atjaunināšanas kļūda:",
          error.response ? error.response.data : error
        );
      } finally {
        // Ja ir kļūda, ielādes stāvokli beidz šeit.
        // Ja veiksme, ielādes stāvoklis netiek mainīts šeit (notiks navigācija).
        if (this.errorMessage) {
          this.isLoading = false;
        }
      }
    },
  },
};
</script>

<style scoped>
/* Stili tiek mantoti no globālajiem .form-view un .card-style */
/* Skata virsraksta stils */
.view-title {
  color: var(--header-bg-color);
  margin: 0 0 1.5rem 0;
  font-size: 1.8rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
}

/* Ikonu stils formas laukos */
.form-icon {
  margin-right: 0.5em;
  color: var(--primary-color);
  opacity: 0.7;
}

/* Stils rindai ar diviem formas laukiem */
.form-row {
  display: flex;
  gap: 1rem; /* Atstarpe starp laukiem rindā */
  margin-bottom: 1.25rem; /* Atstarpe zem rindas, tāda pati kā .form-group */
}
/* Stils formas grupai, kas aizņem pusi no rindas platuma */
.form-group.half-width {
  flex: 1; /* Vienādi sadala pieejamo platumu */
  min-width: 0; /* Ļauj elementiem sašaurināties, ja nepieciešams */
  margin-bottom: 0; /* Noņem apakšējo atstarpi, jo to kontrolē .form-row */
}

/* Formas sadalītāja stils */
.form-divider {
  margin-top: 2rem;
  margin-bottom: 1.5rem;
  border: 0;
  border-top: 1px solid var(--border-color);
}
/* Formas sadaļas virsraksta stils */
.form-section-title {
  font-size: 1.1rem;
  color: var(--header-bg-color);
  margin-bottom: 1rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
/* Sadaļas virsraksta ikonas stils */
.form-section-title .fas {
  color: var(--secondary-color);
}

/* Informatīvā teksta stils (piem., zem ievadlaukiem) */
.info-text {
  display: flex !important;
  align-items: center;
  gap: 0.3rem;
  font-style: italic;
}
/* Informatīvā teksta ikonas stils */
.info-text .fas {
  font-size: 0.9em;
}

/* Veiksmes un kļūdas ziņojumu ikonu stils */
.success-message .fas,
.error-message .fas {
  margin-right: 0.5em;
}

/* Formas darbību pogu konteinera stils */
.form-actions {
  justify-content: space-between; /* Izlīdzina pogas (Atcelt pa kreisi, Iesniegt pa labi) */
}

/* Stili maziem ekrāniem */
@media (max-width: 600px) {
  .form-row {
    flex-direction: column; /* Pārkārto laukus rindā vertikāli */
    gap: 0; /* Noņem atstarpi, jo .form-group.half-width tagad kontrolēs atstarpes */
    margin-bottom: 0;
  }
  .form-group.half-width {
    margin-bottom: 1.25rem; /* Atjauno apakšējo atstarpi, kad lauki ir sakrauti */
  }
  .form-actions {
    flex-direction: column-reverse; /* Pārkārto pogas vertikāli, ar primāro pogu augšpusē */
  }
  .form-actions .action-button {
    width: 100%; /* Pogas aizņem visu platumu */
  }
  .form-actions .secondary-button {
    margin-bottom: 0.75rem; /* Atstarpe zem sekundārās (Atcelt) pogas */
  }
}
</style>
