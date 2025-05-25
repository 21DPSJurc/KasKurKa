<template>
  <div class="form-view edit-group-view card-style">
    <!-- Poga, lai dotos atpakaļ uz grupu pārvaldības skatu -->
    <!-- Atspējota, ja notiek ielādes vai dalībnieku apstrādes process, vai ir sākotnējā ielādes kļūda -->
    <button
      @click="cancelEdit"
      class="back-button"
      :disabled="isLoading || isMemberProcessing || initialLoadingError"
    >
      <i class="fas fa-arrow-left"></i> Atpakaļ uz Grupu Pārvaldību
    </button>
    <!-- Skata virsraksts ar ikonu un rediģējamās grupas sākotnējo nosaukumu -->
    <h2 class="view-title">
      <i class="fas fa-edit"></i> Rediģēt Grupu:
      <!-- Grupas nosaukums, tiek parādīts "Notiek ielāde...", ja dati vēl nav ielādēti -->
      <span class="group-original-name">{{
        group.originalName || "Notiek ielāde..."
      }}</span>
    </h2>

    <!-- Kļūdas ziņojums, ja notikusi kļūda sākotnējā datu ielādē -->
    <div v-if="initialLoadingError" class="error-message">
      <i class="fas fa-exclamation-triangle"></i> {{ initialLoadingError }}
    </div>

    <!-- Forma grupas pamatinformācijas rediģēšanai -->
    <!-- Redzama tikai tad, ja nav sākotnējās ielādes kļūdas un grupas nosaukums ir definēts (dati ielādēti) -->
    <form
      @submit.prevent="submitUpdateGroup"
      class="edit-group-form"
      v-if="!initialLoadingError && group.name !== undefined"
    >
      <!-- Grupas pamatinformācijas sadaļas virsraksts -->
      <h3 class="form-section-title">
        <i class="fas fa-info-circle"></i> Grupas Pamatinformācija
      </h3>
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
          :disabled="isLoading"
        />
        <small>Unikāls nosaukums, līdz 50 rakstzīmēm.</small>
      </div>

      <!-- Grupas apraksta ievades lauks -->
      <div class="form-group">
        <label for="groupDescription"
          ><i class="fas fa-align-left form-icon"></i> Grupas Apraksts:</label
        >
        <textarea
          id="groupDescription"
          v-model="group.description"
          maxlength="255"
          rows="3"
          :disabled="isLoading"
        ></textarea>
        <small>Līdz 255 rakstzīmēm.</small>
      </div>

      <!-- Mācību gada ievades lauks -->
      <div class="form-group">
        <label for="studyYear"
          ><i class="fas fa-calendar-alt form-icon"></i> Mācību Gads:</label
        >
        <input
          type="text"
          id="studyYear"
          v-model="group.studyYear"
          placeholder="GGGG/GGGG"
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

      <!-- Formas darbību pogu bloks (Atcelt, Saglabāt) -->
      <div class="form-actions">
        <button
          type="button"
          @click="cancelEdit"
          class="action-button secondary-button"
          :disabled="isLoading"
        >
          <i class="fas fa-times"></i> Atcelt Izmaiņas
        </button>
        <button
          type="submit"
          class="action-button primary-button"
          :disabled="isLoading"
        >
          <i class="fas fa-save"></i>
          <!-- Dinamisks teksts pogai atkarībā no ielādes stāvokļa -->
          {{ isLoading ? "Saglabā..." : "Saglabāt Grupas Datus" }}
        </button>
      </div>
    </form>

    <!-- Grupas dalībnieku pārvaldības sadaļa -->
    <!-- Redzama tikai tad, ja nav sākotnējās ielādes kļūdas un grupas dati ir ielādēti -->
    <section
      class="member-management-section card-style-inner"
      v-if="!initialLoadingError && group.name !== undefined"
    >
      <!-- Dalībnieku pārvaldības sadaļas virsraksts -->
      <h3 class="form-section-title">
        <i class="fas fa-users-cog"></i> Grupas Dalībnieku Pārvaldība
      </h3>

      <!-- Indikators, kas tiek rādīts, kamēr notiek dalībnieku apstrāde (pievienošana/noņemšana) -->
      <div v-if="isMemberProcessing" class="loading-indicator small">
        <i class="fas fa-spinner fa-spin"></i> Apstrādā dalībnieku...
      </div>
      <!-- Ziņojums par dalībnieku darbības rezultātu (veiksme/kļūda) -->
      <div
        v-if="memberActionMessage && memberActionMessage.text"
        :class="
          memberActionMessage.type === 'success'
            ? 'success-message-inline'
            : 'error-message-inline'
        "
      >
        <i
          :class="
            memberActionMessage.type === 'success'
              ? 'fas fa-check-circle'
              : 'fas fa-exclamation-circle'
          "
        ></i>
        {{ memberActionMessage.text }}
      </div>

      <!-- Jauna dalībnieka pievienošanas kontroles -->
      <div class="add-member-controls">
        <h4><i class="fas fa-user-plus"></i> Pievienot Jaunu Dalībnieku</h4>
        <!-- Forma jauna dalībnieka izvēlei un pievienošanai -->
        <div class="add-member-form form-group">
          <!-- Izvēles lauks studenta atlasīšanai -->
          <select
            v-model="selectedUserToAdd"
            :disabled="isMemberProcessing || potentialNewMembers.length === 0"
          >
            <option disabled value="">Izvēlieties studentu</option>
            <option
              v-for="user in potentialNewMembers"
              :key="user._id"
              :value="user._id"
            >
              {{ user.firstName }} {{ user.lastName }} ({{ user.email }})
            </option>
          </select>
          <!-- Poga dalībnieka pievienošanai -->
          <button
            @click="addMember"
            class="action-button success-button add-member-btn"
            :disabled="!selectedUserToAdd || isMemberProcessing"
          >
            <i class="fas fa-plus"></i> Pievienot
          </button>
        </div>
        <!-- Ziņojums, ja nav studentu, ko pievienot -->
        <p
          v-if="potentialNewMembers.length === 0 && !isFetchingUsers"
          class="info-text-message"
        >
          <i class="fas fa-info-circle"></i> Visi studenti jau ir šajā grupā vai
          nav pieejamu studentu sarakstā.
        </p>
      </div>

      <!-- Esošo grupas dalībnieku saraksts -->
      <div class="current-members-list">
        <h4>
          <i class="fas fa-list-ul"></i> Esošie Dalībnieki ({{
            currentMembersDetails.length
          }})
        </h4>
        <!-- Indikators, kamēr notiek lietotāju datu ielāde -->
        <div v-if="isFetchingUsers" class="loading-indicator small">
          <i class="fas fa-spinner fa-spin"></i> Ielādē lietotājus...
        </div>
        <!-- Dalībnieku saraksts -->
        <ul v-if="currentMembersDetails.length > 0" class="member-list">
          <li
            v-for="member in currentMembersDetails"
            :key="member._id"
            class="member-list-item"
          >
            <!-- Dalībnieka vārds, uzvārds un e-pasts -->
            <span class="member-name"
              ><i class="fas fa-user"></i> {{ member.firstName }}
              {{ member.lastName }} ({{ member.email }})</span
            >
            <!-- Poga dalībnieka noņemšanai -->
            <button
              @click="removeMember(member._id)"
              class="action-button-small danger-button remove-member-btn"
              :disabled="isMemberProcessing"
              title="Noņemt dalībnieku"
            >
              <i class="fas fa-user-minus"></i>
            </button>
          </li>
        </ul>
        <!-- Ziņojums, ja grupā nav dalībnieku -->
        <p v-else-if="!isFetchingUsers" class="info-text-message">
          <i class="fas fa-info-circle"></i> Šajā grupā pašlaik nav dalībnieku.
        </p>
      </div>
    </section>
  </div>
</template>

<script>
import axios from "axios";

export default {
  name: "EditGroupView",
  props: {
    // ID grupai, kas tiek rediģēta. Obligāts parametrs.
    groupIdToEdit: {
      type: String,
      required: true,
    },
  },
  data() {
    return {
      // Objekts, kas satur rediģējamās grupas datus.
      group: {
        name: undefined, // Sākotnēji nedefinēts, lai varētu pārbaudīt, vai dati ielādēti
        description: "",
        studyYear: "",
        originalName: "", // Sākotnējais grupas nosaukums, lai parādītu virsrakstā
        members: [], // Grupas dalībnieku ID saraksts
      },
      allUsers: [], // Saraksts ar visiem sistēmas lietotājiem (studentiem), lai atlasītu jaunus dalībniekus
      selectedUserToAdd: "", // Izvēlētā lietotāja ID pievienošanai grupai

      isLoading: false, // Norāda, vai notiek grupas datu saglabāšana
      isFetchingUsers: false, // Norāda, vai notiek visu lietotāju ielāde
      isMemberProcessing: false, // Norāda, vai notiek dalībnieka pievienošana/noņemšana

      initialLoadingError: "", // Kļūdas ziņojums sākotnējai grupas datu ielādei
      errorMessage: "", // Vispārīgs kļūdas ziņojums formas darbībām
      successMessage: "", // Vispārīgs veiksmes ziņojums formas darbībām

      memberActionMessage: null, // Ziņojums par dalībnieku pievienošanas/noņemšanas rezultātu
    };
  },
  computed: {
    // Aprēķinātais īpašums, kas atgriež detalizētu informāciju par pašreizējiem grupas dalībniekiem.
    currentMembersDetails() {
      if (
        !this.group.members || // Ja grupai nav dalībnieku
        this.group.members.length === 0 || // Vai dalībnieku saraksts ir tukšs
        this.allUsers.length === 0 // Vai nav ielādēti visi lietotāji
      ) {
        return []; // Atgriež tukšu masīvu
      }
      // No `group.members` (kas satur tikai ID) izveido masīvu ar pilniem lietotāju objektiem no `allUsers`.
      return this.group.members
        .map((memberId) => {
          return this.allUsers.find((user) => user._id === memberId);
        })
        .filter((user) => user); // Izfiltrē gadījumus, ja kāds lietotājs netika atrasts (drošībai)
    },
    // Aprēķinātais īpašums, kas atgriež sarakstu ar potenciālajiem jaunajiem grupas dalībniekiem (studentiem, kas vēl nav grupā).
    potentialNewMembers() {
      if (this.allUsers.length === 0) return []; // Ja nav ielādēti lietotāji, atgriež tukšu masīvu
      const memberIds = new Set(this.group.members || []); // Izveido Set no esošo dalībnieku ID ātrākai pārbaudei
      // Izfiltrē lietotājus, kas ir studenti un nav jau šajā grupā. Sakārto pēc uzvārda, tad vārda.
      return this.allUsers
        .filter((user) => user.role === "student" && !memberIds.has(user._id))
        .sort(
          (a, b) =>
            a.lastName.localeCompare(b.lastName) ||
            a.firstName.localeCompare(b.firstName)
        );
    },
  },
  watch: {
    // Vēro `groupIdToEdit` parametra izmaiņas.
    groupIdToEdit: {
      immediate: true, // Izpilda arī uzreiz pēc komponenta izveides
      handler(newVal) {
        if (newVal) {
          // Ja ir jauns ID, ielādē grupas datus un visu lietotāju sarakstu.
          this.fetchGroupDetails(newVal);
          this.fetchAllUsers();
        } else {
          this.initialLoadingError = "Grupas ID nav norādīts rediģēšanai.";
        }
      },
    },
  },
  methods: {
    // Ielādē konkrētās grupas detalizēto informāciju.
    async fetchGroupDetails(groupId) {
      this.isLoading = true; // Sāk ielādes stāvokli
      this.initialLoadingError = "";
      this.errorMessage = "";
      this.successMessage = "";
      try {
        const response = await axios.get(`/api/groups/details/${groupId}`);
        // Aizpilda `group` datu objektu ar saņemto informāciju.
        this.group.name = response.data.name;
        this.group.originalName = response.data.name; // Saglabā sākotnējo nosaukumu
        this.group.description = response.data.description || "";
        this.group.studyYear = response.data.studyYear || "";
        this.group.members = response.data.members || []; // Dalībnieku ID saraksts
      } catch (error) {
        console.error("Kļūda ielādējot grupas datus:", error);
        this.initialLoadingError =
          error.response?.data?.msg ||
          "Kļūda ielādējot grupas datus rediģēšanai.";
        // Ja grupa netika atrasta, pēc brīža novirza atpakaļ.
        if (error.response?.status === 404) {
          setTimeout(() => this.$emit("cancelEditGroup"), 3000);
        }
      } finally {
        this.isLoading = false; // Beidz ielādes stāvokli
      }
    },
    // Ielādē visu sistēmas lietotāju sarakstu.
    async fetchAllUsers() {
      this.isFetchingUsers = true; // Sāk lietotāju ielādes stāvokli
      this.memberActionMessage = null; // Notīra iepriekšējos dalībnieku darbību ziņojumus
      try {
        const response = await axios.get("/api/users");
        this.allUsers = response.data; // Saglabā lietotāju sarakstu
      } catch (error) {
        console.error("Kļūda ielādējot visus lietotājus:", error);
        this.memberActionMessage = {
          text: "Neizdevās ielādēt lietotāju sarakstu.",
          type: "error",
        };
      } finally {
        this.isFetchingUsers = false; // Beidz lietotāju ielādes stāvokli
      }
    },
    // Atceļ grupas rediģēšanu un paziņo vecākkomponentam.
    cancelEdit() {
      this.$emit("cancelEditGroup");
    },
    // Validē grupas rediģēšanas formas datus.
    validateForm() {
      this.errorMessage = "";
      this.successMessage = "";
      if (!this.group.name || !this.group.name.trim()) {
        this.errorMessage = "Grupas nosaukums ir obligāts lauks.";
        return false;
      }
      if (this.group.name.length > 50) {
        this.errorMessage =
          "Grupas nosaukums nedrīkst pārsniegt 50 rakstzīmes.";
        return false;
      }
      if (this.group.description && this.group.description.length > 255) {
        this.errorMessage =
          "Grupas apraksts nedrīkst pārsniegt 255 rakstzīmes.";
        return false;
      }
      if (this.group.studyYear && this.group.studyYear.length > 9) {
        this.errorMessage = "Mācību gads nedrīkst pārsniegt 9 rakstzīmes.";
        return false;
      }
      // Pārbauda mācību gada formātu (GGGG/GGGG), ja tas ir ievadīts.
      if (
        this.group.studyYear && // Ja mācību gads ir ievadīts
        !/^\d{4}\/\d{4}$/.test(this.group.studyYear) && // Un tas neatbilst formātam
        this.group.studyYear.trim().length > 0 // Un tas nav tukšs (lai atļautu tukšu neobligātu lauku)
      ) {
        // Var pievienot kļūdas ziņojumu par formātu, ja nepieciešams stingrāka validācija.
        // Piemēram: this.errorMessage = "Mācību gadam jābūt formātā GGGG/GGGG vai tukšam.";
        // return false;
      }
      return true; // Ja visas pārbaudes veiksmīgas
    },
    // Nosūta pieprasījumu grupas datu atjaunināšanai.
    async submitUpdateGroup() {
      if (!this.validateForm()) return; // Pārtrauc, ja validācija neizdodas
      this.isLoading = true;
      this.errorMessage = "";
      this.successMessage = "";
      // Sagatavo datus nosūtīšanai, noņemot liekās atstarpes.
      const updateData = {
        name: this.group.name.trim(),
        description: this.group.description.trim(),
        studyYear: this.group.studyYear.trim(),
      };
      try {
        const response = await axios.put(
          `/api/groups/${this.groupIdToEdit}`,
          updateData
        );
        this.successMessage = response.data.msg; // Parāda veiksmes ziņojumu
        this.group.originalName = this.group.name; // Atjaunina sākotnējo nosaukumu
        // Paziņo vecākkomponentam par veiksmīgu atjaunināšanu.
        this.$emit("groupUpdateSuccess", this.successMessage);
      } catch (error) {
        if (error.response && error.response.data && error.response.data.msg) {
          this.errorMessage = error.response.data.msg;
        } else {
          this.errorMessage = "Kļūda atjauninot grupu. Lūdzu, mēģiniet vēlāk.";
        }
        console.error("Grupas atjaunināšanas kļūda:", error);
      } finally {
        this.isLoading = false; // Beidz ielādes stāvokli
      }
    },
    // Pievieno izvēlēto lietotāju grupai.
    async addMember() {
      if (!this.selectedUserToAdd) return; // Ja nav izvēlēts lietotājs, pārtrauc
      this.isMemberProcessing = true; // Sāk dalībnieka apstrādes stāvokli
      this.memberActionMessage = null; // Notīra iepriekšējo ziņojumu
      try {
        const response = await axios.post(
          `/api/groups/${this.groupIdToEdit}/members`,
          { userId: this.selectedUserToAdd } // Nosūta izvēlētā lietotāja ID
        );
        this.memberActionMessage = { text: response.data.msg, type: "success" };
        // Atjauno grupas datus (ieskaitot dalībnieku sarakstu).
        await this.fetchGroupDetails(this.groupIdToEdit);
        this.selectedUserToAdd = ""; // Notīra izvēlēto lietotāju
      } catch (error) {
        this.memberActionMessage = {
          text: error.response?.data?.msg || "Kļūda pievienojot dalībnieku.",
          type: "error",
        };
        console.error("Kļūda pievienojot dalībnieku:", error);
      } finally {
        this.isMemberProcessing = false; // Beidz dalībnieka apstrādes stāvokli
      }
    },
    // Noņem dalībnieku no grupas.
    async removeMember(userIdToRemove) {
      if (!confirm("Vai tiešām vēlaties noņemt šo dalībnieku no grupas?"))
        return; // Pieprasa apstiprinājumu
      this.isMemberProcessing = true;
      this.memberActionMessage = null;
      try {
        const response = await axios.delete(
          `/api/groups/${this.groupIdToEdit}/members/${userIdToRemove}`
        );
        this.memberActionMessage = { text: response.data.msg, type: "success" };
        // Atjauno grupas datus.
        await this.fetchGroupDetails(this.groupIdToEdit);
      } catch (error) {
        this.memberActionMessage = {
          text: error.response?.data?.msg || "Kļūda noņemot dalībnieku.",
          type: "error",
        };
        console.error("Kļūda noņemot dalībnieku:", error);
      } finally {
        this.isMemberProcessing = false;
      }
    },
  },
};
</script>

<style scoped>
/* Stili tiek mantoti no globālajiem .form-view un .card-style */
/* Grupas rediģēšanas skata galvenā konteinera stils */
.edit-group-view {
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
/* Stils rediģējamās grupas sākotnējam nosaukumam virsrakstā */
.view-title .group-original-name {
  color: var(--primary-color); /* Primārā krāsa nosaukumam */
  font-weight: 500; /* Vieglāks fonta biezums */
  word-break: break-all; /* Pārnes vārdu, ja nosaukums ir ļoti garš */
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
/* Veiksmes un kļūdas ziņojumu ikonu stils */
.success-message .fas,
.error-message .fas,
.success-message-inline .fas,
.error-message-inline .fas {
  margin-right: 0.5em; /* Atstarpe no labās puses ikonai */
}

/* Formas darbību pogu konteinera stils */
.form-actions {
  justify-content: space-between; /* Izlīdzina pogas (Atcelt pa kreisi, Saglabāt pa labi) */
  margin-top: 1.5rem; /* Atstarpe virs pogu bloka */
}

/* Dalībnieku pārvaldības sadaļas stils (izmanto .card-style-inner) */
.member-management-section {
  margin-top: 2rem; /* Atstarpe virs sadaļas */
  padding: 1.5rem; /* Iekšējā atkāpe */
}
/* Dalībnieku pārvaldības sadaļas virsraksta (H4) stils */
.member-management-section h4 {
  font-size: 1.1em; /* Fonta lielums */
  color: var(--header-bg-color); /* Virsraksta krāsa */
  margin-top: 1rem; /* Atstarpe virs virsraksta */
  margin-bottom: 0.75rem; /* Atstarpe zem virsraksta */
  display: flex; /* Izmanto flexbox ikonai un tekstam */
  align-items: center; /* Vertikāli centrē ikonu un tekstu */
  gap: 0.5rem; /* Atstarpe starp ikonu un tekstu */
}
/* Noņem augšējo atstarpi pirmajam H4 virsrakstam dalībnieku pārvaldības sadaļā */
.member-management-section h4:first-of-type {
  margin-top: 0;
}

/* Jauna dalībnieka pievienošanas kontroļu bloka stils */
.add-member-controls {
  margin-bottom: 1.5rem; /* Atstarpe zem bloka */
}
/* Forma jauna dalībnieka izvēlei un pievienošanai */
.add-member-form {
  display: flex; /* Izmanto flexbox elementu izkārtojumam */
  align-items: stretch; /* Nodrošina, ka poga un izvēles lauks ir vienādā augstumā */
  gap: 0.5rem; /* Atstarpe starp izvēles lauku un pogu */
}
/* Izvēles lauks studenta atlasīšanai */
.add-member-form select {
  flex-grow: 1; /* Ļauj izvēles laukam aizpildīt pieejamo vietu */
  /* Izmanto globālos .form-group select stilus */
}
/* Dalībnieka pievienošanas pogas stils */
.add-member-btn {
  padding: 0.75rem 1rem; /* Iekšējā atkāpe, lai atbilstu izvēles lauka augstumam */
  white-space: nowrap; /* Neļauj tekstam pogā pāriet jaunā rindā */
}
/* Veiksmes pogas (piem., Pievienot) stils */
.action-button.success-button {
  background-color: var(--success-color); /* Fona krāsa */
  color: var(--text-color-light); /* Teksta krāsa */
}
/* Veiksmes pogas stils, kad pele ir virs tās (un tā nav atspējota) */
.action-button.success-button:hover:not([disabled]) {
  background-color: #1e7e34; /* Tumšāka fona krāsa */
}

/* Esošo dalībnieku saraksta bloka stils */
.current-members-list {
  margin-top: 1rem; /* Atstarpe virs saraksta */
}
/* Dalībnieku saraksta (ul) stils */
.member-list {
  list-style-type: none; /* Noņem saraksta marķierus */
  padding: 0; /* Noņem iekšējo atkāpi */
  max-height: 350px; /* Palielināts maksimālais augstums */
  overflow-y: auto; /* Pievieno ritjoslu, ja saraksts ir garāks par maksimālo augstumu */
  border: 1px solid var(--border-color); /* Apmale ap sarakstu */
  border-radius: var(--border-radius); /* Noapaļoti stūri */
}
/* Atsevišķa dalībnieka saraksta elementa (li) stils */
.member-list-item {
  display: flex; /* Izmanto flexbox elementu izkārtojumam */
  justify-content: space-between; /* Izlīdzina elementus ar atstarpi starp tiem */
  align-items: center; /* Vertikāli centrē elementus */
  padding: 0.75rem 1rem; /* Iekšējā atkāpe */
  border-bottom: 1px solid #f0f0f0; /* Apakšējā līnija starp elementiem */
  background-color: #fdfdfd; /* Gaišs fons elementam */
}
/* Noņem apakšējo līniju pēdējam saraksta elementam */
.member-list-item:last-child {
  border-bottom: none;
}
/* Dalībnieka vārda un e-pasta stils */
.member-list-item .member-name {
  font-size: 0.95em; /* Fonta lielums */
  color: var(--text-color); /* Teksta krāsa */
  display: flex; /* Izmanto flexbox ikonai un tekstam */
  align-items: center; /* Vertikāli centrē ikonu un tekstu */
  gap: 0.5rem; /* Atstarpe starp ikonu un tekstu */
}
/* Dalībnieka ikonas stils */
.member-list-item .member-name .fas {
  color: var(--secondary-color); /* Sekundārā krāsa ikonai */
}

/* Dalībnieka noņemšanas pogas stils */
.remove-member-btn {
  padding: 0.4rem 0.6rem; /* Iekšējā atkāpe */
  font-size: 0.85em; /* Fonta lielums */
  border-radius: var(--border-radius); /* Noapaļoti stūri */
  line-height: 1; /* Rindstarpa ikonai pogā */
}
/* Mazas bīstamības pogas (piem., Noņemt) stils */
.action-button-small.danger-button {
  background-color: var(--danger-color); /* Fona krāsa */
  color: var(--text-color-light); /* Teksta krāsa */
}
/* Mazas bīstamības pogas stils, kad pele ir virs tās (un tā nav atspējota) */
.action-button-small.danger-button:hover:not([disabled]) {
  background-color: #c82333; /* Tumšāka fona krāsa */
}

/* Informatīvā teksta ziņojuma stils (piem., ja nav lietotāju, ko pievienot) */
.info-text-message {
  font-size: 0.9em; /* Fonta lielums */
  color: #6c757d; /* Teksta krāsa */
  padding: 0.75rem; /* Iekšējā atkāpe */
  text-align: center; /* Teksta līdzināšana centrā */
  background-color: #f8f9fa; /* Gaišs fons */
  border: 1px dashed var(--border-color); /* Pārtraukta līnija apmalei */
  border-radius: var(--border-radius); /* Noapaļoti stūri */
  margin-top: 0.5rem; /* Atstarpe virs ziņojuma */
  display: flex; /* Izmanto flexbox ikonai un tekstam */
  align-items: center; /* Vertikāli centrē ikonu un tekstu */
  justify-content: center; /* Horizontāli centrē ikonu un tekstu */
  gap: 0.4rem; /* Atstarpe starp ikonu un tekstu */
}

/* Maza ielādes indikatora stils */
.loading-indicator.small {
  font-size: 0.95em; /* Fonta lielums */
  padding: 0.5rem; /* Iekšējā atkāpe */
}
/* Veiksmes un kļūdas ziņojumu stils, kas tiek rādīti blakus darbībām (inline) */
.success-message-inline,
.error-message-inline {
  padding: 0.75rem 1rem; /* Iekšējā atkāpe */
  margin-top: 0.75rem; /* Atstarpe virs ziņojuma */
  border-radius: var(--border-radius); /* Noapaļoti stūri */
  font-size: 0.9em; /* Fonta lielums */
  text-align: center; /* Teksta līdzināšana centrā */
  display: flex; /* Izmanto flexbox ikonai un tekstam */
  align-items: center; /* Vertikāli centrē ikonu un tekstu */
  justify-content: center; /* Horizontāli centrē ikonu un tekstu */
}

/* Stili maziem ekrāniem */
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
  .add-member-form {
    /* Pārkārto dalībnieka pievienošanas formu vertikāli */
    flex-direction: column;
  }
  .add-member-form .action-button {
    width: 100%; /* Poga aizņem visu platumu */
  }
}
</style>
