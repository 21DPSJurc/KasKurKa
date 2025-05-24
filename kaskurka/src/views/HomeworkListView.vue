<!-- kaskurka/src/views/HomeworkListView.vue -->
<template>
  <div class="homework-list-view form-view">
    <button @click="goBackToDashboard" class="back-button" :disabled="isLoading || isUpdatingProgress || isDeleting">
      ← Atpakaļ uz Paneli
    </button>
    <h2>Mājasdarbu un Pārbaudes Darbu Saraksts</h2>

    <div class="filters">
      <!-- ... filters as before ... -->
      <div class="form-group">
        <label for="typeFilter">Filtrēt pēc tipa:</label>
        <select id="typeFilter" v-model="typeFilter" @change="applyFilters" :disabled="isLoading || isUpdatingProgress || isDeleting">
          <option value="">Visi Tipi</option>
          <option value="homework">Mājasdarbi</option>
          <option value="test">Pārbaudes Darbi</option>
        </select>
      </div>
      <div class="form-group">
        <label for="subjectFilter">Filtrēt pēc priekšmeta:</label>
        <input type="text" id="subjectFilter" v-model="subjectFilter" @input="applyFilters" placeholder="Ievadi priekšmetu..." :disabled="isLoading || isUpdatingProgress || isDeleting" />
      </div>
      <div class="form-group">
        <label for="sortBy">Kārtot pēc:</label>
        <select id="sortBy" v-model="sortBy" @change="applyFilters" :disabled="isLoading || isUpdatingProgress || isDeleting">
          <option value="date_desc">Datums (Jaunākie)</option>
          <option value="date_asc">Datums (Vecākie)</option>
          <option value="subject_asc">Priekšmets (A-Z)</option>
          <option value="subject_desc">Priekšmets (Z-A)</option>
        </select>
      </div>
    </div>

    <div v-if="isLoading" class="loading-message"><p>Notiek ielāde...</p></div>
    <div v-else-if="errorMessage" class="error-message">{{ errorMessage }}</div>
    <div v-else-if="filteredAndSortedItems.length === 0" class="empty-list-message">
      <p>Pēc jūsu izvēlētajiem kritērijiem nekas nav atrasts, vai arī saraksts ir tukšs.</p>
    </div>
    <div v-else class="items-container">
      <div v-for="item in filteredAndSortedItems" :key="item._id" 
           class="list-item" 
           :class="[item.type, { 'item-done': item.isDone }]"
      >
        <div class="item-header">
          <h3>{{ item.subject }} <span class="item-type-badge">{{ item.type === 'homework' ? 'Mājasdarbs' : 'Pārbaudes Darbs' }}</span></h3>
          <p class="item-date">
            {{ item.type === 'homework' ? 'Termiņš' : 'Norises Datums' }}: <strong>{{ formatDate(item.type === 'homework' ? item.dueDate : item.eventDate) }}</strong>
            <span v-if="item.type === 'test' && item.eventTime">, {{ item.eventTime }}</span>
          </p>
        </div>
        <div class="item-content">
          <p class="item-description"><strong>Apraksts:</strong> {{ item.description || item.topics || 'Nav norādīts' }}</p>
          <p v-if="item.additionalInfo"><strong>Papildus Info:</strong> {{ item.additionalInfo }}</p>
          <div v-if="item.links && item.links.length > 0" class="item-links">
            <strong>Saites:</strong>
            <ul><li v-for="(link, index) in item.links" :key="index"><a :href="link" target="_blank" rel="noopener noreferrer">{{ link }}</a></li></ul>
          </div>
          <div v-if="item.fileAttachments && item.fileAttachments.length > 0" class="item-files">
            <strong>Pievienotie Faili:</strong>
            <ul><li v-for="(file, index) in item.fileAttachments" :key="index">{{ file.originalName }} ({{ (file.size / 1024).toFixed(2) }} KB)</li></ul>
          </div>
          <p class="item-author">Pievienoja: {{ item.userFirstName }} ({{ item.userGroup }}{{ item.userSubgroup ? '-' + item.userSubgroup : '' }})</p>
          <p class="item-added-date">Pievienots: {{ formatDate(item.createdAt, true) }}</p>
        </div>
        <div class="item-actions">
            <label class="progress-checkbox-label" :for="'progress-' + item._id">
                <input type="checkbox" :id="'progress-' + item._id" :checked="item.isDone" @change="toggleProgress(item)" :disabled="isUpdatingProgress || isDeleting || isCommentingBusy(item._id)"/>
                Atzīmēt kā izpildītu
            </label>
            <div v-if="currentUserId && item.userId === currentUserId" class="owner-actions">
                <button @click="editItem(item)" class="action-button-small edit" :disabled="isUpdatingProgress || isDeleting || isCommentingBusy(item._id)">Rediģēt</button>
                <button @click="confirmDeleteItem(item)" class="action-button-small delete" :disabled="isUpdatingProgress || isDeleting || isCommentingBusy(item._id)">Dzēst</button>
            </div>
        </div>
        <div class="item-comments-section">
            <button @click="toggleComments(item._id)" class="action-button-small comments-toggle" :disabled="isCommentingBusy(item._id)">
                {{ itemComments[item._id] && itemComments[item._id].show ? 'Slēpt Komentārus' : 'Rādīt/Pievienot Komentārus' }}
                <span v-if="itemComments[item._id] && itemComments[item._id].list.length > 0"> ({{ itemComments[item._id].list.length }})</span>
            </button>
            <div v-if="itemComments[item._id] && itemComments[item._id].show" class="comments-area">
                <div v-if="itemComments[item._id].isLoading" class="loading-message small">Notiek komentāru ielāde...</div>
                <div v-if="itemComments[item._id].error" class="error-message small">{{ itemComments[item._id].error }}</div>
                
                <div v-if="!itemComments[item._id].isLoading && itemComments[item._id].list.length === 0 && !itemComments[item._id].error" class="no-comments">
                    Nav komentāru. Esi pirmais!
                </div>
                <ul v-else-if="!itemComments[item._id].isLoading" class="comments-list">
                    <li v-for="comment in itemComments[item._id].list" :key="comment._id" class="comment-item">
                        <p class="comment-text">{{ comment.text }}</p>
                        <p class="comment-meta">
                            <span>Autors: {{ comment.userName }}</span> | 
                            <span>{{ formatDate(comment.createdAt, true) }}</span>
                            <button 
                                v-if="currentUserId === comment.userId" 
                                @click="deleteComment(item._id, comment._id)" 
                                class="delete-comment-btn"
                                :disabled="isCommentingBusy(item._id)"
                                title="Dzēst komentāru">×</button>
                        </p>
                    </li>
                </ul>

                <form @submit.prevent="addComment(item._id)" class="add-comment-form">
                    <textarea v-model="newCommentText[item._id]" placeholder="Rakstiet savu komentāru šeit..." :disabled="isCommentingBusy(item._id)"></textarea>
                    <button type="submit" class="action-button-small" :disabled="!newCommentText[item._id] || !newCommentText[item._id].trim() || isCommentingBusy(item._id)">Pievienot Komentāru</button>
                </form>
            </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: "HomeworkListView",
  props: {
      currentUserId: String 
  },
  data() {
    return {
      allItems: [], 
      userProgress: {}, 
      itemComments: {}, // Structure: { itemId: { show: false, list: [], isLoading: false, error: null } }
      newCommentText: {}, // Structure: { itemId: "text" }
      commentingBusyStates: {}, // { itemId: true/false }
      isLoading: true,
      isUpdatingProgress: false,
      isDeleting: false, 
      errorMessage: "",
      typeFilter: "", 
      subjectFilter: "",
      sortBy: "date_desc", 
    };
  },
  computed: {
    filteredAndSortedItems() { 
      let items = this.allItems.map(item => ({
        ...item,
        isDone: !!this.userProgress[item._id] 
      }));
      if (this.typeFilter) items = items.filter(item => item.type === this.typeFilter);
      if (this.subjectFilter.trim()) {
        const subjectQuery = this.subjectFilter.trim().toLowerCase();
        items = items.filter(item => item.subject.toLowerCase().includes(subjectQuery));
      }
      items.sort((a, b) => {
        const dateA = new Date(a.type === 'homework' ? a.dueDate : a.eventDate);
        const dateB = new Date(b.type === 'homework' ? b.dueDate : b.eventDate);
        switch (this.sortBy) {
          case 'date_asc': return dateA - dateB;
          case 'date_desc': return dateB - dateA;
          case 'subject_asc': return a.subject.localeCompare(b.subject);
          case 'subject_desc': return b.subject.localeCompare(a.subject);
          default: return dateB - dateA;
        }
      });
      return items;
    }
  },
  methods: {
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
            // Initialize comments state for each item
            if (!this.itemComments[item._id]) {
                 this.itemComments[item._id] = { show: false, list: [], isLoading: false, error: null };
            }
             if (!this.newCommentText[item._id]) {
                this.newCommentText[item._id] = "";
            }
            return item;
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
    applyFilters() {},
    async toggleProgress(item) { 
        this.isUpdatingProgress = true;
        const newStatus = !item.isDone;
        try {
            await axios.post('/api/progress', { itemId: item._id, status: newStatus });
            this.userProgress = { ...this.userProgress, [item._id]: newStatus };
        } catch (error) {
            console.error("Error updating progress:", error);
            alert('Kļūda, atjauninot progresu.');
        } finally {
            this.isUpdatingProgress = false;
        }
    },
    editItem(item) {
        this.$emit('editItem', { itemId: item._id, itemType: item.type });
    },
    async confirmDeleteItem(item) {
        if (confirm(`Vai tiešām vēlaties dzēst ierakstu "${item.subject}"? Šī darbība ir neatgriezeniska.`)) {
            this.isDeleting = true;
            this.errorMessage = "";
            try {
                const url = item.type === 'homework' ? `/api/homework/${item._id}` : `/api/tests/${item._id}`;
                const response = await axios.delete(url);
                this.allItems = this.allItems.filter(i => i._id !== item._id);
                const newProgress = {...this.userProgress}; delete newProgress[item._id]; this.userProgress = newProgress;
                const newComments = {...this.itemComments}; delete newComments[item._id]; this.itemComments = newComments; // Also clear comments for deleted item
                const newCommentTexts = {...this.newCommentText}; delete newCommentTexts[item._id]; this.newCommentText = newCommentTexts;

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
        if (!this.itemComments[itemId]) { // Should be initialized in fetchAllData
             this.itemComments[itemId] = { show: false, list: [], isLoading: false, error: null };
        }
        const currentItemComments = this.itemComments[itemId];
        currentItemComments.show = !currentItemComments.show;

        if (currentItemComments.show && currentItemComments.list.length === 0 && !currentItemComments.error) { // Fetch only if showing and no data/error yet
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
        currentItemComments.error = null; // Clear previous errors
        try {
            const response = await axios.post(`/api/comments/${itemId}`, { text });
            currentItemComments.list.push(response.data.comment);
            this.newCommentText[itemId] = ""; // Clear input field
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
  created() { 
      this.fetchAllData(); 
  },
};
</script>

<style scoped>
/* ... existing styles ... */
.homework-list-view { max-width: 900px; }
.filters { display: flex; flex-wrap: wrap; gap: 15px; margin-bottom: 20px; padding: 15px; background-color: #f9f9f9; border-radius: 6px; }
.filters .form-group { margin-bottom: 0; flex: 1; min-width: 200px; }
.filters .form-group label { font-size: 0.9em; margin-bottom: 5px; }
.filters .form-group select, .filters .form-group input[type="text"] { padding: 8px; font-size: 0.95em; }
.loading-message, .empty-list-message { text-align: center; padding: 20px; color: #555; }
.loading-message.small, .error-message.small { padding: 10px; font-size: 0.9em; }
.items-container { margin-top: 20px; }
.list-item { background-color: #fff; border: 1px solid #e0e0e0; border-radius: 6px; margin-bottom: 15px; padding: 15px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); transition: opacity 0.3s ease; }
.list-item.homework { border-left: 5px solid #3498db; }
.list-item.test { border-left: 5px solid #e67e22; }
.list-item.item-done { opacity: 0.7; }
.list-item.item-done .item-header h3, .list-item.item-done .item-description { text-decoration: line-through; color: #7f8c8d; }
.item-header { border-bottom: 1px solid #f0f0f0; padding-bottom: 10px; margin-bottom: 10px; }
.item-header h3 { margin: 0 0 5px 0; color: #2c3e50; font-size: 1.3em; display: flex; justify-content: space-between; align-items: center; }
.item-type-badge { font-size: 0.7em; padding: 3px 8px; border-radius: 10px; color: white; font-weight: normal; }
.list-item.homework .item-type-badge { background-color: #3498db; }
.list-item.test .item-type-badge { background-color: #e67e22; }
.item-date { font-size: 0.95em; color: #555; margin: 0; }
.item-content p { margin: 5px 0; font-size: 0.95em; line-height: 1.5; }
.item-description { color: #333; }
.item-author, .item-added-date { font-size: 0.85em; color: #7f8c8d; margin-top: 10px; }
.item-links ul, .item-files ul { list-style-type: none; padding-left: 0; margin-top: 5px; }
.item-links li, .item-files li { font-size: 0.9em; margin-bottom: 3px; word-break: break-all; }
.item-links a { color: #2980b9; text-decoration: none; }
.item-links a:hover { text-decoration: underline; }
.item-actions { margin-top: 15px; padding-top: 10px; border-top: 1px solid #f0f0f0; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap:10px;}
.progress-checkbox-label { display: flex; align-items: center; cursor: pointer; font-size: 0.9em; color: #34495e; }
.progress-checkbox-label input[type="checkbox"] { margin-right: 8px; width: 16px; height: 16px; cursor: pointer; }
.owner-actions { display: flex; gap: 10px; }
.action-button-small { padding: 6px 12px; font-size: 0.85em; border-radius: 4px; cursor: pointer; border: none; color: white; }
.action-button-small.edit { background-color: #f0ad4e; }
.action-button-small.edit:hover { background-color: #ec971f; }
.action-button-small.delete { background-color: #d9534f; }
.action-button-small.delete:hover { background-color: #c9302c; }
.action-button-small[disabled] { background-color: #bdc3c7; cursor: not-allowed; }

.item-comments-section { margin-top: 15px; padding-top:15px; border-top: 1px dashed #ccc; }
.comments-toggle { background-color: #7f8c8d; margin-bottom: 10px;}
.comments-toggle:hover { background-color: #6c757d; }
.comments-area { padding: 10px; background-color: #fbfbfb; border-radius: 4px; }
.no-comments { color: #777; font-style: italic; text-align: center; padding:10px 0; }
.comments-list { list-style-type: none; padding: 0; margin:0; }
.comment-item { border-bottom: 1px solid #eee; padding: 10px 0; }
.comment-item:last-child { border-bottom: none; }
.comment-text { margin: 0 0 5px 0; white-space: pre-wrap; word-wrap: break-word; }
.comment-meta { font-size: 0.8em; color: #888; display: flex; justify-content: space-between; align-items: center;}
.comment-meta span { margin-right: 10px;}
.delete-comment-btn { background: none; border: none; color: #e74c3c; font-size: 1.2em; cursor: pointer; padding: 0 5px; }
.delete-comment-btn:hover { color: #c0392b; }
.add-comment-form { margin-top: 15px; display: flex; flex-direction: column; gap: 10px; }
.add-comment-form textarea { width: calc(100% - 22px); min-height: 60px; padding: 10px; border: 1px solid #ccc; border-radius: 4px; font-size:0.95em; }
.add-comment-form .action-button-small { align-self: flex-end; }
</style>