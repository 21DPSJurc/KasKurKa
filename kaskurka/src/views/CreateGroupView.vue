<template>
  <div class="form-view create-group-view card-style">
    <!-- Poga, lai dotos atpakaļ uz administratora paneli -->
    <!-- Atspējota, ja notiek ielādes process -->
    <button
      @click="goBackToAdminDashboard"
      class="back-button"
      :disabled="isLoading"
    >
      <i class="fas fa-arrow-left"></i> Atpakaļ uz Admin Paneli
    </button>
    <!-- Skata virsraksts ar ikonu -->
    <h2 class="view-title">
      <i class="fas fa-users-cog"></i> Izveidot Jaunu Grupu
    </h2>
    <!-- Formas elements jaunas grupas izveidei -->
    <form @submit.prevent="submitCreateGroup" class="create-group-form">
      <!-- Grupas nosaukuma ievades lauks -->
      <div class="form-group">
        <label for="groupName"
          ><i class="fas fa-tag form-icon"></i> Grupas Nosaukums:
          <span class="required-field">*</span></label
        >
        <input
          type="text"
          id="groupName"
          v-model="group.name"
          required
          maxlength="50"
          placeholder="Piem., DT3-1 vai RTU Datorzinātne"
          :disabled="isLoading"
        />
        <small>Unikāls nosaukums, līdz 50 rakstzīmēm.</small>
      </div>

      <!-- Grupas apraksta ievades lauks (neobligāts) -->
      <div class="form-group">
        <label for="groupDescription"
          ><i class="fas fa-info-circle form-icon"></i> Grupas Apraksts
          (neobligāts):</label
        >
        <textarea
          id="groupDescription"
          v-model="group.description"
          maxlength="255"
          rows="3"
          placeholder="Īss apraksts par grupas mērķi vai saturu..."
          :disabled="isLoading"
        ></textarea>
        <small>Līdz 255 rakstzīmēm.</small>
      </div>

      <!-- Mācību gada ievades lauks (neobligāts) -->
      <div class="form-group">
        <label for="studyYear"
          ><i class="fas fa-calendar-alt form-icon"></i> Mācību Gads
          (neobligāts):</label
        >
        <input
          type="text"
          id="studyYear"
          v-model="group.studyYear"
          placeholder="Piem., 2023/2024"
          maxlength="9"
          :disabled="isLoading"
        />
        <small>Formāts GGGG/GGGG, līdz 9 rakstzīmēm.</small>
      </div>

      <!-- Veiksmes ziņojuma attēlošanas bloks -->
      <div v-if="successMessage" class="success-message">
        <i class="fas fa-check-circle"></i> {{ successMessage }}
      </div>
      <!-- Kļūdas ziņojuma attēlošanas bloks -->
      <div v-if="errorMessage" class="error-message">
        <i class="fas fa-exclamation-triangle"></i> {{ errorMessage }}
      </div>

      <!-- Formas darbību pogu bloks -->
      <div class="form-actions">
        <!-- Atcelšanas poga -->
        <button
          type="button"
          @click="goBackToAdminDashboard"
          class="action-button secondary-button"
          :disabled="isLoading"
        >
          <i class="fas fa-times"></i> Atcelt
        </button>
        <!-- Izveidošanas poga -->
        <button
          type="submit"
          class="action-button primary-button"
          :disabled="isLoading"
        >
          <i class="fas fa-plus-circle"></i>
          <!-- Dinamisks teksts pogai atkarībā no ielādes stāvokļa -->
          {{ isLoading ? "Veido..." : "Izveidot Grupu" }}
        </button>
      </div>
    </form>
  </div>
</template>

<script>
import axios from "axios";

export default {
  name: "CreateGroupView",
  data() {
    return {
      // Objekts, kas satur jaunās grupas datus.
      group: {
        name: "", // Grupas nosaukums
        description: "", // Grupas apraksts
        studyYear: "", // Mācību gads
      },
      isLoading: false, // Būla vērtība, kas norāda, vai notiek datu nosūtīšana
      errorMessage: "", // Kļūdas ziņojums, kas tiek parādīts lietotājam
      successMessage: "", // Veiksmes ziņojums, kas tiek parādīts lietotājam
    };
  },
  methods: {
    // Metode, lai dotos atpakaļ uz administratora paneli.
    // Izsauc 'navigateToAdminDashboard' notikumu, ko apstrādā vecākkomponents (App.vue).
    goBackToAdminDashboard() {
      this.$emit("navigateToAdminDashboard");
    },
    // Metode formas datu validācijai pirms nosūtīšanas.
    validateForm() {
      this.errorMessage = ""; // Notīra iepriekšējo kļūdas ziņojumu
      this.successMessage = ""; // Notīra iepriekšējo veiksmes ziņojumu

      // Pārbauda, vai grupas nosaukums ir ievadīts un nav tukšs.
      if (!this.group.name.trim()) {
        this.errorMessage = "Grupas nosaukums ir obligāts lauks.";
        return false;
      }
      // Pārbauda grupas nosaukuma garumu.
      if (this.group.name.length > 50) {
        this.errorMessage =
          "Grupas nosaukums nedrīkst pārsniegt 50 rakstzīmes.";
        return false;
      }
      // Pārbauda grupas apraksta garumu.
      if (this.group.description.length > 255) {
        this.errorMessage =
          "Grupas apraksts nedrīkst pārsniegt 255 rakstzīmes.";
        return false;
      }
      // Pārbauda mācību gada formātu un garumu, ja tas ir ievadīts.
      // Regex /^\d{4}\/\d{4}$/ pārbauda formātu "GGGG/GGGG".
      if (
        this.group.studyYear && // Ja mācību gads ir ievadīts
        !/^\d{4}\/\d{4}$/.test(this.group.studyYear) && // Un tas neatbilst formātam
        this.group.studyYear.length > 0 // Un tas nav tukša virkne (lai atļautu tukšu neobligātu lauku)
      ) {
        if (this.group.studyYear.length > 9) {
          // Pārbauda arī maksimālo garumu, ja formāts ir nepareizs, bet garums pārsniegts.
          this.errorMessage = "Mācību gads nedrīkst pārsniegt 9 rakstzīmes.";
          return false;
        }
        // Ja nepieciešama stingra formāta validācija, var atkomentēt nākamo rindu.
        /*
         this.errorMessage =
           "Mācību gadam jābūt formātā GGGG/GGGG, piemēram, 2023/2024, vai jābūt tukšam.";
         return false;
         */
      }
      return true; // Ja visas pārbaudes ir veiksmīgas
    },
    // Metode jaunas grupas izveides pieprasījuma nosūtīšanai.
    async submitCreateGroup() {
      if (!this.validateForm()) return; // Ja validācija neizdodas, pārtrauc

      this.isLoading = true; // Sāk ielādes stāvokli
      this.errorMessage = ""; // Notīra kļūdas ziņojumu
      this.successMessage = ""; // Notīra veiksmes ziņojumu

      try {
        // Nosūta POST pieprasījumu uz serveri ar grupas datiem.
        const response = await axios.post("/api/groups", this.group);
        this.successMessage = response.data.msg; // Parāda veiksmes ziņojumu no servera
        this.group = { name: "", description: "", studyYear: "" }; // Atiestata formas laukus

        // Pēc īsa brīža paziņo vecākkomponentam par veiksmīgu grupas izveidi,
        // lai tas varētu, piemēram, novirzīt uz citu skatu.
        setTimeout(() => {
          this.$emit("groupCreated", this.successMessage);
        }, 1500); // Gaida 1.5 sekundes, lai lietotājs paspēj izlasīt veiksmes ziņojumu
      } catch (error) {
        // Apstrādā kļūdas, kas radušās servera pusē.
        if (error.response && error.response.data && error.response.data.msg) {
          this.errorMessage = error.response.data.msg; // Parāda kļūdas ziņojumu no servera
        } else {
          this.errorMessage = "Kļūda veidojot grupu. Lūdzu, mēģiniet vēlāk."; // Vispārīgs kļūdas ziņojums
        }
        console.error("Grupas izveides kļūda:", error);
      } finally {
        // Ja ir kļūdas ziņojums, ielādes stāvokli beidz šeit.
        // Ja nav kļūdas (veiksme), ielādes stāvoklis netiek mainīts šeit,
        // jo pēc taimauta notiks navigācija vai cita darbība vecākkomponentā.
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
/* Veiksmes un kļūdas ziņojumu ikonu stils */
.success-message .fas,
.error-message .fas {
  margin-right: 0.5em; /* Atstarpe no labās puses ikonai */
}

/* Formas darbību pogu konteinera stils */
.form-actions {
  justify-content: space-between; /* Izlīdzina pogas (Atcelt pa kreisi, Iesniegt pa labi) */
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
    /* Atcelšanas pogas stils */
    margin-bottom: 0.75rem; /* Atstarpe zem sekundārās pogas */
  }
}
</style>
