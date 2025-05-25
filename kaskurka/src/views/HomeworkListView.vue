<!-- kaskurka/src/views/HomeworkListView.vue -->
<template>
  <div class="homework-list-view card-style">
    <button @click="goBackToDashboard" class="back-button" :disabled="isLoading || isUpdatingProgress || isDeleting">
      <i class="fas fa-arrow-left"></i> Atpakaļ uz Paneli
    </button>
    <h2 class="view-title"><i class="fas fa-clipboard-list"></i> Darbu Saraksts</h2>

    <div class="filters-panel card-style-inner">
      <h3 class="filters-title"><i class="fas fa-filter"></i> Filtri un Kārtošana</h3>
      <div class="filters-grid">
        <div class="form-group">
          <label for="typeFilter">Tips:</label>
          <select id="typeFilter" v-model="typeFilter" :disabled="isLoading || isUpdatingProgress || isDeleting">
            <option value="">Visi Tipi</option>
            <option value="homework">Mājasdarbi</option>
            <option value="test">Pārbaudes Darbi</option>
          </select>
        </div>
        <div class="form-group">
          <label for="subjectFilter">Priekšmets:</label>
          <input type="text" id="subjectFilter" v-model="subjectFilter" @input="applyFiltersDebounced" placeholder="Meklēt priekšmetu..." :disabled="isLoading || isUpdatingProgress || isDeleting" />
        </div>
         <div class="form-group">
          <label for="groupFilter">Grupa:</label>
          <select id="groupFilter" v-model="groupFilter" :disabled="isLoading || isUpdatingProgress || isDeleting || uniqueCustomGroupNames.length <= 1">
            <option value="">Visas Manas Grupas</option>
            <option v-for="groupName in uniqueCustomGroupNames" :key="groupName" :value="groupName">
              {{ groupName }}
            </option>
          </select>
        </div>
        <div class="form-group">
          <label for="sortBy">Kārtot pēc:</label>
          <select id="sortBy" v-model="sortBy" :disabled="isLoading || isUpdatingProgress || isDeleting">
            <option value="date_desc">Datums (Tuvākie)</option>
            <option value="date_asc">Datums (Tālākie)</option>
            <option value="subject_asc">Priekšmets (A-Z)</option>
            <option value="subject_desc">Priekšmets (Z-A)</option>
            <option value="added_desc">Pievienošanas datums (Jaunākie)</option>
          </select>
        </div>
      </div>
    </div>

    <div v-if="isLoading" class="loading-indicator"><i class="fas fa-spinner fa-spin"></i> Notiek ielāde...</div>
    <div v-else-if="errorMessage" class="error-message"><i class="fas fa-exclamation-triangle"></i> {{ errorMessage }}</div>
    <div v-else-if="filteredAndSortedItems.length === 0" class="empty-list-message card-style-inner">
      <i class="fas fa-folder-open fa-3x"></i>
      <p>Pēc jūsu izvēlētajiem kritērijiem nekas nav atrasts, vai arī saraksts ir tukšs.</p>
      <p v-if="typeFilter || subjectFilter || groupFilter">Mēģiniet mainīt filtru iestatījumus.</p>
    </div>
    
    <div v-else class="items-container">
      <div v-for="item in filteredAndSortedItems" :key="item._id" 
           class="list-item card-style-inner" 
           :class="[item.type, { 'item-done': item.isDone }]"
      >
        <div class="item-main-info">
            <div class="item-type-icon" :class="item.type">
                <i :class="item.type === 'homework' ? 'fas fa-book-reader' : 'fas fa-feather-alt'"></i>
            </div>
            <div class="item-details">
                <h3 class="item-subject">{{ item.subject }}</h3>
                <span class="item-type-badge" :class="item.type">{{ item.type === 'homework' ? 'Mājasdarbs' : 'Pārbaudes Darbs' }}</span>
                <p class="item-date">
                    <i class="fas fa-calendar-alt"></i>
                    {{ item.type === 'homework' ? 'Termiņš' : 'Norise' }}: 
                    <strong>{{ formatDate(item.type === 'homework' ? item.dueDate : item.eventDate) }}</strong>
                    <span v-if="item.type === 'test' && item.eventTime">, {{ item.eventTime }}</span>
                </p>
                 <p class="item-group-display"><i class="fas fa-layer-group"></i> Grupa: {{ item.customGroupName || 'Nezināma' }}</p>
            </div>
        </div>
        
        <div class="item-content collapsible-content" :class="{ 'expanded': item.expanded }">
          <p class="item-description"><strong>Apraksts:</strong> {{ item.description || item.topics || 'Nav norādīts' }}</p>
          <p v-if="item.additionalInfo" class="item-additional-info"><strong>Papildus Info:</strong> {{ item.additionalInfo }}</p>
          
          <div v-if="item.links && item.links.length > 0" class="item-links">
            <strong><i class="fas fa-link"></i> Saites:</strong>
            <ul><li v-for="(link, index) in item.links" :key="index"><a :href="link" target="_blank" rel="noopener noreferrer">{{ link }}</a></li></ul>
          </div>
          
          <div v-if="item.fileAttachments && item.fileAttachments.length > 0" class="item-files">
            <strong><i class="fas fa-paperclip"></i> Pievienotie Faili:</strong>
            <ul><li v-for="(file, index) in item.fileAttachments" :key="index" class="file-entry"><i class="fas fa-file"></i> {{ file.originalName }} <span class="file-size">({{ (file.size / 1024).toFixed(2) }} KB)</span></li></ul>
          </div>
          
          <div class="item-meta">
            <p class="item-author"><i class="fas fa-user-edit"></i> Pievienoja: {{ item.userFirstName }} ({{ item.userGroup }})</p>
            <p class="item-added-date"><i class="fas fa-clock"></i> Pievienots: {{ formatDate(item.createdAt, true) }}</p>
          </div>
        </div>

        <div class="item-actions-footer">
            <div class="main-actions">
                <label class="progress-checkbox-label" :for="'progress-' + item._id" title="Atzīmēt kā izpildītu/neizpildītu">
                    <input type="checkbox" :id="'progress-' + item._id" :checked="item.isDone" @change="toggleProgress(item)" :disabled="isUpdatingProgress || isDeleting || isCommentingBusy(item._id)"/>
                    <i :class="item.isDone ? 'fas fa-check-square' : 'far fa-square'"></i>
                    <span>{{ item.isDone ? 'Izpildīts' : 'Nav Izpildīts' }}</span>
                </label>
                <button @click="toggleItemExpansion(item._id)" class="action-button-small expand-toggle" :title="item.expanded ? 'Slēpt detaļas' : 'Rādīt detaļas'">
                    <i :class="item.expanded ? 'fas fa-chevron-up' : 'fas fa-chevron-down'"></i> {{ item.expanded ? 'Mazāk' : 'Vairāk' }}
                </button>
            </div>
            <div class="contextual-actions">
                <button @click="toggleComments(item._id)" class="action-button-small comments-toggle" :disabled="isCommentingBusy(item._id)" :title="itemComments[item._id] && itemComments[item._id].show ? 'Slēpt komentārus' : 'Rādīt/Pievienot komentārus'">
                    <i class="fas fa-comments"></i> Komentāri
                    <span v-if="itemComments[item._id] && itemComments[item._id].list.length > 0" class="comment-count"> ({{ itemComments[item._id].list.length }})</span>
                </button>
                <div v-if="currentUserId && (item.userId === currentUserId || currentUserRole === 'admin')" class="owner-admin-actions">
                    <button @click="editItem(item)" class="action-button-small edit-btn" :disabled="isUpdatingProgress || isDeleting || isCommentingBusy(item._id)" title="Rediģēt"><i class="fas fa-edit"></i></button>
                    <button @click="confirmDeleteItem(item)" class="action-button-small delete-btn" :disabled="isUpdatingProgress || isDeleting || isCommentingBusy(item._id)" title="Dzēst"><i class="fas fa-trash-alt"></i></button>
                </div>
            </div>
        </div>
        
        <div v-if="itemComments[item._id] && itemComments[item._id].show" class="comments-area-wrapper">
            <div class="comments-area card-style-inner">
                <h4><i class="fas fa-comment-dots"></i> Komentāri par "{{ item.subject }}"</h4>
                <div v-if="itemComments[item._id].isLoading" class="loading-indicator small"><i class="fas fa-spinner fa-spin"></i> Notiek komentāru ielāde...</div>
                <div v-if="itemComments[item._id].error" class="error-message small"><i class="fas fa-exclamation-triangle"></i> {{ itemComments[item._id].error }}</div>
                
                <div v-if="!itemComments[item._id].isLoading && itemComments[item._id].list.length === 0 && !itemComments[item._id].error" class="no-comments">
                    <i class="fas fa-comment-slash"></i> Nav komentāru. Esi pirmais!
                </div>
                <ul v-else-if="!itemComments[item._id].isLoading" class="comments-list">
                    <li v-for="comment in itemComments[item._id].list" :key="comment._id" class="comment-item">
                        <p class="comment-text">{{ comment.text }}</p>
                        <p class="comment-meta">
                            <span><i class="fas fa-user"></i> {{ comment.userName }}</span>
                            <span><i class="fas fa-clock"></i> {{ formatDate(comment.createdAt, true) }}</span>
                            <button 
                                v-if="currentUserId === comment.userId || currentUserRole === 'admin'" 
                                @click="deleteComment(item._id, comment._id)" 
                                class="delete-comment-btn"
                                :disabled="isCommentingBusy(item._id)"
                                title="Dzēst komentāru"><i class="fas fa-times-circle"></i></button>
                        </p>
                    </li>
                </ul>

                <form @submit.prevent="addComment(item._id)" class="add-comment-form">
                    <textarea v-model="newCommentText[item._id]" placeholder="Rakstiet savu komentāru šeit..." rows="3" :disabled="isCommentingBusy(item._id)"></textarea>
                    <button type="submit" class="action-button primary-button" :disabled="!newCommentText[item._id] || !newCommentText[item._id].trim() || isCommentingBusy(item._id)">
                        <i class="fas fa-paper-plane"></i> Pievienot Komentāru
                    </button>
                </form>
            </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';
import _ from 'lodash';

export default {
  name: "HomeworkListView",
  props: {
      currentUserId: String,
      currentUserRole: String,
  },
  data() {
    return {
      allItems: [], 
      userProgress: {}, 
      itemComments: {}, 
      newCommentText: {}, 
      commentingBusyStates: {}, 
      isLoading: true,
      isUpdatingProgress: false,
      isDeleting: false, 
      errorMessage: "",
      typeFilter: "", 
      subjectFilter: "",
      groupFilter: "",
      sortBy: "date_desc", 
      applyFiltersDebounced: null,
    };
  },
  computed: {
    uniqueCustomGroupNames() {
      const groupNames = new Set();
      this.allItems.forEach(item => {
        if (item.customGroupName && item.customGroupName !== 'Nezināma grupa') {
          groupNames.add(item.customGroupName);
        }
      });
      return Array.from(groupNames).sort();
    },
    filteredAndSortedItems() { 
      let itemsToDisplay = this.allItems
        .map(item => ({
          ...item, 
          isDone: !!this.userProgress[item._id],
        }))
        .filter(item => {
          if (this.typeFilter && item.type !== this.typeFilter) return false;
          if (this.subjectFilter.trim()) {
            const subjectQuery = this.subjectFilter.trim().toLowerCase();
            if (!item.subject.toLowerCase().includes(subjectQuery)) return false;
          }
          if (this.groupFilter && item.customGroupName !== this.groupFilter) return false;
          return true;
        })
        .sort((a, b) => {
          const dateA = new Date(a.type === 'homework' ? a.dueDate : a.eventDate);
          const dateB = new Date(b.type === 'homework' ? b.dueDate : b.eventDate);
          const createdA = new Date(a.createdAt);
          const createdB = new Date(b.createdAt);

          switch (this.sortBy) {
            case 'date_asc': return dateA - dateB;
            case 'date_desc': return dateB - dateA;
            case 'subject_asc': return a.subject.localeCompare(b.subject);
            case 'subject_desc': return b.subject.localeCompare(a.subject);
            case 'added_desc': return createdB - createdA;
            default: return dateB - dateA;
          }
        });
      return itemsToDisplay;
    }
  },
   created() { 
      this.fetchAllData(); 
      this.applyFiltersDebounced = _.debounce(() => {
        // This is intentionally left empty as the computed property `filteredAndSortedItems`
        // will react automatically when `this.subjectFilter` (bound with v-model) changes.
        // The debounce is applied to the v-model update itself implicitly by how it's used.
        // Or, more explicitly, if you were calling a method:
        // this.applyFilters(); 
      }, 500);
  },
  methods: {
    toggleItemExpansion(itemId) {
      const item = this.allItems.find(i => i._id === itemId);
      if (item) {
        item.expanded = !item.expanded;
      }
    },
    isCommentingBusy(itemId) {
        return !!this.commentingBusyStates[itemId];
    },
    setCommentingBusy(itemId, state) {
        this.commentingBusyStates = { ...this.commentingBusyStates, [itemId]: state };
    },
    goBackToDashboard() { this.$emit("navigateToDashboard"); },
    async fetchAllData() { 
      this.isLoading = true;
      this.errorMessage = "";
      try {
        const [homeworkRes, testsRes, progressRes] = await Promise.all([
          axios.get('/api/homework'),
          axios.get('/api/tests'),
          axios.get('/api/progress') 
        ]);
        this.allItems = [...homeworkRes.data, ...testsRes.data].map(item => {
            if (!this.itemComments[item._id]) {
                 this.itemComments[item._id] = { show: false, list: [], isLoading: false, error: null };
            }
             if (!this.newCommentText[item._id]) {
                this.newCommentText[item._id] = "";
            }
            return { ...item, expanded: item.expanded === undefined ? false : item.expanded }; 
        });
        this.userProgress = progressRes.data; 
      } catch (error) {
        console.error("Error fetching data:", error);
        this.errorMessage = error.response?.data?.msg || "Kļūda ielādējot sarakstu.";
      } finally {
        this.isLoading = false;
      }
    },
    formatDate(dateString, includeTime = false) { 
      if (!dateString) return 'N/A';
      const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
      if (includeTime) { options.hour = '2-digit'; options.minute = '2-digit'; }
      try { return new Date(dateString).toLocaleDateString('lv-LV', options); } 
      catch (e) { return dateString; }
    },
    applyFilters() {
        // The computed property `filteredAndSortedItems` handles the actual filtering and sorting
        // based on the data properties (typeFilter, subjectFilter, groupFilter, sortBy).
        // This method is called by @change on selects, which updates the data properties,
        // triggering the computed property to re-evaluate.
    },
    async toggleProgress(itemFromTemplate) { 
        this.isUpdatingProgress = true;
        const newStatus = !itemFromTemplate.isDone; 
        
        // The `itemFromTemplate` is a mapped object. We need to update the `userProgress`
        // which `filteredAndSortedItems` uses to determine `isDone`.
        try {
            await axios.post('/api/progress', { itemId: itemFromTemplate._id, status: newStatus });
            // Directly update userProgress for immediate UI feedback
            this.userProgress = { ...this.userProgress, [itemFromTemplate._id]: newStatus };
        } catch (error) {
            console.error("Error updating progress:", error);
            alert('Kļūda, atjauninot progresu.');
            // Revert UI change if API call fails is handled by not updating userProgress on error
        } finally {
            this.isUpdatingProgress = false;
        }
    },
    editItem(item) { 
        this.$emit('editItem', { itemId: item._id, itemType: item.type });
    },
    async confirmDeleteItem(itemFromTemplate) { 
        if (confirm(`Vai tiešām vēlaties dzēst ierakstu "${itemFromTemplate.subject}"? Šī darbība ir neatgriezeniska.`)) {
            this.isDeleting = true;
            this.errorMessage = "";
            try {
                const url = itemFromTemplate.type === 'homework' ? `/api/homework/${itemFromTemplate._id}` : `/api/tests/${itemFromTemplate._id}`;
                const response = await axios.delete(url);
                
                this.allItems = this.allItems.filter(i => i._id !== itemFromTemplate._id);
                
                const newProgress = {...this.userProgress}; delete newProgress[itemFromTemplate._id]; this.userProgress = newProgress;
                const newComments = {...this.itemComments}; delete newComments[itemFromTemplate._id]; this.itemComments = newComments;
                const newCommentTexts = {...this.newCommentText}; delete newCommentTexts[itemFromTemplate._id]; this.newCommentText = newCommentTexts;

                this.$emit('itemDeleted', response.data.msg || "Ieraksts veiksmīgi dzēsts.");
            } catch (error) {
                console.error("Error deleting item:", error);
                this.errorMessage = error.response?.data?.msg || "Kļūda dzēšot ierakstu.";
            } finally {
                this.isDeleting = false;
            }
        }
    },
    async toggleComments(itemId) {
        if (!this.itemComments[itemId]) { 
             this.itemComments[itemId] = { show: false, list: [], isLoading: false, error: null };
        }
        const currentItemComments = this.itemComments[itemId];
        currentItemComments.show = !currentItemComments.show;

        if (currentItemComments.show && currentItemComments.list.length === 0 && !currentItemComments.error) { 
            currentItemComments.isLoading = true;
            this.setCommentingBusy(itemId, true);
            try {
                const response = await axios.get(`/api/comments/${itemId}`);
                currentItemComments.list = response.data;
            } catch (error) {
                console.error(`Error fetching comments for ${itemId}:`, error);
                currentItemComments.error = error.response?.data?.msg || "Neizdevās ielādēt komentārus.";
            } finally {
                currentItemComments.isLoading = false;
                this.setCommentingBusy(itemId, false);
            }
        }
    },
    async addComment(itemId) {
        const text = this.newCommentText[itemId]?.trim();
        if (!text) return;

        const currentItemComments = this.itemComments[itemId];
        this.setCommentingBusy(itemId, true);
        currentItemComments.error = null; 
        try {
            const response = await axios.post(`/api/comments/${itemId}`, { text });
            currentItemComments.list.push(response.data.comment);
            this.newCommentText[itemId] = ""; 
        } catch (error) {
            console.error(`Error adding comment for ${itemId}:`, error);
            currentItemComments.error = error.response?.data?.msg || "Neizdevās pievienot komentāru.";
        } finally {
            this.setCommentingBusy(itemId, false);
        }
    },
    async deleteComment(itemId, commentId) {
        if (!confirm("Vai tiešām vēlaties dzēst šo komentāru?")) return;

        const currentItemComments = this.itemComments[itemId];
        this.setCommentingBusy(itemId, true);
        currentItemComments.error = null;
        try {
            await axios.delete(`/api/comments/${commentId}`);
            currentItemComments.list = currentItemComments.list.filter(c => c._id !== commentId);
        } catch (error) {
            console.error(`Error deleting comment ${commentId}:`, error);
            currentItemComments.error = error.response?.data?.msg || "Neizdevās dzēst komentāru.";
        } finally {
            this.setCommentingBusy(itemId, false);
        }
    }
  },
};
</script>

<style scoped>
/* Styles are largely the same as the previous HomeworkListView response */
.homework-list-view {
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
}

.filters-panel {
  margin-bottom: 1.5rem;
  padding: 1rem;
}
.filters-title {
  font-size: 1.2rem;
  color: var(--primary-color);
  margin-top: 0;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.filters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}
.filters-grid .form-group {
  margin-bottom: 0;
}
.filters-grid .form-group label {
  font-size: 0.9em;
  font-weight: 500;
}
.filters-grid .form-group select,
.filters-grid .form-group input[type="text"] {
  padding: 0.6rem;
  font-size: 0.95em;
}

.empty-list-message {
  text-align: center;
  padding: 2rem;
  color: #6c757d;
}
.empty-list-message .fas {
  display: block;
  margin-bottom: 1rem;
  color: var(--secondary-color);
  opacity: 0.5;
}
.empty-list-message p {
  font-size: 1.05rem;
  margin-bottom: 0.5rem;
}

.items-container {
  margin-top: 1rem;
}
.list-item {
  margin-bottom: 1.5rem;
  transition: box-shadow 0.2s ease;
  overflow: hidden;
}
.list-item:hover {
  box-shadow: var(--shadow-md);
}

.item-main-info {
    display: flex;
    align-items: flex-start; 
    gap: 1rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px dashed var(--border-color);
    margin-bottom: 0.75rem;
}
.item-type-icon {
    font-size: 1.8rem;
    padding-top: 0.2rem; 
}
.item-type-icon.homework { color: var(--primary-color); }
.item-type-icon.test { color: var(--warning-color); }

.item-details {
    flex-grow: 1;
}
.item-subject {
  margin: 0 0 0.25rem 0;
  color: var(--header-bg-color);
  font-size: 1.3rem;
  font-weight: 600;
}
.item-type-badge {
  font-size: 0.75rem;
  padding: 0.2rem 0.6rem;
  border-radius: 10px;
  color: white;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: inline-block;
  margin-bottom: 0.5rem;
}
.list-item.homework .item-type-badge { background-color: var(--primary-color); }
.list-item.test .item-type-badge { background-color: var(--warning-color); color: var(--text-color); }

.item-date, .item-group-display {
  font-size: 0.9rem;
  color: #555;
  margin: 0.25rem 0;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.item-date .fas, .item-group-display .fas { color: var(--secondary-color); }

.collapsible-content {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.4s ease-out, opacity 0.3s ease-out, padding-top 0.4s ease-out, padding-bottom 0.4s ease-out;
  opacity: 0;
  padding-top: 0;
  padding-bottom: 0;
}
.collapsible-content.expanded {
  max-height: 1000px; 
  opacity: 1;
  padding-top: 0.75rem;
  padding-bottom: 0.75rem;
}

.item-description, .item-additional-info {
  font-size: 0.95rem;
  line-height: 1.6;
  color: #495057;
  margin-bottom: 0.5rem;
}
.item-description strong, .item-additional-info strong { color: var(--text-color); }

.item-links, .item-files { margin-top: 0.75rem; }
.item-links strong, .item-files strong {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.9rem;
  color: var(--text-color);
  margin-bottom: 0.3rem;
}
.item-links ul, .item-files ul {
  list-style-type: none;
  padding-left: 1.5rem; 
  margin: 0;
}
.item-links li, .item-files li.file-entry {
  font-size: 0.9em;
  margin-bottom: 0.25rem;
  word-break: break-all;
  display: flex;
  align-items: center;
  gap: 0.3rem;
}
.item-links a { color: var(--link-color); text-decoration: none; }
.item-links a:hover { text-decoration: underline; }
.file-entry .fas { color: var(--secondary-color); }
.file-size { font-size: 0.9em; color: #6c757d; margin-left: 0.5rem; }

.item-meta {
  margin-top: 1rem;
  padding-top: 0.5rem;
  border-top: 1px dotted #e0e0e0;
  font-size: 0.8rem;
  color: #7f8c8d;
}
.item-meta p { margin: 0.25rem 0; display: flex; align-items: center; gap: 0.4rem; }
.item-meta .fas { font-size: 0.9em; }

.list-item.item-done {
  background-color: #e9f5e9; 
  border-left-color: var(--success-color);
}
.list-item.item-done .item-main-info .item-type-icon.homework { color: var(--success-color); }
.list-item.item-done .item-main-info .item-type-icon.test { color: var(--success-color); }
.list-item.item-done .item-subject { text-decoration: line-through; color: #5a6268; }

.item-actions-footer {
  margin-top: 1rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
}
.main-actions { display: flex; align-items: center; gap: 0.75rem; }
.contextual-actions { display: flex; align-items: center; gap: 0.5rem; }

.progress-checkbox-label {
  display: flex;
  align-items: center;
  cursor: pointer;
  font-size: 0.9em;
  color: var(--text-color);
  padding: 0.4rem 0.6rem;
  border-radius: var(--border-radius);
  transition: background-color 0.2s;
}
.progress-checkbox-label:hover { background-color: #e9ecef; }
.progress-checkbox-label input[type="checkbox"] { display: none; }
.progress-checkbox-label .fas, .progress-checkbox-label .far {
  margin-right: 0.5rem;
  font-size: 1.2em; 
  color: var(--primary-color);
}
.list-item.item-done .progress-checkbox-label .fas, 
.list-item.item-done .progress-checkbox-label .far {
  color: var(--success-color);
}

.action-button-small {
  padding: 0.4rem 0.8rem;
  font-size: 0.85em;
}
.action-button-small i { margin-right: 0.3rem; }
.expand-toggle { background-color: var(--secondary-color); }
.comments-toggle { background-color: var(--info-color); }
.comment-count { font-size: 0.85em; margin-left: 0.25rem; }
.owner-admin-actions { display: flex; gap: 0.5rem; }
.edit-btn { background-color: var(--warning-color); color: var(--text-color); }
.delete-btn { background-color: var(--danger-color); }

.comments-area-wrapper { margin-top: 1rem; }
.comments-area {
  padding: 1rem;
  margin-top: 0.5rem; 
}
.comments-area h4 {
  font-size: 1.1rem;
  color: var(--primary-color);
  margin-top: 0;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.no-comments {
  color: #6c757d;
  font-style: italic;
  text-align: center;
  padding: 1rem 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}
.no-comments .fas { font-size: 1.5rem; opacity: 0.6; }

.comments-list { list-style-type: none; padding: 0; margin:0 0 1rem 0; }
.comment-item {
  border-bottom: 1px dotted #e0e0e0;
  padding: 0.75rem 0;
}
.comment-item:last-child { border-bottom: none; }
.comment-text {
  margin: 0 0 0.5rem 0;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-size: 0.95rem;
  color: var(--text-color);
}
.comment-meta {
  font-size: 0.8rem;
  color: #6c757d;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.comment-meta span { display: flex; align-items: center; gap: 0.3rem; }
.delete-comment-btn {
  background: none;
  border: none;
  color: var(--danger-color);
  font-size: 1em; 
  cursor: pointer;
  padding: 0.25rem;
  line-height: 1;
}
.delete-comment-btn:hover { color: #c82333; }
.delete-comment-btn .fas { font-size: 1.1em; } 

.add-comment-form {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.add-comment-form textarea {
  min-height: 70px; 
  font-size: 0.95em;
}
.add-comment-form .action-button { 
  align-self: flex-end;
  padding: 0.5rem 1rem; 
}

.loading-indicator.small { font-size: 0.95em; padding: 0.5rem; }
.error-message.small { font-size: 0.9em; padding: 0.5rem; margin-bottom: 0.5rem; }

@media (max-width: 768px) {
    .filters-grid {
        grid-template-columns: 1fr; 
    }
    .item-actions-footer {
        flex-direction: column;
        align-items: flex-start;
    }
    .contextual-actions {
        margin-top: 0.5rem;
        width: 100%;
        justify-content: space-between; 
    }
}
</style>