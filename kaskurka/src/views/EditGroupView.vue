<template>
  <div class="form-view edit-group-view">
    <button
      @click="cancelEdit"
      class="back-button"
      :disabled="isLoading || isMemberProcessing"
    >
      ← Atpakaļ uz Grupu Pārvaldību
    </button>
    <h2>Rediģēt Grupu: {{ group.originalName || "Notiek ielāde..." }}</h2>

    <div v-if="initialLoadingError" class="error-message">
      {{ initialLoadingError }}
    </div>

    <form
      @submit.prevent="submitUpdateGroup"
      class="edit-group-form"
      v-if="!initialLoadingError && group.name !== undefined"
    >
      <div class="form-group">
        <label for="groupName"
          >Grupas Nosaukums: <span class="required-field">*</span></label
        >
        <input
          type="text"
          id="groupName"
          v-model="group.name"
          required
          maxlength="50"
          :disabled="isLoading"
        />
        <small>Piemēram, DT3-1, Programmešana P1 (līdz 50 rakstzīmēm)</small>
      </div>

      <div class="form-group">
        <label for="groupDescription">Grupas Apraksts:</label>
        <textarea
          id="groupDescription"
          v-model="group.description"
          maxlength="255"
          :disabled="isLoading"
        ></textarea>
        <small
          >Īss apraksts par grupu (līdz 255 rakstzīmēm). Atstājiet tukšu, lai
          saglabātu esošo, ja tas nav definēts.</small
        >
      </div>

      <div class="form-group">
        <label for="studyYear">Mācību Gads:</label>
        <input
          type="text"
          id="studyYear"
          v-model="group.studyYear"
          placeholder="GGGG/GGGG"
          maxlength="9"
          :disabled="isLoading"
        />
        <small
          >Piemēram, 2023/2024 (līdz 9 rakstzīmēm). Atstājiet tukšu, lai
          saglabātu esošo, ja tas nav definēts.</small
        >
      </div>

      <div v-if="successMessage" class="success-message">
        {{ successMessage }}
      </div>
      <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>

      <div class="form-actions">
        <button
          type="button"
          @click="cancelEdit"
          class="action-button secondary-action"
          :disabled="isLoading"
        >
          Atcelt
        </button>
        <span></span>
        <button type="submit" class="action-button" :disabled="isLoading">
          {{ isLoading ? "Saglabā..." : "Saglabāt Grupas Datus" }}
        </button>
      </div>
    </form>

    <!-- Member Management Section -->
    <section
      class="member-management-section"
      v-if="!initialLoadingError && group.name !== undefined"
    >
      <hr class="form-divider" />
      <h3>Grupas Dalībnieku Pārvaldība</h3>

      <div v-if="isMemberProcessing" class="loading-message small">
        Apstrādā dalībnieku...
      </div>
      <div
        v-if="memberActionMessage"
        :class="
          memberActionMessage.type === 'success'
            ? 'success-message-inline'
            : 'error-message-inline'
        "
      >
        {{ memberActionMessage.text }}
      </div>

      <h4>Pievienot Jaunu Dalībnieku (Studentu)</h4>
      <div class="add-member-form form-group">
        <select
          v-model="selectedUserToAdd"
          :disabled="isMemberProcessing || potentialNewMembers.length === 0"
        >
          <option disabled value="">Izvēlieties studentu, ko pievienot</option>
          <option
            v-for="user in potentialNewMembers"
            :key="user._id"
            :value="user._id"
          >
            {{ user.firstName }} {{ user.lastName }} ({{ user.email }})
          </option>
        </select>
        <button
          @click="addMember"
          class="action-button-small"
          :disabled="!selectedUserToAdd || isMemberProcessing"
        >
          Pievienot Dalībnieku
        </button>
        <p
          v-if="potentialNewMembers.length === 0 && !isFetchingUsers"
          class="info-message"
        >
          Visi studenti jau ir šajā grupā vai nav pieejamu studentu.
        </p>
      </div>

      <h4>Esošie Dalībnieki ({{ currentMembersDetails.length }})</h4>
      <div v-if="isFetchingUsers" class="loading-message small">
        Ielādē lietotājus...
      </div>
      <ul v-if="currentMembersDetails.length > 0" class="member-list">
        <li
          v-for="member in currentMembersDetails"
          :key="member._id"
          class="member-list-item"
        >
          <span
            >{{ member.firstName }} {{ member.lastName }} ({{
              member.email
            }})</span
          >
          <button
            @click="removeMember(member._id)"
            class="action-button-small delete"
            :disabled="isMemberProcessing"
          >
            Noņemt
          </button>
        </li>
      </ul>
      <p v-else-if="!isFetchingUsers" class="info-message">
        Šajā grupā pašlaik nav dalībnieku.
      </p>
    </section>
  </div>
</template>

<script>
import axios from "axios";

export default {
  name: "EditGroupView",
  props: {
    groupIdToEdit: {
      type: String,
      required: true,
    },
  },
  data() {
    return {
      group: {
        // For group details editing
        name: undefined, // Use undefined to check if loaded
        description: "",
        studyYear: "",
        originalName: "",
        members: [], // Array of member IDs
      },
      allUsers: [], // For member management dropdown
      selectedUserToAdd: "", // ID of user selected from dropdown

      isLoading: false, // For group details form
      isFetchingUsers: false, // For fetching all users list
      isMemberProcessing: false, // For add/remove member actions

      initialLoadingError: "",
      errorMessage: "", // For group details form errors
      successMessage: "", // For group details form success

      memberActionMessage: null, // { text: '', type: 'success/error' } for member actions
    };
  },
  computed: {
    currentMembersDetails() {
      if (
        !this.group.members ||
        this.group.members.length === 0 ||
        this.allUsers.length === 0
      ) {
        return [];
      }
      return this.group.members
        .map((memberId) => {
          return this.allUsers.find((user) => user._id === memberId);
        })
        .filter((user) => user); // Filter out any undefined if a memberId isn't in allUsers (should not happen)
    },
    potentialNewMembers() {
      if (this.allUsers.length === 0) return [];
      const memberIds = new Set(this.group.members || []);
      return this.allUsers.filter(
        (user) => user.role === "student" && !memberIds.has(user._id)
      );
    },
  },
  watch: {
    groupIdToEdit: {
      immediate: true,
      handler(newVal) {
        if (newVal) {
          this.fetchGroupDetails(newVal);
          this.fetchAllUsers(); // Also fetch all users for member management
        } else {
          this.initialLoadingError = "Grupas ID nav norādīts rediģēšanai.";
        }
      },
    },
  },
  methods: {
    async fetchGroupDetails(groupId) {
      this.isLoading = true; // For group details part
      this.initialLoadingError = "";
      this.errorMessage = "";
      this.successMessage = "";
      try {
        const response = await axios.get(`/api/groups/details/${groupId}`);
        this.group.name = response.data.name;
        this.group.originalName = response.data.name;
        this.group.description = response.data.description || "";
        this.group.studyYear = response.data.studyYear || "";
        this.group.members = response.data.members || []; // Ensure members array is present
      } catch (error) {
        console.error("Error fetching group details:", error);
        this.initialLoadingError =
          error.response?.data?.msg ||
          "Kļūda ielādējot grupas datus rediģēšanai.";
        if (error.response?.status === 404) {
          setTimeout(() => this.$emit("cancelEditGroup"), 3000);
        }
      } finally {
        this.isLoading = false;
      }
    },
    async fetchAllUsers() {
      this.isFetchingUsers = true;
      this.memberActionMessage = null;
      try {
        const response = await axios.get("/api/users"); // Admin route to get all users
        this.allUsers = response.data;
      } catch (error) {
        console.error("Error fetching all users:", error);
        this.memberActionMessage = {
          text: "Neizdevās ielādēt lietotāju sarakstu.",
          type: "error",
        };
      } finally {
        this.isFetchingUsers = false;
      }
    },
    cancelEdit() {
      this.$emit("cancelEditGroup");
    },
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
      return true;
    },
    async submitUpdateGroup() {
      if (!this.validateForm()) return;
      this.isLoading = true;
      this.errorMessage = "";
      this.successMessage = "";
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
        this.successMessage = response.data.msg;
        this.group.originalName = this.group.name; // Update original name on successful save
        // Do not navigate away immediately, allow member management.
        // Alerting is handled by App.vue through event.
        // this.$emit("groupUpdateSuccess", this.successMessage);
      } catch (error) {
        if (error.response && error.response.data && error.response.data.msg) {
          this.errorMessage = error.response.data.msg;
        } else {
          this.errorMessage = "Kļūda atjauninot grupu. Lūdzu, mēģiniet vēlāk.";
        }
        console.error("Group update error:", error);
      } finally {
        this.isLoading = false;
      }
    },

    // Member Management Methods
    async addMember() {
      if (!this.selectedUserToAdd) return;
      this.isMemberProcessing = true;
      this.memberActionMessage = null;
      try {
        const response = await axios.post(
          `/api/groups/${this.groupIdToEdit}/members`,
          { userId: this.selectedUserToAdd }
        );
        this.memberActionMessage = { text: response.data.msg, type: "success" };
        // Refresh group details to get updated members list
        await this.fetchGroupDetails(this.groupIdToEdit);
        this.selectedUserToAdd = ""; // Clear selection
      } catch (error) {
        this.memberActionMessage = {
          text: error.response?.data?.msg || "Kļūda pievienojot dalībnieku.",
          type: "error",
        };
        console.error("Error adding member:", error);
      } finally {
        this.isMemberProcessing = false;
      }
    },
    async removeMember(userIdToRemove) {
      if (!confirm("Vai tiešām vēlaties noņemt šo dalībnieku no grupas?"))
        return;
      this.isMemberProcessing = true;
      this.memberActionMessage = null;
      try {
        const response = await axios.delete(
          `/api/groups/${this.groupIdToEdit}/members/${userIdToRemove}`
        );
        this.memberActionMessage = { text: response.data.msg, type: "success" };
        await this.fetchGroupDetails(this.groupIdToEdit); // Refresh group details
      } catch (error) {
        this.memberActionMessage = {
          text: error.response?.data?.msg || "Kļūda noņemot dalībnieku.",
          type: "error",
        };
        console.error("Error removing member:", error);
      } finally {
        this.isMemberProcessing = false;
      }
    },
  },
};
</script>

<style scoped>
.edit-group-view h2 {
  margin-top: 0;
  font-size: 1.4em; /* Adjust if group name is long */
  word-break: break-word;
}
.secondary-action {
  background-color: #6c757d;
}
.secondary-action:hover:not([disabled]) {
  background-color: #5a6268;
}

.form-divider {
  margin-top: 30px;
  margin-bottom: 20px;
  border: 0;
  border-top: 1px solid #eee;
}

.member-management-section h3 {
  font-size: 1.2em;
  color: #34495e;
  margin-bottom: 15px;
  padding-bottom: 5px;
  border-bottom: 1px dotted #bdc3c7;
}
.member-management-section h4 {
  font-size: 1.1em;
  color: #2c3e50;
  margin-top: 20px;
  margin-bottom: 10px;
}
.add-member-form {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
}
.add-member-form select {
  flex-grow: 1;
  padding: 10px; /* Make select a bit smaller than default input */
}
.add-member-form .action-button-small {
  padding: 10px 15px; /* Match select padding */
  background-color: #28a745; /* Green for add */
}
.add-member-form .action-button-small:hover:not([disabled]) {
  background-color: #218838;
}

.member-list {
  list-style-type: none;
  padding: 0;
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #eee;
  border-radius: 4px;
}
.member-list-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  border-bottom: 1px solid #f0f0f0;
}
.member-list-item:last-child {
  border-bottom: none;
}
.member-list-item span {
  font-size: 0.95em;
}
.member-list-item .action-button-small.delete {
  background-color: #d9534f;
}
.member-list-item .action-button-small.delete:hover:not([disabled]) {
  background-color: #c9302c;
}
.info-message {
  font-size: 0.9em;
  color: #7f8c8d;
  padding: 10px;
  text-align: center;
}
.loading-message.small,
.error-message.small {
  padding: 10px;
  font-size: 0.9em;
}
.success-message-inline,
.error-message-inline {
  padding: 8px;
  margin-top: 10px;
  margin-bottom: 10px; /* Added margin bottom */
  border-radius: 4px;
  font-size: 0.9em;
  text-align: center;
}
.success-message-inline {
  background-color: #e6ffed;
  color: #2ecc71;
  border: 1px solid #2ecc71;
}
.error-message-inline {
  background-color: #fdd;
  color: #e74c3c;
  border: 1px solid #e74c3c;
}

.action-button-small {
  /* General styling for small buttons if not already global */
  padding: 6px 12px;
  font-size: 0.85em;
  border-radius: 4px;
  cursor: pointer;
  border: none;
  color: white;
}
.action-button-small[disabled] {
  background-color: #bdc3c7 !important; /* Ensure disabled style overrides */
  cursor: not-allowed;
  opacity: 0.7;
}
</style>
