<template>
  <div class="form-view add-homework-view card-style">
    <!-- Poga, lai dotos atpakaļ uz iepriekšējo skatu (Paneli vai Sarakstu) -->
    <!-- Tās stāvoklis ir atspējots, ja notiek datu ielāde vai sākotnējā ielāde -->
    <button
      @click="handleBackNavigation"
      class="back-button"
      :disabled="isLoading || isLoadingInitialData"
    >
      <i class="fas fa-arrow-left"></i>
      <!-- Dinamisks teksts pogai atkarībā no tā, vai rediģējam esošu ierakstu vai nē -->
      {{ itemIdToEdit ? "Atpakaļ uz Sarakstu" : "Atpakaļ uz Paneli" }}
    </button>
    <!-- Skata virsraksts, kas mainās atkarībā no tā, vai pievienojam jaunu mājasdarbu vai rediģējam esošu -->
    <h2 class="view-title">
      <i :class="itemIdToEdit ? 'fas fa-edit' : 'fas fa-plus-circle'"></i>
      {{ itemIdToEdit ? "Rediģēt Mājasdarbu" : "Pievienot Jaunu Mājasdarbu" }}
    </h2>

    <!-- Indikators, kas tiek rādīts, kamēr notiek sākotnējo datu ielāde -->
    <div v-if="isLoadingInitialData" class="loading-indicator">
      <i class="fas fa-spinner fa-spin"></i> Notiek datu ielāde...
    </div>
    <!-- Kļūdas ziņojums, ja lietotājam nav tiesību pievienot vai rediģēt mājasdarbu -->
    <div v-else-if="!canAddOrEditLogic" class="error-message">
      <i class="fas fa-exclamation-triangle"></i> {{ addEditNotAllowedMessage }}
    </div>

    <!-- Galvenā forma mājasdarba datu ievadei -->
    <!-- Tiek rādīta tikai tad, ja lietotājam ir tiesības un sākotnējā datu ielāde ir pabeigta -->
    <form
      @submit.prevent="submitHomework"
      class="homework-form"
      v-if="canAddOrEditLogic && !isLoadingInitialData"
    >
      <!-- Grupas izvēles lauks -->
      <div class="form-group">
        <label for="customGroupId"
          ><i class="fas fa-users form-icon"></i> Grupa (kam redzams
          mājasdarbs): <span class="required-field">*</span></label
        >
        <select
          id="customGroupId"
          v-model="homework.customGroupId"
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
          v-model="homework.subject"
          required
          maxlength="50"
          placeholder="Piem., Programmēšanas pamati"
          :disabled="isLoading"
        />
        <small>Līdz 50 rakstzīmēm.</small>
      </div>

      <!-- Uzdevuma apraksta ievades lauks -->
      <div class="form-group">
        <label for="description"
          ><i class="fas fa-file-alt form-icon"></i> Detalizēts uzdevuma
          apraksts: <span class="required-field">*</span></label
        >
        <textarea
          id="description"
          v-model="homework.description"
          required
          maxlength="1000"
          rows="4"
          placeholder="Aprakstiet uzdevumu šeit..."
          :disabled="isLoading"
        ></textarea>
        <small>Līdz 1000 rakstzīmēm.</small>
      </div>

      <!-- Izpildes termiņa ievades lauks -->
      <div class="form-group">
        <label for="dueDate"
          ><i class="fas fa-calendar-check form-icon"></i> Izpildes termiņš:
          <span class="required-field">*</span></label
        >
        <input
          type="date"
          id="dueDate"
          v-model="homework.dueDate"
          required
          :min="today"
          :disabled="isLoading"
        />
      </div>

      <!-- Formas sadalītājs, lai vizuāli atdalītu sadaļas -->
      <hr class="form-divider" />
      <!-- Papildus informācijas un resursu sadaļas virsraksts -->
      <h3 class="form-section-title">
        <i class="fas fa-paperclip"></i> Papildus Informācija un Resursi
      </h3>

      <!-- Papildus informācijas ievades lauks -->
      <div class="form-group">
        <label for="additionalInfo"
          ><i class="fas fa-info-circle form-icon"></i> Papildus informācija
          (mutiski norādīts, u.c.):</label
        >
        <textarea
          id="additionalInfo"
          v-model="homework.additionalInfo"
          rows="3"
          placeholder="Jebkādas papildu piezīmes vai norādes..."
          :disabled="isLoading"
        ></textarea>
      </div>

      <!-- Saišu ievades lauks -->
      <div class="form-group">
        <label for="links"
          ><i class="fas fa-link form-icon"></i> Saites uz resursiem:</label
        >
        <textarea
          id="links"
          v-model="homework.links"
          rows="3"
          placeholder="Katra saite jaunā rindā, piem., https://example.com"
          :disabled="isLoading"
        ></textarea>
      </div>

      <!-- Veiksmes ziņojuma attēlošanas bloks -->
      <div v-if="successMessage" class="success-message">
        <i class="fas fa-check-circle"></i> {{ successMessage }}
      </div>
      <!-- Kļūdas ziņojuma attēlošanas bloks -->
      <div v-if="errorMessage" class="error-message">
        <i class="fas fa-exclamation-triangle"></i> {{ errorMessage }}
      </div>

      <!-- Formas darbību pogu bloks (Atcelt, Iesniegt) -->
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
        <!-- Tukšs elements, lai saglabātu izlīdzinājumu, ja atcelšanas poga nav redzama -->
        <span v-else></span>
        <!-- Iesniegšanas/Saglabāšanas poga -->
        <button
          type="submit"
          class="action-button primary-button"
          :disabled="isLoading || !canAddOrEditLogic"
        >
          <i :class="itemIdToEdit ? 'fas fa-save' : 'fas fa-plus-circle'"></i>
          <!-- Dinamisks teksts pogai atkarībā no režīma (pievienošana/rediģēšana) un ielādes stāvokļa -->
          {{
            isLoading
              ? itemIdToEdit
                ? "Saglabā..."
                : "Pievieno..."
              : itemIdToEdit
              ? "Saglabāt Izmaiņas"
              : "Pievienot Mājasdarbu"
          }}
        </button>
      </div>
    </form>
  </div>
</template>

<script>
import axios from "axios";

export default {
  name: "AddHomeworkView",
  props: {
    // ID mājasdarbam, kas tiek rediģēts. Ja null, tad tiek pievienots jauns.
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
    // Sagatavo šodienas datumu 'YYYY-MM-DD' formātā, lai to izmantotu kā minimālo datumu `dueDate` laukam.
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const day = now.getDate().toString().padStart(2, "0");

    return {
      // Objekts, kas satur mājasdarba formas datus.
      homework: {
        subject: "", // Mācību priekšmets
        description: "", // Uzdevuma apraksts
        dueDate: `${year}-${month}-${day}`, // Izpildes termiņš, noklusēts uz šodienu
        additionalInfo: "", // Papildus informācija
        links: "", // Saites uz resursiem
        customGroupId: "", // Pielāgotās grupas ID, kurai mājasdarbs pieder
      },
      today: `${year}-${month}-${day}`, // Šodienas datums string formātā
      errorMessage: "", // Kļūdas ziņojums, kas tiek parādīts lietotājam
      successMessage: "", // Veiksmes ziņojums, kas tiek parādīts lietotājam
      isLoading: false, // Būla vērtība, kas norāda, vai notiek datu nosūtīšana/ielāde
      isLoadingInitialData: false, // Būla vērtība, kas norāda, vai notiek sākotnējā datu ielāde (piem., rediģējot)
      allSystemGroups: [], // Masīvs, kurā glabāsies visas sistēmas grupas (administratoriem)
    };
  },
  computed: {
    // Aprēķinātais īpašums, kas atgriež pieejamās pielāgotās grupas atkarībā no lietotāja lomas.
    availableCustomGroups() {
      if (!this.currentUser) return []; // Ja nav lietotāja, atgriež tukšu masīvu
      if (this.currentUser.role === "admin") {
        return this.allSystemGroups; // Administrators redz visas sistēmas grupas
      }
      // Students redz tikai tās grupas, kurās viņš ir reģistrēts
      return this.currentUser.enrolledCustomGroupsDetails || [];
    },
    // Aprēķinātais īpašums, kas nosaka, vai lietotājam ir tiesības pievienot vai rediģēt mājasdarbu.
    canAddOrEditLogic() {
      if (!this.currentUser) return false; // Ja nav lietotāja, nav tiesību
      if (this.itemIdToEdit) return true; // Ja rediģējam, tiesības ir (tiks pārbaudītas servera pusē)

      if (this.currentUser.role === "admin") {
        // Administratoram jābūt vismaz vienai grupai sistēmā, lai pievienotu mājasdarbu
        return this.allSystemGroups.length > 0;
      }
      if (this.currentUser.role === "student") {
        // Studentam jābūt reģistrētam vismaz vienā pielāgotajā grupā
        return (
          this.currentUser.enrolledCustomGroupsDetails &&
          this.currentUser.enrolledCustomGroupsDetails.length > 0
        );
      }
      return false; // Pēc noklusējuma nav tiesību
    },
    // Aprēķinātais īpašums, kas ģenerē ziņojumu, ja lietotājam nav tiesību pievienot/rediģēt.
    addEditNotAllowedMessage() {
      if (this.itemIdToEdit) return ""; // Rediģēšanas gadījumā šis ziņojums nav aktuāls
      if (
        this.currentUser &&
        this.currentUser.role === "admin" &&
        this.allSystemGroups.length === 0 &&
        !this.isLoadingInitialData // Pārbauda, vai sākotnējā ielāde ir beigusies
      ) {
        return "Lai pievienotu mājasdarbu, vispirms sistēmā ir jāizveido vismaz viena grupa.";
      }
      if (
        this.currentUser &&
        this.currentUser.role === "student" &&
        (!this.currentUser.enrolledCustomGroupsDetails ||
          this.currentUser.enrolledCustomGroupsDetails.length === 0) &&
        !this.isLoadingInitialData
      ) {
        return "Lai pievienotu mājasdarbu, Jums ir jābūt dalībniekam vismaz vienā grupā. Ja nesen tikāt pievienots, mēģiniet pārlādēt lapu vai doties atpakaļ uz paneli un atgriezties šeit.";
      }
      if (!this.isLoadingInitialData)
        return "Jums nav tiesību pievienot jaunus mājasdarbus."; // Vispārīgs ziņojums
      return "Notiek datu ielāde..."; // Kamēr ielādē datus
    },
  },
  watch: {
    // Vēro `itemIdToEdit` izmaiņas. Ja ID mainās un nenotiek sākotnējā datu ielāde,
    // izsauc `handleIdOrUserChange` metodi, lai ielādētu/atiestatītu formu.
    itemIdToEdit(newVal, oldVal) {
      if (newVal !== oldVal && !this.isLoadingInitialData) {
        this.handleIdOrUserChange();
      }
    },
  },
  // Metode, kas tiek izsaukta, kad komponents ir uzmontēts DOM.
  async mounted() {
    await this.performInitialSetup();
  },
  methods: {
    // Veic sākotnējo komponenta iestatīšanu.
    async performInitialSetup() {
      this.isLoadingInitialData = true; // Sāk sākotnējo datu ielādi
      this.errorMessage = ""; // Notīra iepriekšējos kļūdu ziņojumus
      try {
        if (this.refreshUser) {
          // Ja pieejama `refreshUser` funkcija (injektēta no App.vue),
          // atjauno lietotāja datus, lai nodrošinātu aktuālu informāciju par grupām.
          await this.refreshUser();
        }
        // Pēc lietotāja datu atjaunošanas, apstrādā ID vai lietotāja izmaiņas (ielādē mājasdarbu vai atiestata formu).
        await this.handleIdOrUserChange();
      } catch (error) {
        console.error("Kļūda sākotnējā iestatīšanā AddHomeworkView:", error);
        this.errorMessage =
          "Kļūda ielādējot nepieciešamos datus. " + (error.message || "");
      } finally {
        this.isLoadingInitialData = false; // Beidz sākotnējo datu ielādi
      }
    },
    // Apstrādā situācijas, kad mainās `itemIdToEdit` vai lietotāja dati.
    async handleIdOrUserChange() {
      if (this.currentUser && this.currentUser.role === "admin") {
        // Ja lietotājs ir administrators, ielādē visas sistēmas grupas.
        await this.fetchAllSystemGroups();
      }

      if (this.itemIdToEdit) {
        // Ja ir `itemIdToEdit`, ielādē konkrēto mājasdarbu rediģēšanai.
        await this.loadHomeworkForEditing(this.itemIdToEdit);
      } else {
        // Ja nav `itemIdToEdit` (t.i., pievienojam jaunu), atiestata formu uz noklusējuma vērtībām.
        this.resetForm();
      }
    },
    // Ielādē visas sistēmas grupas (tikai administratoriem).
    async fetchAllSystemGroups() {
      if (this.currentUser && this.currentUser.role === "admin") {
        // Vienkārša kešatmiņas pārbaude, varētu būt sarežģītāka.
        // Ja `allSystemGroups` jau ir ielādētas un netiek rediģēts konkrēts ieraksts,
        // varētu izlaist atkārtotu ielādi. Pašreizējā loģika var ielādēt atkārtoti.

        try {
          const response = await axios.get("/api/groups");
          this.allSystemGroups = response.data; // Saglabā ielādētās grupas
        } catch (error) {
          console.error("Kļūda ielādējot visas grupas administratoram:", error);
          this.errorMessage = "Kļūda ielādējot grupu sarakstu administratoram.";
        }
      }
    },
    // Atiestata formas laukus uz sākotnējām vērtībām.
    resetForm() {
      // Atkal iegūst šodienas datumu, ja nu komponents tiek lietots ilgstoši.
      const now = new Date();
      const year = now.getFullYear();
      const month = (now.getMonth() + 1).toString().padStart(2, "0");
      const day = now.getDate().toString().padStart(2, "0");
      this.homework = {
        subject: "",
        description: "",
        dueDate: `${year}-${month}-${day}`,
        additionalInfo: "",
        links: "",
        // Ja ir pieejama tikai viena grupa, automātiski to atlasa. Citādi atstāj tukšu.
        customGroupId:
          this.availableCustomGroups.length === 1
            ? this.availableCustomGroups[0]._id
            : "",
      };
      this.successMessage = ""; // Notīra veiksmes ziņojumu
    },
    // Ielādē mājasdarba datus rediģēšanai.
    async loadHomeworkForEditing(itemId) {
      this.isLoading = true; // Sāk ielādes stāvokli
      this.successMessage = ""; // Notīra veiksmes ziņojumu
      try {
        const response = await axios.get(`/api/homework/${itemId}`);
        const data = response.data; // Iegūst mājasdarba datus no atbildes
        // Aizpilda formas laukus ar ielādētajiem datiem.
        this.homework.subject = data.subject;
        this.homework.description = data.description;
        // Pārveido datumu pareizā formātā priekš <input type="date">.
        this.homework.dueDate = data.dueDate
          ? new Date(data.dueDate).toISOString().split("T")[0]
          : this.today;
        this.homework.additionalInfo = data.additionalInfo || "";
        // Pārveido saišu masīvu par stringu, kur katra saite ir jaunā rindā.
        this.homework.links = data.links ? data.links.join("\n") : "";
        // Iestata pielāgotās grupas ID.
        this.homework.customGroupId = data.customGroupId
          ? data.customGroupId.toString()
          : "";
      } catch (error) {
        console.error("Kļūda ielādējot mājasdarbu rediģēšanai:", error);
        this.errorMessage =
          error.response?.data?.msg ||
          "Kļūda ielādējot mājasdarba datus rediģēšanai. " +
            (this.errorMessage || ""); // Saglabā iepriekšējo kļūdu, ja tāda bija
        // Ja serveris atgriež 403 (Aizliegts) vai 404 (Nav atrasts) statusu,
        // pēc īsa brīža novirza lietotāju atpakaļ uz informācijas paneli.
        if (error.response?.status === 403 || error.response?.status === 404) {
          setTimeout(() => this.$emit("navigateToDashboard"), 2000);
        }
      } finally {
        this.isLoading = false; // Beidz ielādes stāvokli
      }
    },
    // Navigācijas metode atpakaļ.
    handleBackNavigation() {
      if (this.itemIdToEdit) {
        // Ja rediģē, izsauc 'cancelEdit' notikumu (parasti atgriežas sarakstā).
        this.$emit("cancelEdit");
      } else {
        // Ja pievieno jaunu, izsauc 'navigateToDashboard' notikumu.
        this.$emit("navigateToDashboard");
      }
    },
    // Metode, kas tiek izsaukta, atceļot rediģēšanu.
    cancelEdit() {
      this.$emit("cancelEdit"); // Paziņo vecākkomponentam par atcelšanu
    },
    // Klienta puses formas validācija.
    validateClientSideForm() {
      // Notīra iepriekšējos vispārīgos validācijas ziņojumus.
      if (
        this.errorMessage &&
        (this.errorMessage.startsWith("Lūdzu") || // Piemēram, "Lūdzu, aizpildiet..."
          this.errorMessage.startsWith("Saite") || // Piemēram, "Saite nav korekta..."
          this.errorMessage.includes("rakstzīmes")) // Piemēram, "...nedrīkst pārsniegt X rakstzīmes."
      ) {
        this.errorMessage = "";
      }
      this.successMessage = ""; // Notīra veiksmes ziņojumu

      // Pārbauda obligātos laukus un specifiskas validācijas.
      if (!this.homework.customGroupId) {
        this.errorMessage =
          "Lūdzu, izvēlieties grupu, kurai pievienot mājasdarbu.";
        return false;
      }
      if (!this.homework.subject.trim()) {
        this.errorMessage = "Mācību priekšmets ir obligāts lauks.";
        return false;
      }
      if (this.homework.subject.trim().length > 50) {
        this.errorMessage =
          "Mācību priekšmeta nosaukums nedrīkst pārsniegt 50 rakstzīmes.";
        return false;
      }
      if (!this.homework.description.trim()) {
        this.errorMessage = "Uzdevuma apraksts ir obligāts lauks.";
        return false;
      }
      if (this.homework.description.trim().length > 1000) {
        this.errorMessage =
          "Uzdevuma apraksts nedrīkst pārsniegt 1000 rakstzīmes.";
        return false;
      }
      if (!this.homework.dueDate) {
        this.errorMessage = "Izpildes termiņš ir obligāts lauks.";
        return false;
      }
      // Validē saišu formātu, ja tās ir ievadītas.
      if (this.homework.links.trim()) {
        const linksArray = this.homework.links
          .split("\n") // Sadala saites pa jaunām rindām
          .map((link) => link.trim()) // Noņem liekās atstarpes
          .filter((link) => link.trim() !== ""); // Izfiltrē tukšas rindas
        for (const link of linksArray) {
          if (!link.startsWith("http://") && !link.startsWith("https://")) {
            this.errorMessage = `Saite "${link.substring(
              0,
              30 // Parāda tikai daļu no saites kļūdas ziņojumā
            )}..." nav korekta. Tai jāsākas ar http:// vai https://`;
            return false; // Pietiek ar vienu nekorektu saiti, lai apturētu validāciju
          }
        }
      }
      return true; // Ja visas pārbaudes veiksmīgas
    },
    // Metode mājasdarba iesniegšanai (jauna pievienošana vai esoša atjaunināšana).
    async submitHomework() {
      if (!this.validateClientSideForm()) return; // Ja klienta puses validācija neizdodas, pārtrauc

      this.isLoading = true; // Sāk ielādes stāvokli
      // Notīra iepriekšējos validācijas kļūdu ziņojumus, kas varētu būt saistīti ar
      // specifiskām lauku validācijām, piemēram, teksta garumu vai saišu formātu.
      if (
        this.errorMessage &&
        (this.errorMessage.startsWith("Lūdzu") ||
          this.errorMessage.startsWith("Saite") ||
          this.errorMessage.includes("rakstzīmes"))
      ) {
        this.errorMessage = "";
      }
      this.successMessage = ""; // Notīra veiksmes ziņojumu

      // Sagatavo datus nosūtīšanai uz serveri.
      const homeworkData = {
        customGroupId: this.homework.customGroupId,
        subject: this.homework.subject,
        description: this.homework.description,
        dueDate: this.homework.dueDate,
        additionalInfo: this.homework.additionalInfo,
        links: this.homework.links, // Saites tiek nosūtītas kā string, serveris parūpēsies par sadalīšanu masīvā
      };

      try {
        let response;
        if (this.itemIdToEdit) {
          // Ja rediģējam, izmanto PUT pieprasījumu.
          response = await axios.put(
            `/api/homework/${this.itemIdToEdit}`,
            homeworkData
          );
        } else {
          // Ja pievienojam jaunu, izmanto POST pieprasījumu.
          response = await axios.post("/api/homework", homeworkData);
        }
        // Parāda veiksmes ziņojumu no servera atbildes.
        this.successMessage =
          response.data.msg ||
          (this.itemIdToEdit
            ? "Mājasdarbs veiksmīgi atjaunināts!"
            : "Mājasdarbs veiksmīgi pievienots!");

        // Ja tika pievienots jauns mājasdarbs, saglabā atlasīto grupu un atiestata formu.
        const previousCustomGroupId = this.homework.customGroupId;
        if (!this.itemIdToEdit) {
          this.resetForm();
          // Ja iepriekš atlasītā grupa joprojām ir derīga (piem., nav noņemta),
          // atjauno to kā atlasīto pēc formas atiestatīšanas.
          if (
            this.availableCustomGroups.some(
              (g) => g._id === previousCustomGroupId
            )
          ) {
            this.homework.customGroupId = previousCustomGroupId;
          }
        }
        // Pēc īsa brīža paziņo vecākkomponentam par veiksmīgu darbību.
        setTimeout(() => {
          this.$emit("itemActionSuccess", this.successMessage);
        }, 1500);
      } catch (error) {
        // Apstrādā kļūdas, kas radušās servera pusē.
        this.errorMessage =
          error.response?.data?.msg || "Darbības kļūda. Lūdzu, mēģiniet vēlāk.";
        console.error(
          "Mājasdarba iesniegšanas/atjaunināšanas kļūda:",
          error.response ? error.response.data : error
        );
      } finally {
        // Ja ir kļūdas ziņojums, ielādes stāvokli beidz šeit.
        // Ja nav kļūdas (veiksme), ielādes stāvoklis netiek mainīts šeit,
        // jo notiks navigācija vai cita darbība pēc taimauta.
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
  color: var(--header-bg-color); /* Tumša krāsa virsrakstam */
  margin: 0 0 1.5rem 0; /* Atstarpes ap virsrakstu */
  font-size: 1.8rem; /* Virsraksta fonta lielums */
  font-weight: 600; /* Virsraksta fonta biezums */
  display: flex; /* Izmanto flexbox elementu izlīdzināšanai */
  align-items: center; /* Vertikāli centrē elementus */
  justify-content: center; /* Horizontāli centrē elementus */
  gap: 0.75rem; /* Atstarpe starp ikonu un tekstu virsrakstā */
}

/* Ikonu stils formas laukos */
.form-icon {
  margin-right: 0.5em; /* Atstarpe no labās puses ikonai */
  color: var(--primary-color); /* Primārā krāsa ikonai */
  opacity: 0.7; /* Nedaudz caurspīdīga ikona */
}

/* Formas sadalītāja stils */
.form-divider {
  margin-top: 2rem; /* Lielāka atstarpe virs sadalītāja */
  margin-bottom: 1.5rem; /* Atstarpe zem sadalītāja */
  border: 0; /* Noņem noklusējuma apmali */
  border-top: 1px solid var(--border-color); /* Pievieno augšējo apmali */
}
/* Formas sadaļas virsraksta stils */
.form-section-title {
  font-size: 1.1rem; /* Sadaļas virsraksta fonta lielums */
  color: var(--header-bg-color); /* Tumša krāsa sadaļas virsrakstam */
  margin-bottom: 1rem; /* Atstarpe zem sadaļas virsraksta */
  font-weight: 600; /* Sadaļas virsraksta fonta biezums */
  display: flex; /* Izmanto flexbox elementu izlīdzināšanai */
  align-items: center; /* Vertikāli centrē elementus */
  gap: 0.5rem; /* Atstarpe starp ikonu un tekstu sadaļas virsrakstā */
}
/* Sadaļas virsraksta ikonas stils */
.form-section-title .fas {
  color: var(--secondary-color); /* Sekundārā krāsa ikonai */
}

/* Informatīvā teksta stils (piem., zem ievadlaukiem) */
.info-text {
  display: flex !important; /* Nodrošina, ka flex tiek piemērots, pat ja ir citi stili */
  align-items: center; /* Vertikāli centrē elementus */
  gap: 0.3rem; /* Maza atstarpe starp ikonu un tekstu */
  font-style: italic; /* Slīpraksts informatīvajam tekstam */
}
/* Informatīvā teksta ikonas stils */
.info-text .fas {
  font-size: 0.9em; /* Nedaudz mazāka ikona */
}

/* Veiksmes un kļūdas ziņojumu ikonu stils */
.success-message .fas,
.error-message .fas {
  margin-right: 0.5em; /* Atstarpe no labās puses ikonai */
}

/* Formas darbību pogu konteinera stils */
.form-actions {
  justify-content: space-between; /* Izlīdzina pogas (piem., Atcelt pa kreisi, Iesniegt pa labi) */
}

/* Stili maziem ekrāniem (piemēram, mobilajām ierīcēm) */
@media (max-width: 600px) {
  .form-actions {
    /* Pārkārto pogas vertikāli, ar primāro pogu augšpusē */
    flex-direction: column-reverse;
  }
  .form-actions .action-button {
    width: 100%; /* Pogas aizņem visu platumu */
  }
  .form-actions .secondary-button {
    margin-bottom: 0.75rem; /* Atstarpe zem sekundārās (Atcelt) pogas */
  }
}
</style>
