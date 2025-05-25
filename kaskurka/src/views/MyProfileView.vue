<template>
  <div class="my-profile-view card-style">
    <!-- Poga, lai dotos atpakaļ uz informācijas paneli -->
    <button @click="goBack" class="back-button">
      <i class="fas fa-arrow-left"></i> Atpakaļ uz Paneli
    </button>
    <!-- Profila galvene ar ikonu un virsrakstu -->
    <div class="profile-header">
      <i class="fas fa-id-card profile-icon-large"></i>
      <h2 class="view-title">Mans Profils</h2>
    </div>

    <!-- Indikators, kas tiek rādīts, ja lietotāja dati vēl nav ielādēti -->
    <div v-if="!currentUser" class="loading-indicator">
      <i class="fas fa-spinner fa-spin"></i> Notiek profila datu ielāde...
    </div>
    <!-- Galvenais profila detaļu režģis -->
    <div v-else class="profile-details-grid">
      <!-- Personīgās informācijas sadaļa -->
      <div class="profile-section card-style-inner">
        <h3 class="section-title">
          <i class="fas fa-user-circle"></i> Personīgā Informācija
        </h3>
        <!-- Vārds -->
        <div class="detail-item">
          <span class="detail-label">Vārds:</span>
          <span class="detail-value">{{ currentUser.firstName }}</span>
        </div>
        <!-- Uzvārds -->
        <div class="detail-item">
          <span class="detail-label">Uzvārds:</span>
          <span class="detail-value">{{ currentUser.lastName }}</span>
        </div>
        <!-- E-pasts -->
        <div class="detail-item">
          <span class="detail-label">E-pasts:</span>
          <span class="detail-value">{{ currentUser.email }}</span>
        </div>
        <!-- Loma -->
        <div class="detail-item">
          <span class="detail-label">Loma:</span>
          <span
            class="detail-value role-badge"
            :class="`role-${currentUser.role}`"
            >{{ getRoleText(currentUser.role) }}</span
          >
        </div>
        <!-- Reģistrācijas datums -->
        <div class="detail-item">
          <span class="detail-label">Reģistrējies:</span>
          <span class="detail-value">{{
            formatDate(currentUser.createdAt)
          }}</span>
        </div>
      </div>

      <!-- Studiju informācijas sadaļa -->
      <div class="profile-section card-style-inner">
        <h3 class="section-title">
          <i class="fas fa-graduation-cap"></i> Studiju Informācija
        </h3>
        <!-- Reģistrācijas grupa -->
        <div class="detail-item">
          <span class="detail-label">Reģistrācijas grupa:</span>
          <span class="detail-value">{{ currentUser.group }}</span>
        </div>
        <!-- Mācību sākuma gads -->
        <div class="detail-item">
          <span class="detail-label">Mācību sākuma gads:</span>
          <span class="detail-value">{{ currentUser.studyStartYear }}</span>
        </div>
      </div>

      <!-- Pielāgoto grupu sadaļa (tikai studentiem, ja tādas ir) -->
      <div
        class="profile-section card-style-inner full-width-section"
        v-if="
          currentUser.role === 'student' &&
          currentUser.enrolledCustomGroupsDetails &&
          currentUser.enrolledCustomGroupsDetails.length > 0
        "
      >
        <h3 class="section-title">
          <i class="fas fa-users"></i> Manas Pielāgotās Grupas
        </h3>
        <!-- Pielāgoto grupu saraksts -->
        <ul class="custom-groups-list">
          <li
            v-for="group in currentUser.enrolledCustomGroupsDetails"
            :key="group._id"
            class="custom-group-item"
          >
            <i class="fas fa-layer-group list-icon"></i> {{ group.name }}
          </li>
        </ul>
      </div>
      <!-- Ziņojums studentam, ja nav pievienojies pielāgotajām grupām -->
      <div
        class="profile-section card-style-inner"
        v-else-if="currentUser.role === 'student'"
      >
        <h3 class="section-title">
          <i class="fas fa-users"></i> Manas Pielāgotās Grupas
        </h3>
        <p class="no-groups-message">
          <i class="fas fa-info-circle"></i> Jūs neesat pievienojies nevienai
          pielāgotajai grupai.
        </p>
      </div>

      <!-- Nākotnes darbības (piemērs) -->
      <!--
      <div class="profile-actions card-style-inner full-width-section">
        <h3 class="section-title"><i class="fas fa-cog"></i> Profila Darbības</h3>
        <button class="action-button secondary-button" @click="navigateToChangePassword">
            <i class="fas fa-key"></i> Mainīt Paroli
        </button>
      </div>
      -->
    </div>
  </div>
</template>

<script>
export default {
  name: "MyProfileView", // Komponenta nosaukums
  props: {
    // Pašreizējā lietotāja dati, tiek padoti no vecākkomponenta (App.vue)
    currentUser: {
      type: Object,
      required: true,
    },
  },
  methods: {
    // Metode, lai dotos atpakaļ uz lietotājam specifisko informācijas paneli
    goBack() {
      this.$emit("navigateToUserSpecificDashboard");
    },
    // Formatē datuma virkni uz lokalizētu formātu (piem., "1. janvāris, 2023")
    formatDate(dateString) {
      if (!dateString) return "N/A"; // Ja datums nav norādīts
      const options = {
        year: "numeric",
        month: "long", // Garš mēneša nosaukums
        day: "numeric",
      };
      try {
        return new Date(dateString).toLocaleDateString("lv-LV", options);
      } catch (e) {
        return dateString; // Atgriež oriģinālo virkni, ja notiek kļūda
      }
    },
    // Atgriež lietotāja lomas tekstuālo aprakstu
    getRoleText(roleKey) {
      const map = { student: "Students", admin: "Administrators" };
      return map[roleKey] || roleKey; // Ja nav atbilstības, atgriež pašu atslēgu
    },
    // Metode paroles maiņas skata navigācijai (nākotnes funkcionalitāte)
    // navigateToChangePassword() {
    //   this.$emit("navigateToChangePassword");
    // }
  },
};
</script>

<style scoped>
/* "Mans Profils" skata galvenā konteinera stils, pārmanto .card-style */
.my-profile-view {
  max-width: 900px; /* Maksimālais platums */
  padding: 1.5rem; /* Iekšējā atkāpe */
}
/* Profila galvenes stils */
.profile-header {
  text-align: center; /* Centrē tekstu */
  margin-bottom: 2rem; /* Atstarpe zem galvenes */
}
/* Lielās profila ikonas stils */
.profile-icon-large {
  font-size: 4rem; /* Ikonas lielums */
  color: var(--primary-color); /* Primārā krāsa ikonai */
  margin-bottom: 0.5rem; /* Atstarpe zem ikonas */
}
/* Skata virsraksta stils */
.view-title {
  color: var(--header-bg-color); /* Virsraksta krāsa */
  margin: 0; /* Noņem noklusējuma atstarpes */
  font-size: 2rem; /* Virsraksta fonta lielums */
  font-weight: 600; /* Virsraksta fonta biezums */
}

/* Profila detaļu režģa stils */
.profile-details-grid {
  display: grid; /* Izmanto grid izkārtojumu */
  /* Automātiski pielāgo kolonnu skaitu, katra kolonna vismaz 300px plata */
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem; /* Atstarpe starp režģa elementiem */
}

/* Atsevišķas profila sadaļas stils */
.profile-section {
  /* Izmanto .card-style-inner iekšējām kartītēm */
}
/* Iekšējās kartītes stils */
.card-style-inner {
  background-color: var(--card-bg-color); /* Fona krāsa */
  border-radius: var(--border-radius); /* Noapaļoti stūri */
  box-shadow: var(--shadow-sm); /* Neliela ēna */
  padding: 1.25rem; /* Iekšējā atkāpe */
  border: 1px solid var(--border-color); /* Apmale */
}
/* Stils sadaļai, kas aizņem visu režģa platumu */
.full-width-section {
  grid-column: 1 / -1; /* Liek elementam aizņemt visas kolonnas */
}

/* Sadaļas virsraksta stils */
.section-title {
  font-size: 1.3rem; /* Fonta lielums */
  color: var(--primary-color); /* Primārā krāsa virsrakstam */
  margin-top: 0; /* Noņem augšējo atstarpi */
  margin-bottom: 1rem; /* Atstarpe zem virsraksta */
  padding-bottom: 0.5rem; /* Iekšējā atkāpe zemāk */
  border-bottom: 1px solid var(--border-color); /* Apakšējā līnija */
  display: flex; /* Izmanto flexbox ikonai un tekstam */
  align-items: center; /* Vertikāli centrē ikonu un tekstu */
  gap: 0.6rem; /* Atstarpe starp ikonu un tekstu */
}
/* Atsevišķa detaļu elementa (etiķete + vērtība) stils */
.detail-item {
  display: flex; /* Izmanto flexbox elementu izkārtojumam */
  justify-content: space-between; /* Izlīdzina etiķeti un vērtību ar atstarpi starp tām */
  padding: 0.5rem 0; /* Iekšējā atkāpe augšā un apakšā */
  border-bottom: 1px dotted #eee; /* Punktēta līnija starp elementiem */
  font-size: 1rem; /* Fonta lielums */
}
/* Noņem apakšējo līniju pēdējam detaļu elementam */
.detail-item:last-child {
  border-bottom: none;
}
/* Detaļas etiķetes (label) stils */
.detail-label {
  font-weight: 600; /* Biezāks fonts */
  color: #555; /* Tumši pelēka krāsa */
  margin-right: 1rem; /* Atstarpe no labās puses */
}
/* Detaļas vērtības stils */
.detail-value {
  color: var(--text-color); /* Teksta krāsa */
  text-align: right; /* Līdzina tekstu pa labi */
}
/* Lietotāja lomas emblēmas (badge) stils */
.role-badge {
  padding: 0.2em 0.6em; /* Iekšējā atkāpe */
  font-size: 0.85em; /* Fonta lielums */
  font-weight: bold; /* Biezs fonts */
  border-radius: var(--border-radius); /* Noapaļoti stūri */
  color: var(--text-color-light); /* Gaišs teksts */
  text-transform: capitalize; /* Pirmais burts liels */
}
/* Studenta lomas emblēmas fona krāsa */
.role-student {
  background-color: var(--info-color);
}
/* Administratora lomas emblēmas fona krāsa (dzeltens ar tumšu tekstu) */
.role-admin {
  background-color: var(--warning-color);
  color: var(--text-color);
}

/* Pielāgoto grupu saraksta stils */
.custom-groups-list {
  list-style: none; /* Noņem saraksta marķierus */
  padding: 0; /* Noņem iekšējo atkāpi */
  margin: 0; /* Noņem ārējās atstarpes */
}
/* Atsevišķa pielāgotās grupas elementa stils */
.custom-group-item {
  background-color: #f8f9fa; /* Gaišs fons */
  padding: 0.6rem 1rem; /* Iekšējā atkāpe */
  border-radius: var(--border-radius); /* Noapaļoti stūri */
  margin-bottom: 0.5rem; /* Atstarpe zem elementa */
  font-size: 0.95rem; /* Fonta lielums */
  color: var(--text-color); /* Teksta krāsa */
  display: flex; /* Izmanto flexbox ikonai un tekstam */
  align-items: center; /* Vertikāli centrē ikonu un tekstu */
  gap: 0.5rem; /* Atstarpe starp ikonu un tekstu */
}
/* Saraksta ikonas stils */
.list-icon {
  color: var(--primary-color); /* Primārā krāsa ikonai */
}
/* Ziņojuma stils, ja lietotājs nav pievienojies grupām */
.no-groups-message {
  font-style: italic; /* Slīpraksts */
  color: #6c757d; /* Teksta krāsa */
  display: flex; /* Izmanto flexbox ikonai un tekstam */
  align-items: center; /* Vertikāli centrē ikonu un tekstu */
  gap: 0.5rem; /* Atstarpe starp ikonu un tekstu */
}

/* Profila darbību sadaļas stils (nākotnes funkcionalitātei) */
.profile-actions {
  margin-top: 1.5rem; /* Atstarpe virs sadaļas */
  text-align: center; /* Centrē pogas */
}
.profile-actions .action-button {
  /* Izmanto globālos .action-button stilus */
}
</style>
