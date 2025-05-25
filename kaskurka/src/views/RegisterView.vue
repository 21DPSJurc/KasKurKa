<template>
  <div class="register-view form-view card-style">
    <!-- Poga, lai dotos atpakaļ uz sākuma lapu -->
    <button @click="$emit('navigateHome')" class="back-button">
      <i class="fas fa-arrow-left"></i> Atpakaļ uz Sākumu
    </button>
    <!-- Skata virsraksts ar ikonu -->
    <h2 class="view-title">
      <i class="fas fa-user-plus"></i> Izveidot Jaunu Kontu
    </h2>
    <!-- Reģistrācijas forma -->
    <form @submit.prevent="handleRegister" class="register-form">
      <!-- Rinda ar vārda un uzvārda ievades laukiem -->
      <div class="form-row">
        <div class="form-group half-width">
          <label for="firstName"
            ><i class="fas fa-user-edit form-icon"></i> Vārds:
            <span class="required-field">*</span></label
          >
          <input
            type="text"
            id="firstName"
            v-model="formData.firstName"
            required
            maxlength="30"
            placeholder="Jānis"
            :disabled="isLoading"
          />
        </div>

        <div class="form-group half-width">
          <label for="lastName"
            ><i class="fas fa-user-edit form-icon"></i> Uzvārds:
            <span class="required-field">*</span></label
          >
          <input
            type="text"
            id="lastName"
            v-model="formData.lastName"
            required
            maxlength="30"
            placeholder="Bērziņš"
            :disabled="isLoading"
          />
        </div>
      </div>

      <!-- E-pasta ievades lauks -->
      <div class="form-group">
        <label for="email"
          ><i class="fas fa-envelope form-icon"></i> E-pasts:
          <span class="required-field">*</span></label
        >
        <input
          type="email"
          id="email"
          v-model="formData.email"
          required
          placeholder="piemers@epasts.lv"
          :disabled="isLoading"
        />
      </div>

      <!-- Rinda ar paroles un paroles apstiprinājuma ievades laukiem -->
      <div class="form-row">
        <div class="form-group half-width">
          <label for="password"
            ><i class="fas fa-lock form-icon"></i> Parole:
            <span class="required-field">*</span></label
          >
          <input
            type="password"
            id="password"
            v-model="formData.password"
            required
            placeholder="••••••••"
            :disabled="isLoading"
          />
          <small>Min. 8 rakstzīmes, lielais/mazais burts, cipars.</small>
        </div>

        <div class="form-group half-width">
          <label for="confirmPassword"
            ><i class="fas fa-check-circle form-icon"></i> Apstiprināt Paroli:
            <span class="required-field">*</span></label
          >
          <input
            type="password"
            id="confirmPassword"
            v-model="formData.confirmPassword"
            required
            placeholder="••••••••"
            :disabled="isLoading"
          />
        </div>
      </div>

      <!-- Formas sadalītājs -->
      <hr class="form-divider" />
      <!-- Studiju informācijas sadaļas virsraksts -->
      <h3 class="form-section-title">
        <i class="fas fa-graduation-cap"></i> Studiju Informācija
      </h3>

      <!-- Rinda ar mācību sākuma gada un grupas ievades laukiem -->
      <div class="form-row">
        <div class="form-group half-width">
          <label for="studyStartYear"
            ><i class="fas fa-calendar-alt form-icon"></i> Mācību sākuma gads:
            <span class="required-field">*</span></label
          >
          <input
            type="number"
            id="studyStartYear"
            v-model.number="formData.studyStartYear"
            required
            :min="currentYear - 7"
            :max="currentYear + 1"
            :placeholder="currentYear.toString()"
            :disabled="isLoading"
          />
          <small
            >Gadam jābūt starp {{ currentYear - 7 }} un
            {{ currentYear + 1 }}.</small
          >
        </div>

        <div class="form-group half-width">
          <label for="group"
            ><i class="fas fa-users form-icon"></i> Grupa:
            <span class="required-field">*</span></label
          >
          <input
            type="text"
            id="group"
            v-model="formData.group"
            required
            maxlength="10"
            placeholder="Piem. DT3-1"
            :disabled="isLoading"
          />
          <small>Līdz 10 rakstzīmēm.</small>
        </div>
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
          @click="$emit('navigateHome')"
          class="action-button secondary-button"
          :disabled="isLoading"
        >
          <i class="fas fa-times"></i> Atcelt
        </button>
        <!-- Reģistrēšanās poga -->
        <button
          type="submit"
          class="action-button primary-button"
          :disabled="isLoading"
        >
          <i class="fas fa-user-plus"></i>
          <!-- Dinamisks teksts pogai atkarībā no ielādes stāvokļa -->
          {{ isLoading ? "Reģistrējas..." : "Reģistrēties" }}
        </button>
      </div>
    </form>
  </div>
</template>

<script>
import axios from "axios";

export default {
  name: "RegisterView", // Komponenta nosaukums
  data() {
    const currentYear = new Date().getFullYear(); // Iegūst pašreizējo gadu
    return {
      // Objekts, kas satur formas datus
      formData: {
        firstName: "", // Vārds
        lastName: "", // Uzvārds
        email: "", // E-pasts
        password: "", // Parole
        confirmPassword: "", // Paroles apstiprinājums
        studyStartYear: currentYear, // Mācību sākuma gads, noklusētais ir pašreizējais gads
        group: "", // Grupa
      },
      currentYear: currentYear, // Pašreizējais gads (izmantošanai `min` un `max` atribūtos)
      errorMessage: "", // Kļūdas ziņojums, kas tiek parādīts lietotājam
      isLoading: false, // Būla vērtība, kas norāda, vai notiek reģistrācijas process
    };
  },
  methods: {
    // Metode reģistrācijas pieprasījuma apstrādei
    async handleRegister() {
      this.errorMessage = ""; // Notīra iepriekšējo kļūdas ziņojumu
      this.isLoading = true; // Sāk reģistrācijas procesu

      // Pārbauda, vai visi obligātie lauki ir aizpildīti
      const requiredFields = [
        "firstName",
        "lastName",
        "email",
        "password",
        "confirmPassword",
        "studyStartYear",
        "group",
      ];
      for (const field of requiredFields) {
        if (
          !this.formData[field] && // Ja lauks ir tukšs (nav undefined, null, vai tukša virkne)
          (typeof this.formData[field] !== "number" || // Un tas nav skaitlisks lauks (kas varētu būt 0)
            this.formData[field] === null) // Vai tas ir explicit null (gadījumam ja input[type=number] atgriež null)
        ) {
          this.errorMessage =
            "Lūdzu, aizpildiet visus obligātos laukus ar zvaigznīti.";
          this.isLoading = false; // Beidz reģistrācijas procesu
          return; // Pārtrauc metodes izpildi
        }
      }

      // Pārbauda e-pasta formātu
      if (!/^\S+@\S+\.\S+$/.test(this.formData.email)) {
        this.errorMessage = "Nepareizs e-pasta formāts.";
        this.isLoading = false;
        return;
      }

      // Pārbauda paroles sarežģītību
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
      if (!passwordRegex.test(this.formData.password)) {
        this.errorMessage =
          "Parolei jābūt vismaz 8 rakstzīmes garai un jāsatur vismaz viens lielais burts, viens mazais burts un viens cipars.";
        this.isLoading = false;
        return;
      }

      // Pārbauda, vai paroles sakrīt
      if (this.formData.password !== this.formData.confirmPassword) {
        this.errorMessage = "Ievadītās paroles nesakrīt.";
        this.isLoading = false;
        return;
      }

      // Pārbauda mācību sākuma gada robežas
      if (
        this.formData.studyStartYear < this.currentYear - 7 ||
        this.formData.studyStartYear > this.currentYear + 1
      ) {
        this.errorMessage = `Mācību sākuma gadam jābūt starp ${
          this.currentYear - 7
        } un ${this.currentYear + 1}.`;
        this.isLoading = false;
        return;
      }

      // Pārbauda grupas nosaukuma garumu
      if (this.formData.group.length > 10) {
        this.errorMessage =
          "Grupas nosaukums nedrīkst pārsniegt 10 rakstzīmes.";
        this.isLoading = false;
        return;
      }

      try {
        // Noņem `confirmPassword` no datiem, kas tiek sūtīti uz API
        // eslint-disable-next-line no-unused-vars
        const { confirmPassword: _confirmPassword, ...apiData } = this.formData;
        // Nosūta POST pieprasījumu uz serveri ar reģistrācijas datiem
        const response = await axios.post("/api/auth/register", apiData);
        console.log("Registration API response:", response.data); // Reģistrē atbildi konsolē (izstrādes nolūkiem)
        // Ja reģistrācija veiksmīga, izsauc 'registrationSuccess' notikumu,
        // ko apstrādā vecākkomponents (App.vue)
        this.$emit("registrationSuccess");
      } catch (error) {
        // Apstrādā kļūdas, kas radušās servera pusē vai savienojuma laikā
        if (error.response && error.response.data && error.response.data.msg) {
          this.errorMessage = error.response.data.msg; // Parāda kļūdas ziņojumu no servera
        } else {
          this.errorMessage = "Reģistrācijas kļūda. Lūdzu, mēģiniet vēlāk."; // Vispārīgs kļūdas ziņojums
        }
        console.error("Registration error:", error); // Reģistrē kļūdu konsolē
      } finally {
        this.isLoading = false; // Beidz reģistrācijas procesu neatkarīgi no rezultāta
      }
    },
  },
};
</script>

<style scoped>
/* .register-view pārmanto .form-view un .card-style no globālajiem stiliem */

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

/* Stils rindai ar diviem formas laukiem */
.form-row {
  display: flex; /* Izmanto flexbox elementu izkārtojumam */
  gap: 1rem; /* Atstarpe starp laukiem rindā */
  margin-bottom: 1.25rem; /* Atstarpe zem rindas, tāda pati kā .form-group */
}
/* Stils formas grupai, kas aizņem pusi no rindas platuma */
.form-group.half-width {
  flex: 1; /* Vienādi sadala pieejamo platumu */
  min-width: 0; /* Ļauj elementiem sašaurināties, ja nepieciešams */
  margin-bottom: 0; /* Noņem apakšējo atstarpi, jo to kontrolē .form-row */
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

/* Kļūdas ziņojuma ikonas stils */
.error-message .fas {
  margin-right: 0.5em; /* Atstarpe no labās puses ikonai */
}

/* Formas darbību pogu konteinera stils */
.form-actions {
  justify-content: space-between; /* Izlīdzina pogas (Atcelt pa kreisi, Reģistrēties pa labi) */
}

/* Stili ekrāniem ar platumu līdz 600px (mobilās ierīces) */
@media (max-width: 600px) {
  .form-row {
    flex-direction: column; /* Pārkārto laukus rindā vertikāli */
    gap: 0; /* Noņem atstarpi, jo .form-group tagad kontrolēs atstarpes */
    margin-bottom: 0;
  }
  .form-group.half-width {
    margin-bottom: 1.25rem; /* Atjauno apakšējo atstarpi, kad lauki ir sakrauti */
  }
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
