<template>
  <div class="login-view form-view card-style">
    <!-- Poga, lai dotos atpakaļ uz sākuma lapu -->
    <button @click="$emit('navigateHome')" class="back-button">
      <i class="fas fa-arrow-left"></i> Atpakaļ uz Sākumu
    </button>
    <!-- Skata virsraksts ar ikonu -->
    <h2 class="view-title">
      <i class="fas fa-sign-in-alt"></i> Pieslēgties Sistēmai
    </h2>
    <!-- Pieteikšanās forma -->
    <form @submit.prevent="handleLogin" class="login-form">
      <!-- E-pasta ievades lauks -->
      <div class="form-group">
        <label for="email"
          ><i class="fas fa-envelope form-icon"></i> E-pasts:</label
        >
        <input
          type="email"
          id="email"
          v-model="email"
          required
          placeholder="ievadiet.epastu@piemers.lv"
          :disabled="isLoading"
        />
      </div>

      <!-- Paroles ievades lauks -->
      <div class="form-group">
        <label for="password"
          ><i class="fas fa-lock form-icon"></i> Parole:</label
        >
        <input
          type="password"
          id="password"
          v-model="password"
          required
          placeholder="••••••••"
          :disabled="isLoading"
        />
      </div>

      <!-- Kļūdas ziņojuma attēlošanas bloks -->
      <div v-if="errorMessage" class="error-message">
        <i class="fas fa-exclamation-triangle"></i> {{ errorMessage }}
      </div>

      <!-- Formas darbību pogu bloks -->
      <div class="form-actions">
        <!-- Pieteikšanās poga -->
        <button
          type="submit"
          class="action-button primary-button login-submit-button"
          :disabled="isLoading"
        >
          <i class="fas fa-sign-in-alt"></i>
          <!-- Dinamisks teksts pogai atkarībā no ielādes stāvokļa -->
          {{ isLoading ? "Pieslēdzas..." : "Pieslēgties" }}
        </button>
      </div>
    </form>
    <!-- Teksts un saite uz reģistrācijas lapu -->
    <p class="register-prompt">
      Nav vēl konta?
      <button
        @click="$emit('navigateToRegister')"
        class="link-button"
        :disabled="isLoading"
      >
        <i class="fas fa-user-plus"></i> Reģistrēties šeit
      </button>
    </p>
  </div>
</template>

<script>
import axios from "axios";

export default {
  name: "LoginView",
  data() {
    return {
      email: "", // Lietotāja ievadītais e-pasts
      password: "", // Lietotāja ievadītā parole
      errorMessage: "", // Kļūdas ziņojums, kas tiek parādīts lietotājam
      isLoading: false, // Būla vērtība, kas norāda, vai notiek pieteikšanās process
    };
  },
  methods: {
    // Metode pieteikšanās pieprasījuma apstrādei.
    async handleLogin() {
      this.errorMessage = ""; // Notīra iepriekšējo kļūdas ziņojumu
      this.isLoading = true; // Sāk pieteikšanās procesu

      // Pārbauda, vai e-pasts un parole ir ievadīti.
      if (!this.email || !this.password) {
        this.errorMessage = "Lūdzu, ievadiet e-pastu un paroli.";
        this.isLoading = false; // Beidz pieteikšanās procesu
        return; // Pārtrauc metodes izpildi
      }

      try {
        // Nosūta POST pieprasījumu uz serveri ar e-pastu un paroli.
        const response = await axios.post("/api/auth/login", {
          email: this.email,
          password: this.password,
        });
        // Ja pieteikšanās veiksmīga, izsauc 'loginSuccess' notikumu,
        // nododot saņemtos datus (lietotāja informāciju un pilnvaru) vecākkomponentam (App.vue).
        this.$emit("loginSuccess", response.data);
      } catch (error) {
        // Apstrādā kļūdas, kas radušās servera pusē vai savienojuma laikā.
        if (error.response && error.response.data && error.response.data.msg) {
          this.errorMessage = error.response.data.msg; // Parāda kļūdas ziņojumu no servera
        } else if (error.request) {
          // Ja pieprasījums tika veikts, bet atbilde netika saņemta (piem., serveris nav pieejams).
          this.errorMessage =
            "Nevarēja sazināties ar serveri. Lūdzu, mēģiniet vēlāk.";
        } else {
          // Citas kļūdas (piem., konfigurācijas kļūda pirms pieprasījuma nosūtīšanas).
          this.errorMessage = "Pieslēgšanās kļūda. Lūdzu, mēģiniet vēlāk.";
        }
        console.error("Pieteikšanās kļūda:", error);
      } finally {
        this.isLoading = false; // Beidz pieteikšanās procesu neatkarīgi no rezultāta
      }
    },
  },
};
</script>

<style scoped>
/* Stili tiek mantoti no globālajiem .form-view un .card-style */

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

/* Ikonu stils formas laukos */
.form-icon {
  margin-right: 0.5em; /* Atstarpe no labās puses ikonai */
  color: var(--primary-color); /* Primārā krāsa ikonai */
  opacity: 0.7; /* Nedaudz caurspīdīga ikona */
}

/* Kļūdas ziņojuma ikonas stils */
.error-message .fas {
  margin-right: 0.5em; /* Atstarpe no labās puses ikonai */
}

/* Formas darbību pogu konteinera stils */
.form-actions {
  justify-content: center; /* Centrē pieteikšanās pogu */
  margin-top: 1.5rem; /* Atstarpe virs pogu bloka */
}

/* Pieteikšanās pogas specifiskais stils */
.login-submit-button {
  min-width: 200px; /* Nodrošina pietiekamu pogas platumu */
}

/* Teksta un saites uz reģistrācijas lapu stils */
.register-prompt {
  text-align: center; /* Teksta līdzināšana centrā */
  margin-top: 1.5rem; /* Atstarpe virs teksta */
  font-size: 0.95rem; /* Fonta lielums */
  color: var(--text-color); /* Teksta krāsa */
}
/* Saites pogas stils (piem., "Reģistrēties šeit") */
.link-button {
  background: none; /* Noņem fona krāsu */
  border: none; /* Noņem apmali */
  color: var(--link-color); /* Saites krāsa */
  cursor: pointer; /* Rāda norādes kursoru */
  text-decoration: none; /* Noņem pasvītrojumu pēc noklusējuma */
  padding: 0.25rem; /* Neliela iekšējā atkāpe vieglākai klikšķināšanai */
  font-size: 1em; /* Fonta lielums, lai atbilstu apkārtējam tekstam */
  font-weight: 600; /* Biezāks fonts */
  display: inline-flex; /* Izmanto inline-flex elementu izkārtojumam */
  align-items: center; /* Vertikāli centrē ikonu un tekstu */
  gap: 0.3rem; /* Atstarpe starp ikonu un tekstu */
  transition: color 0.2s ease; /* Animācija krāsas maiņai */
}
/* Saites pogas stils, kad pele ir virs tās (un tā nav atspējota) */
.link-button:hover:not([disabled]) {
  color: var(--link-hover-color); /* Maina krāsu */
  text-decoration: underline; /* Pievieno pasvītrojumu */
}
/* Saites pogas stils, kad tā ir atspējota */
.link-button[disabled] {
  color: #bdc3c7; /* Pelēka krāsa */
  cursor: not-allowed; /* Rāda neatļautu kursoru */
  text-decoration: none; /* Noņem pasvītrojumu */
}

/* Stili maziem ekrāniem (piemēram, mobilajām ierīcēm) */
@media (max-width: 600px) {
  .login-submit-button {
    width: 100%; /* Poga aizņem visu platumu */
  }
}
</style>
