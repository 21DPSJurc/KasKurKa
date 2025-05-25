<template>
  <div class="form-view edit-group-view card-style">
    <button
      @click="cancelEdit"
      class="back-button"
      :disabled="isLoading || isMemberProcessing || initialLoadingError"
    >
      <i class="fas fa-arrow-left"></i> Atpakaļ uz Grupu Pārvaldību
    </button>
    <h2 class="view-title">
      <i class="fas fa-edit"></i> Rediģēt Grupu:
      <span class="group-original-name">{{
        group.originalName || "Notiek ielāde..."
      }}</span>
    </h2>

    <div v-if="initialLoadingError" class="error-message">
      <i class="fas fa-exclamation-triangle"></i> {{ initialLoadingError }}
    </div>

    <form
      @submit.prevent="submitUpdateGroup"
      class="edit-group-form"
      v-if="!initialLoadingError && group.name !== undefined"
    >
      <h3 class="form-section-title">
        <i class="fas fa-info-circle"></i> Grupas Pamatinformācija
      </h3>
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

      <div v-if="successMessage" class="success-message">
        <i class="fas fa-check-circle"></i> {{ successMessage }}
      </div>
      <div v-if="errorMessage" class="error-message">
        <i class="fas fa-exclamation-triangle"></i> {{ errorMessage }}
      </div>

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
          {{ isLoading ? "Saglabā..." : "Saglabāt Grupas Datus" }}
        </button>
      </div>
    </form>

    <!-- Member Management Section -->
    <section
      class="member-management-section card-style-inner"
      v-if="!initialLoadingError && group.name !== undefined"
    >
      <h3 class="form-section-title">
        <i class="fas fa-users-cog"></i> Grupas Dalībnieku Pārvaldība
      </h3>

      <div v-if="isMemberProcessing" class="loading-indicator small">
        <i class="fas fa-spinner fa-spin"></i> Apstrādā dalībnieku...
      </div>
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

      <div class="add-member-controls">
        <h4><i class="fas fa-user-plus"></i> Pievienot Jaunu Dalībnieku</h4>
        <div class="add-member-form form-group">
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
          <button
            @click="addMember"
            class="action-button success-button add-member-btn"
            :disabled="!selectedUserToAdd || isMemberProcessing"
          >
            <i class="fas fa-plus"></i> Pievienot
          </button>
        </div>
        <p
          v-if="potentialNewMembers.length === 0 && !isFetchingUsers"
          class="info-text-message"
        >
          <i class="fas fa-info-circle"></i> Visi studenti jau ir šajā grupā vai
          nav pieejamu studentu sarakstā.
        </p>
      </div>

      <div class="current-members-list">
        <h4>
          <i class="fas fa-list-ul"></i> Esošie Dalībnieki ({{
            currentMembersDetails.length
          }})
        </h4>
        <div v-if="isFetchingUsers" class="loading-indicator small">
          <i class="fas fa-spinner fa-spin"></i> Ielādē lietotājus...
        </div>
        <ul v-if="currentMembersDetails.length > 0" class="member-list">
          <li
            v-for="member in currentMembersDetails"
            :key="member._id"
            class="member-list-item"
          >
            <span class="member-name"
              ><i class="fas fa-user"></i> {{ member.firstName }}
              {{ member.lastName }} ({{ member.email }})</span
            >
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
        <p v-else-if="!isFetchingUsers" class="info-text-message">
          <i class="fas fa-info-circle"></i> Šajā grupā pašlaik nav dalībnieku.
        </p>
      </div>
    </section>
  </div>
</template>

<script>
// Script section remains the same as previously provided
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
        name: undefined,
        description: "",
        studyYear: "",
        originalName: "",
        members: [],
      },
      allUsers: [],
      selectedUserToAdd: "",

      isLoading: false,
      isFetchingUsers: false,
      isMemberProcessing: false,

      initialLoadingError: "",
      errorMessage: "",
      successMessage: "",

      memberActionMessage: null,
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
        .filter((user) => user);
    },
    potentialNewMembers() {
      if (this.allUsers.length === 0) return [];
      const memberIds = new Set(this.group.members || []);
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
    groupIdToEdit: {
      immediate: true,
      handler(newVal) {
        if (newVal) {
          this.fetchGroupDetails(newVal);
          this.fetchAllUsers();
        } else {
          this.initialLoadingError = "Grupas ID nav norādīts rediģēšanai.";
        }
      },
    },
  },
  methods: {
    async fetchGroupDetails(groupId) {
      this.isLoading = true;
      this.initialLoadingError = "";
      this.errorMessage = "";
      this.successMessage = "";
      try {
        const response = await axios.get(`/api/groups/details/${groupId}`);
        this.group.name = response.data.name;
        this.group.originalName = response.data.name;
        this.group.description = response.data.description || "";
        this.group.studyYear = response.data.studyYear || "";
        this.group.members = response.data.members || [];
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
        const response = await axios.get("/api/users");
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
      if (
        this.group.studyYear &&
        !/^\d{4}\/\d{4}$/.test(this.group.studyYear) &&
        this.group.studyYear.trim().length > 0
      ) {
        // this.errorMessage = "Mācību gadam jābūt formātā GGGG/GGGG vai tukšam.";
        // return false;
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
        this.group.originalName = this.group.name;
        // To reflect changes if user navigates away and back:
        this.$emit("groupUpdateSuccess", this.successMessage); // Notify App.vue or parent
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
        await this.fetchGroupDetails(this.groupIdToEdit);
        this.selectedUserToAdd = "";
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
        await this.fetchGroupDetails(this.groupIdToEdit);
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
/* .edit-group-view inherits .form-view and .card-style from global */
.edit-group-view {
  padding: 1.5rem;
}
.view-title {
  color: var(--header-bg-color);
  margin: 0 0 1.5rem 0;
  font-size: 1.8rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  text-align: center; /* For multi-line titles */
}
.view-title .group-original-name {
  color: var(--primary-color);
  font-weight: 500;
  word-break: break-all; /* If name is very long */
}

.form-section-title {
  font-size: 1.2rem; /* Increased size */
  color: var(--primary-color); /* Use primary color */
  margin-top: 2rem; /* More space before section */
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.form-section-title:first-of-type {
  margin-top: 0; /* No top margin for the very first section title */
}

.form-icon {
  margin-right: 0.5em;
  color: var(--primary-color);
  opacity: 0.7;
}
.success-message .fas,
.error-message .fas,
.success-message-inline .fas,
.error-message-inline .fas {
  margin-right: 0.5em;
}

.form-actions {
  justify-content: space-between;
  margin-top: 1.5rem;
}

.member-management-section {
  /* Uses .card-style-inner */
  margin-top: 2rem;
  padding: 1.5rem;
}
.member-management-section h4 {
  font-size: 1.1em;
  color: var(--header-bg-color);
  margin-top: 1rem;
  margin-bottom: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.member-management-section h4:first-of-type {
  margin-top: 0;
}

.add-member-controls {
  margin-bottom: 1.5rem;
}
.add-member-form {
  display: flex;
  align-items: stretch; /* Make button and select same height */
  gap: 0.5rem;
}
.add-member-form select {
  flex-grow: 1;
  /* Uses global form-group select styles */
}
.add-member-btn {
  /* Uses global .action-button .success-button */
  padding: 0.75rem 1rem; /* Match select padding */
  white-space: nowrap;
}
.action-button.success-button {
  background-color: var(--success-color);
  color: var(--text-color-light);
}
.action-button.success-button:hover:not([disabled]) {
  background-color: #1e7e34;
}

.current-members-list {
  margin-top: 1rem;
}
.member-list {
  list-style-type: none;
  padding: 0;
  max-height: 350px; /* Increased height */
  overflow-y: auto;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
}
.member-list-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #f0f0f0;
  background-color: #fdfdfd;
}
.member-list-item:last-child {
  border-bottom: none;
}
.member-list-item .member-name {
  font-size: 0.95em;
  color: var(--text-color);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.member-list-item .member-name .fas {
  color: var(--secondary-color);
}

.remove-member-btn {
  /* Uses .action-button-small .danger-button from global/other views if defined */
  /* Or define here if specific: */
  padding: 0.4rem 0.6rem;
  font-size: 0.85em;
  border-radius: var(--border-radius);
  line-height: 1; /* For icon-only button */
}
.action-button-small.danger-button {
  background-color: var(--danger-color);
  color: var(--text-color-light);
}
.action-button-small.danger-button:hover:not([disabled]) {
  background-color: #c82333;
}

.info-text-message {
  /* For messages like 'no users to add' or 'no members' */
  font-size: 0.9em;
  color: #6c757d;
  padding: 0.75rem;
  text-align: center;
  background-color: #f8f9fa;
  border: 1px dashed var(--border-color);
  border-radius: var(--border-radius);
  margin-top: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
}

.loading-indicator.small {
  font-size: 0.95em;
  padding: 0.5rem;
}
.success-message-inline,
.error-message-inline {
  padding: 0.75rem 1rem;
  margin-top: 0.75rem;
  border-radius: var(--border-radius);
  font-size: 0.9em;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
}

@media (max-width: 600px) {
  .form-actions {
    flex-direction: column-reverse;
  }
  .form-actions .action-button {
    width: 100%;
  }
  .form-actions .secondary-button {
    margin-bottom: 0.75rem;
  }
  .add-member-form {
    flex-direction: column;
  }
  .add-member-form .action-button {
    width: 100%;
  }
}
</style>
