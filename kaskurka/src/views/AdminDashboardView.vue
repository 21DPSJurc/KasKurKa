<template>
  <div class="admin-dashboard-view card-style">
    <!-- Galvene administratora panelim -->
    <header class="dashboard-view-header">
      <div class="header-content">
        <!-- Skata virsraksts ar ikonu -->
        <h2 class="view-title">
          <i class="fas fa-user-shield"></i> Administratora Panelis
        </h2>
        <!-- Izrakstīšanās poga -->
        <button
          @click="logout"
          class="action-button danger-button logout-button"
        >
          <i class="fas fa-sign-out-alt"></i> Iziet
        </button>
      </div>
    </header>

    <!-- Ievada sekcija ar sveiciena tekstu -->
    <section class="dashboard-intro">
      <p>
        Laipni lūgti Administratora panelī! Šeit jūs varat pārvaldīt sistēmas
        grupas, lietotājus, pieteikumus un citus svarīgus iestatījumus.
      </p>
    </section>

    <!-- Navigācijas pogas dažādām administratora darbībām -->
    <nav class="dashboard-actions admin-actions">
      <!-- Poga lietotāju pārvaldībai -->
      <button
        class="action-button admin-action-button"
        @click="navigateToManageUsers"
      >
        <i class="fas fa-users-cog"></i> Pārvaldīt Lietotājus
      </button>
      <!-- Poga jaunas grupas izveidei -->
      <button
        class="action-button admin-action-button"
        @click="navigateToCreateGroup"
      >
        <i class="fas fa-plus-square"></i> Izveidot Jaunu Grupu
      </button>
      <!-- Poga esošo grupu pārvaldībai -->
      <button
        class="action-button admin-action-button"
        @click="navigateToManageGroups"
      >
        <i class="fas fa-edit"></i> Pārvaldīt Grupas
      </button>
      <!-- Poga grupu pieteikumu pārvaldībai -->
      <button
        class="action-button admin-action-button"
        @click="navigateToManageGroupApplications"
      >
        <i class="fas fa-tasks"></i> Grupu Pieteikumi
      </button>
      <!-- Poga, lai pārietu uz studenta skatu -->
      <button
        class="action-button admin-action-button view-as-student-button"
        @click="navigateToStudentDashboard"
        title="Pāriet uz studentu skatu, lai redzētu mājasdarbus u.c."
      >
        <i class="fas fa-user-graduate"></i> Skatīt kā Students
      </button>
    </nav>
  </div>
</template>

<script>
export default {
  name: "AdminDashboardView",
  methods: {
    // Izsauc 'logout' notikumu, lai izrakstītos no sistēmas.
    logout() {
      this.$emit("logout");
    },
    // Izsauc 'navigateToCreateGroup' notikumu, lai pārietu uz grupas izveides skatu.
    navigateToCreateGroup() {
      this.$emit("navigateToCreateGroup");
    },
    // Izsauc 'navigateToManageGroupApplications' notikumu, lai pārietu uz grupu pieteikumu pārvaldības skatu.
    navigateToManageGroupApplications() {
      this.$emit("navigateToManageGroupApplications");
    },
    // Izsauc 'navigateToManageGroups' notikumu, lai pārietu uz grupu pārvaldības skatu.
    navigateToManageGroups() {
      this.$emit("navigateToManageGroups");
    },
    // Izsauc 'navigateToManageUsers' notikumu, lai pārietu uz lietotāju pārvaldības skatu.
    navigateToManageUsers() {
      this.$emit("navigateToManageUsers");
    },
    // Izsauc 'navigateToStudentDashboard' notikumu, lai administrators varētu skatīt sistēmu kā students.
    navigateToStudentDashboard() {
      this.$emit("navigateToStudentDashboard");
    },
  },
};
</script>

<style scoped>
/* Stili tiek mantoti no globālā .card-style */
/* Administratora paneļa galvenā konteinera stils */
.admin-dashboard-view {
  padding: 1.5rem; /* Iekšējā atkāpe */
}

/* Paneļa galvenes stils */
.dashboard-view-header {
  margin-bottom: 1.5rem; /* Atstarpe zem galvenes */
  padding-bottom: 1rem; /* Iekšējā atkāpe zemāk */
  border-bottom: 1px solid var(--border-color); /* Apakšējā līnija */
}
/* Galvenes satura konteinera stils */
.dashboard-view-header .header-content {
  display: flex; /* Izmanto flexbox elementu izkārtojumam */
  justify-content: space-between; /* Izlīdzina elementus ar atstarpi starp tiem */
  align-items: center; /* Vertikāli centrē elementus */
}
/* Skata virsraksta stils galvenē */
.dashboard-view-header .view-title {
  color: var(--header-bg-color); /* Virsraksta krāsa */
  margin: 0; /* Noņem noklusējuma atstarpes */
  font-size: 1.8rem; /* Virsraksta fonta lielums */
  font-weight: 600; /* Virsraksta fonta biezums */
  display: flex; /* Izmanto flexbox ikonai un tekstam */
  align-items: center; /* Vertikāli centrē ikonu un tekstu */
  gap: 0.75rem; /* Atstarpe starp ikonu un tekstu */
}
/* Izrakstīšanās pogas stils (izmanto globālos .action-button un .danger-button) */
.logout-button {
  /* Papildu specifiski stili, ja nepieciešams */
}
/* Bīstamības pogas (piem., Iziet) stils */
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

/* Administratora darbību pogu konteinera stils */
.admin-actions {
  display: grid; /* Izmanto grid izkārtojumu */
  /* Automātiski pielāgo kolonnu skaitu, katra kolonna vismaz 250px plata */
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem; /* Atstarpe starp pogām */
  margin-bottom: 1.5rem; /* Atstarpe zem pogu bloka */
}

/* Administratora darbību pogas stils (izmanto globālo .action-button) */
.admin-action-button {
  background-color: var(--primary-color); /* Noklusējuma fona krāsa */
  justify-content: flex-start; /* Izlīdzina saturu (ikonu un tekstu) pa kreisi */
  padding: 1rem; /* Lielāka iekšējā atkāpe lielākām pogām */
  font-size: 1.05rem; /* Fonta lielums */
}
/* Ikonu stils administratora darbību pogās */
.admin-action-button i {
  font-size: 1.2em; /* Nedaudz lielākas ikonas */
  width: 25px; /* Fiksēts platums ikonai, lai teksts būtu vienā līnijā */
  text-align: center; /* Centrē ikonu tās platumā */
}

/* Atšķirīgas krāsas dažādām administratora darbību pogām labākai vizuālai atpazīstamībai */
/* Pārvaldīt Lietotājus pogas krāsa */
.admin-actions .admin-action-button:nth-child(1) {
  background-color: var(--info-color);
}
/* Izveidot Jaunu Grupu pogas krāsa */
.admin-actions .admin-action-button:nth-child(2) {
  background-color: var(--success-color);
}
/* Pārvaldīt Grupas pogas krāsa */
.admin-actions .admin-action-button:nth-child(3) {
  background-color: var(--primary-color);
}
/* Grupu Pieteikumi pogas krāsa (dzeltena, tāpēc nepieciešams tumšs teksts) */
.admin-actions .admin-action-button:nth-child(4) {
  background-color: var(--warning-color);
  color: var(--text-color);
}
/* Skatīt kā Students pogas krāsa */
.admin-actions .admin-action-button.view-as-student-button {
  background-color: var(--secondary-color);
}

/* Administratora darbību pogas stils, kad pele ir virs tās (un tā nav atspējota) */
.admin-actions .admin-action-button:hover:not([disabled]) {
  filter: brightness(110%); /* Nedaudz paspilgtina pogu */
}

/* Sistēmas pārskata viettura stils (ja nākotnē tiks pievienots) */
.admin-summary-placeholder {
  margin-top: 2rem; /* Atstarpe virs viettura */
  padding: 1.5rem; /* Iekšējā atkāpe */
  background-color: #f8f9fa; /* Gaišs fons */
  border: 1px dashed var(--border-color); /* Pārtraukta līnija apmalei */
  border-radius: var(--border-radius); /* Noapaļoti stūri */
  text-align: center; /* Teksta līdzināšana centrā */
  color: #6c757d; /* Teksta krāsa */
}
/* Sistēmas pārskata viettura virsraksta stils */
.admin-summary-placeholder .panel-title {
  font-size: 1.3rem; /* Fonta lielums */
  color: var(--header-bg-color); /* Virsraksta krāsa */
  margin-bottom: 1rem; /* Atstarpe zem virsraksta */
}

/* Stili maziem ekrāniem */
@media (max-width: 768px) {
  /* Pārkārto administratora darbību pogas vienā kolonnā */
  .admin-actions {
    grid-template-columns: 1fr;
  }
}
</style>
