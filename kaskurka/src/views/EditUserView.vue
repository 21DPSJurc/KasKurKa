<template>
  <div class="form-view edit-user-view card-style">
    <!-- Poga, lai dotos atpakaļ uz lietotāju pārvaldības skatu -->
    <!-- Atspējota, ja notiek ielādes process -->
    <button @click="cancelEdit" class="back-button" :disabled="isLoading">
      <i class="fas fa-arrow-left"></i> Atpakaļ uz Lietotāju Pārvaldību
    </button>
    <!-- Skata virsraksts ar ikonu un rediģējamā lietotāja vārdu un uzvārdu -->
    <h2 class="view-title">
      <i class="fas fa-user-edit"></i> Rediģēt Lietotāju:
      <!-- Lietotāja vārds un uzvārds, kamēr dati ielādējas, parādās tukšs -->
      <span class="user-original-name"
        >{{ originalUserData.firstName }} {{ originalUserData.lastName }}</span
      >
    </h2>

    <!-- Kļūdas ziņojums, ja notikusi kļūda sākotnējā datu ielādē -->
    <div v-if="initialLoadingError" class="error-message">
      <i class="fas fa-exclamation-triangle"></i> {{ initialLoadingError }}
    </div>

    <!-- Forma lietotāja datu rediģēšanai -->
    <!-- Redzama tikai tad, ja nav sākotnējās ielādes kļūdas un lietotāja e-pasts ir definēts (dati ielādēti) -->
    <form
      @submit.prevent="submitUpdateUser"
      class="edit-user-form"
      v-if="!initialLoadingError && user.email"
    >
      <!-- Lietotāja pamatinformācijas sadaļas virsraksts -->
      <h3 class="form-section-title">
        <i class="fas fa-id-card"></i> Pamatinformācija
      </h3>
      <!-- Rinda ar vārda un uzvārda ievades laukiem -->
      <div class="form-row">
        <!-- Vārda ievades lauks -->
        <div class="form-group half-width">
          <label for="firstName"
            ><i class="fas fa-user form-icon"></i> Vārds:
            <span class="required-field">*</span></label
          >
          <input
            type="text"
            id="firstName"
            v-model="user.firstName"
            required
            maxlength="30"
            :disabled="isLoading"
          />
        </div>

        <!-- Uzvārda ievades lauks -->
        <div class="form-group half-width">
          <label for="lastName"
            ><i class="fas fa-user form-icon"></i> Uzvārds:
            <span class="required-field">*</span></label
          >
          <input
            type="text"
            id="lastName"
            v-model="user.lastName"
            required
            maxlength="30"
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
          v-model="user.email"
          required
          :disabled="isLoading"
        />
      </div>

      <!-- Lomas izvēles lauks -->
      <div class="form-group">
        <label for="role"
          ><i class="fas fa-user-tag form-icon"></i> Loma:
          <span class="required-field">*</span></label
        >
        <select
          id="role"
          v-model="user.role"
          required
          :disabled="isLoading || originalUserData._id === currentAdminId"
        >
          <option value="student">Students</option>
          <option value="admin">Administrators</option>
        </select>
        <!-- Paziņojums, ja administrators mēģina mainīt savu lomu -->
        <small v-if="originalUserData._id === currentAdminId"
          ><i class="fas fa-info-circle"></i> Administratoram nevar mainīt savu
          lomu.</small
        >
      </div>

      <!-- Formas sadalītājs -->
      <hr class="form-divider" />
      <!-- Studiju informācijas sadaļas virsraksts -->
      <h3 class="form-section-title">
        <i class="fas fa-graduation-cap"></i> Studiju Informācija
      </h3>
      <!-- Rinda ar mācību sākuma gada un grupas ievades laukiem -->
      <div class="form-row">
        <!-- Mācību sākuma gada ievades lauks -->
        <div class="form-group half-width">
          <label for="studyStartYear"
            ><i class="fas fa-calendar-alt form-icon"></i> Mācību sākuma gads:
            <span class="required-field">*</span></label
          >
          <input
            type="number"
            id="studyStartYear"
            v-model.number="user.studyStartYear"
            required
            :min="currentYear - 7"
            :max="currentYear + 1"
            :disabled="isLoading"
          />
        </div>

        <!-- Grupas ievades lauks -->
        <div class="form-group half-width">
          <label for="group"
            ><i class="fas fa-users form-icon"></i> Grupa:
            <span class="required-field">*</span></label
          >
          <input
            type="text"
            id="group"
            v-model="user.group"
            required
            maxlength="10"
            :disabled="isLoading"
          />
        </div>
      </div>

      <!-- Formas sadalītājs -->
      <hr class="form-divider" />
      <!-- Paroles maiņas sadaļas virsraksts -->
      <h3 class="form-section-title">
        <i class="fas fa-key"></i> Paroles Maiņa (Neobligāti)
      </h3>
      <!-- Rinda ar jaunās paroles un paroles apstiprinājuma ievades laukiem -->
      <div class="form-row">
        <!-- Jaunās paroles ievades lauks -->
        <div class="form-group half-width">
          <label for="newPassword"
            ><i class="fas fa-lock form-icon"></i> Jaunā Parole:</label
          >
          <input
            type="password"
            id="newPassword"
            v-model="user.newPassword"
            placeholder="Atstājiet tukšu, ja nemaināt"
            :disabled="isLoading"
          />
        </div>
        <!-- Paroles apstiprinājuma ievades lauks, redzams tikai, ja tiek ievadīta jauna parole -->
        <div class="form-group half-width" v-if="user.newPassword">
          <label for="confirmNewPassword"
            ><i class="fas fa-check-circle form-icon"></i> Apstiprināt
            Paroli:</label
          >
          <input
            type="password"
            id="confirmNewPassword"
            v-model="user.confirmNewPassword"
            :disabled="isLoading"
          />
        </div>
      </div>
      <!-- Piezīme par paroles sarežģītības prasībām, redzama, ja tiek ievadīta jauna parole -->
      <small v-if="user.newPassword"
        >Parolei jābūt min. 8 rakstzīmes, ar lielo/mazo burtu un ciparu.</small
      >

      <!-- Veiksmes ziņojuma attēlošanas bloks -->
      <div v-if="successMessage" class="success-message">
        <i class="fas fa-check-circle"></i> {{ successMessage }}
      </div>
      <!-- Kļūdas ziņojuma attēlošanas bloks -->
      <div v-if="errorMessage" class="error-message">
        <i class="fas fa-exclamation-triangle"></i> {{ errorMessage }}
      </div>

      <!-- Formas darbību pogu bloks (Atcelt, Saglabāt) -->
      <div class="form-actions">
        <button
          type="button"
          @click="cancelEdit"
          class="action-button secondary-button"
          :disabled="isLoading"
        >
          <i class="fas fa-times"></i> Atcelt
        </button>
        <button
          type="submit"
          class="action-button primary-button"
          :disabled="isLoading"
        >
          <i class="fas fa-save"></i>
          <!-- Dinamisks teksts pogai atkarībā no ielādes stāvokļa -->
          {{ isLoading ? "Saglabā..." : "Saglabāt Izmaiņas" }}
        </button>
      </div>
    </form>
  </div>
</template>

<script>
import axios from "axios";

export default {
  name: "EditUserView",
  props: {
    // ID lietotājam, kas tiek rediģēts. Obligāts parametrs.
    userIdToEdit: {
      type: String,
      required: true,
    },
    // Pašreizējā administratora ID, lai novērstu administratora pašrocīgu lomas maiņu.
    currentAdminId: String,
  },
  data() {
    const currentYear = new Date().getFullYear(); // Iegūst pašreizējo gadu
    return {
      // Objekts, kas satur rediģējamā lietotāja datus.
      user: {
        firstName: "",
        lastName: "",
        email: "",
        role: "student", // Noklusējuma loma
        studyStartYear: currentYear, // Noklusējuma mācību sākuma gads
        group: "",
        newPassword: "", // Jaunā parole (ja tiek mainīta)
        confirmNewPassword: "", // Jaunās paroles apstiprinājums
      },
      originalUserData: {}, // Objekts sākotnējo lietotāja datu glabāšanai (piem., vārda/uzvārda attēlošanai virsrakstā)
      currentYear: currentYear, // Pašreizējais gads (izmantošanai `min` un `max` atribūtos)
      isLoading: false, // Norāda, vai notiek datu saglabāšana/ielāde
      initialLoadingError: "", // Kļūdas ziņojums sākotnējai lietotāja datu ielādei
      errorMessage: "", // Vispārīgs kļūdas ziņojums formas darbībām
      successMessage: "", // Vispārīgs veiksmes ziņojums formas darbībām
    };
  },
  watch: {
    // Vēro `userIdToEdit` parametra izmaiņas.
    userIdToEdit: {
      immediate: true, // Izpilda arī uzreiz pēc komponenta izveides
      handler(newVal) {
        if (newVal) {
          // Ja ir jauns ID, ielādē lietotāja datus.
          this.fetchUserDetails(newVal);
        } else {
          this.initialLoadingError = "Lietotāja ID nav norādīts rediģēšanai.";
        }
      },
    },
  },
  methods: {
    // Ielādē konkrētā lietotāja detalizēto informāciju.
    async fetchUserDetails(userId) {
      this.isLoading = true; // Sāk ielādes stāvokli
      this.initialLoadingError = "";
      this.errorMessage = "";
      this.successMessage = "";
      try {
        const response = await axios.get(`/api/users/${userId}`);
        // Saglabā sākotnējos lietotāja datus.
        this.originalUserData = { ...response.data };

        // Aizpilda `user` datu objektu ar saņemto informāciju.
        this.user.firstName = response.data.firstName;
        this.user.lastName = response.data.lastName;
        this.user.email = response.data.email;
        this.user.role = response.data.role;
        this.user.studyStartYear =
          response.data.studyStartYear || this.currentYear; // Ja nav gada, izmanto pašreizējo
        this.user.group = response.data.group || "";
        // Notīra paroles laukus, jo tos nevajag iepriekš aizpildīt.
        this.user.newPassword = "";
        this.user.confirmNewPassword = "";
      } catch (error) {
        console.error("Kļūda ielādējot lietotāja datus:", error);
        this.initialLoadingError =
          error.response?.data?.msg ||
          "Kļūda ielādējot lietotāja datus rediģēšanai.";
        // Ja lietotājs netika atrasts, pēc brīža novirza atpakaļ.
        if (error.response?.status === 404) {
          setTimeout(() => this.$emit("cancelEditUser"), 3000);
        }
      } finally {
        this.isLoading = false; // Beidz ielādes stāvokli
      }
    },
    // Atceļ lietotāja rediģēšanu un paziņo vecākkomponentam.
    cancelEdit() {
      this.$emit("cancelEditUser");
    },
    // Validē lietotāja rediģēšanas formas datus.
    validateForm() {
      this.errorMessage = "";
      this.successMessage = "";
      const requiredFields = [
        "firstName",
        "lastName",
        "email",
        "role",
        "studyStartYear",
        "group",
      ];
      // Pārbauda, vai visi obligātie lauki ir aizpildīti.
      for (const field of requiredFields) {
        if (
          !this.user[field] &&
          (typeof this.user[field] !== "number" || // Skaitliskie lauki var būt 0, bet ne null/undefined/tukši
            this.user[field] === null ||
            this.user[field] === undefined ||
            this.user[field] === "")
        ) {
          this.errorMessage =
            "Lūdzu, aizpildiet visus obligātos laukus ar zvaigznīti.";
          return false;
        }
      }
      // Pārbauda e-pasta formātu.
      if (!/^\S+@\S+\.\S+$/.test(this.user.email)) {
        this.errorMessage = "Nepareizs e-pasta formāts.";
        return false;
      }
      // Pārbauda, vai loma ir viena no atļautajām.
      if (!["student", "admin"].includes(this.user.role)) {
        this.errorMessage = "Nederīga lietotāja loma.";
        return false;
      }

      // Ja tiek ievadīta jauna parole, veic papildu validācijas.
      if (this.user.newPassword) {
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
        if (!passwordRegex.test(this.user.newPassword)) {
          this.errorMessage =
            "Jaunajai parolei jābūt vismaz 8 rakstzīmes garai un jāsatur vismaz viens lielais burts, viens mazais burts un viens cipars.";
          return false;
        }
        if (this.user.newPassword !== this.user.confirmNewPassword) {
          this.errorMessage = "Ievadītās jaunās paroles nesakrīt.";
          return false;
        }
      }
      return true; // Ja visas pārbaudes veiksmīgas
    },
    // Nosūta pieprasījumu lietotāja datu atjaunināšanai.
    async submitUpdateUser() {
      if (!this.validateForm()) return; // Pārtrauc, ja validācija neizdodas

      this.isLoading = true;
      this.errorMessage = "";
      this.successMessage = "";

      // Sagatavo datus nosūtīšanai, noņemot liekās atstarpes un konvertējot uz pareiziem tipiem.
      const updateData = {
        firstName: this.user.firstName.trim(),
        lastName: this.user.lastName.trim(),
        email: this.user.email.trim().toLowerCase(), // E-pastu pārveido uz mazajiem burtiem
        role: this.user.role,
        studyStartYear: parseInt(this.user.studyStartYear, 10), // Pārvērš par skaitli
        group: this.user.group.trim(),
      };
      // Pievieno jauno paroli, ja tā ir ievadīta.
      if (this.user.newPassword) {
        updateData.newPassword = this.user.newPassword;
      }

      try {
        const response = await axios.put(
          `/api/users/${this.userIdToEdit}`,
          updateData
        );
        this.successMessage = response.data.msg; // Parāda veiksmes ziņojumu

        // Ja administrators rediģē pats savu profilu, atjaunina datus arī localStorage.
        // Tas ir svarīgi, lai izmaiņas (piem., vārds, e-pasts) uzreiz atspoguļotos saskarnē.
        const loggedInUser = JSON.parse(localStorage.getItem("user"));
        if (loggedInUser && loggedInUser.id === this.userIdToEdit) {
          // Izveido jaunu lietotāja objektu localStorage, izslēdzot paroli.
          const updatedDetailsForLocalStorage = { ...response.data.user };
          delete updatedDetailsForLocalStorage.password; // Nekad neglabā paroli localStorage

          const updatedLoggedInUser = {
            ...loggedInUser, // Saglabā esošos JWT relevantos laukus (piem., enrolledCustomGroups)
            // Atjaunina mainītos laukus.
            firstName: updatedDetailsForLocalStorage.firstName,
            lastName: updatedDetailsForLocalStorage.lastName,
            email: updatedDetailsForLocalStorage.email,
            role: updatedDetailsForLocalStorage.role,
            studyStartYear: updatedDetailsForLocalStorage.studyStartYear,
            group: updatedDetailsForLocalStorage.group,
          };
          localStorage.setItem("user", JSON.stringify(updatedLoggedInUser));
          // Ja ir pieejama `refreshUser` funkcija (no App.vue), izsauc to,
          // lai atjaunotu `currentUser` stāvokli visā lietotnē.
          if (this.refreshUser) {
            await this.refreshUser();
          }
        }

        // Pēc īsa brīža paziņo vecākkomponentam par veiksmīgu darbību.
        setTimeout(() => {
          this.$emit("userUpdateSuccess", this.successMessage);
        }, 1800); // Gaida 1.8 sekundes
      } catch (error) {
        if (error.response && error.response.data && error.response.data.msg) {
          this.errorMessage = error.response.data.msg;
        } else {
          this.errorMessage =
            "Kļūda atjauninot lietotāja datus. Lūdzu, mēģiniet vēlāk.";
        }
        console.error("Lietotāja atjaunināšanas kļūda:", error);
      } finally {
        // Ja ir kļūdas ziņojums, ielādes stāvokli beidz šeit.
        // Ja veiksme, ielādes stāvoklis paliek aktīvs līdz notiek navigācija.
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
/* Lietotāja rediģēšanas skata galvenā konteinera stils */
.edit-user-view {
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
  text-align: center; /* Teksta līdzināšana centrā, ja virsraksts ir vairākās rindās */
}
/* Stils rediģējamā lietotāja vārdam un uzvārdam virsrakstā */
.view-title .user-original-name {
  color: var(--primary-color); /* Primārā krāsa vārdam/uzvārdam */
  font-weight: 500; /* Vieglāks fonta biezums */
  font-size: 0.9em; /* Nedaudz mazāks fonts nekā galvenajam virsrakstam */
  word-break: break-all; /* Pārnes vārdu, ja vārds/uzvārds ir ļoti garš */
}

/* Formas sadaļas virsraksta stils */
.form-section-title {
  font-size: 1.2rem; /* Lielāks fonta lielums */
  color: var(--primary-color); /* Primārā krāsa virsrakstam */
  margin-top: 2rem; /* Lielāka atstarpe virs sadaļas */
  margin-bottom: 1rem; /* Atstarpe zem sadaļas virsraksta */
  padding-bottom: 0.5rem; /* Iekšējā atkāpe zemāk */
  border-bottom: 1px solid var(--border-color); /* Apakšējā līnija */
  display: flex; /* Izmanto flexbox ikonai un tekstam */
  align-items: center; /* Vertikāli centrē ikonu un tekstu */
  gap: 0.5rem; /* Atstarpe starp ikonu un tekstu */
}
/* Noņem augšējo atstarpi pirmajam sadaļas virsrakstam */
.form-section-title:first-of-type {
  margin-top: 0;
}

/* Ikonu stils formas laukos */
.form-icon {
  margin-right: 0.5em; /* Atstarpe no labās puses ikonai */
  color: var(--primary-color); /* Primārā krāsa ikonai */
  opacity: 0.7; /* Nedaudz caurspīdīga ikona */
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

/* Formas sadalītāja stils */
.form-divider {
  margin-top: 2rem; /* Lielāka atstarpe virs sadalītāja */
  margin-bottom: 1.5rem; /* Atstarpe zem sadalītāja */
  border: 0; /* Noņem noklusējuma apmali */
  border-top: 1px solid var(--border-color); /* Pievieno augšējo apmali */
}
/* Piezīmju (small) teksta stils formas grupās, pievienojot ikonu */
.form-group small .fas {
  margin-right: 0.3em; /* Atstarpe no labās puses ikonai */
  opacity: 0.8; /* Nedaudz caurspīdīga ikona */
}

/* Veiksmes un kļūdas ziņojumu ikonu stils */
.success-message .fas,
.error-message .fas {
  margin-right: 0.5em; /* Atstarpe no labās puses ikonai */
}

/* Formas darbību pogu konteinera stils */
.form-actions {
  justify-content: space-between; /* Izlīdzina pogas (Atcelt pa kreisi, Saglabāt pa labi) */
  margin-top: 1.5rem; /* Atstarpe virs pogu bloka */
}

/* Stili ekrāniem ar platumu līdz 768px (planšetdatori) */
@media (max-width: 768px) {
  .form-row {
    flex-direction: column; /* Pārkārto laukus rindā vertikāli */
    gap: 0; /* Noņem atstarpi, jo .form-group.half-width tagad kontrolēs atstarpes */
    margin-bottom: 0;
  }
  .form-group.half-width {
    margin-bottom: 1.25rem; /* Atjauno apakšējo atstarpi, kad lauki ir sakrauti */
  }
}

/* Stili ekrāniem ar platumu līdz 600px (mobilās ierīces) */
@media (max-width: 600px) {
  .form-actions {
    /* Pārkārto formas darbību pogas vertikāli, ar primāro pogu augšpusē */
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
