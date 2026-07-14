// TaskFlow - Vanilla JS
// Functions required by the specification are provided and commented.

const USER_KEY = 'studyflow_user';
const TASKS_KEY = 'studyflow_tasks';
const SHOP_KEY = 'studyflow_shop';
const PROGRESS_KEY = 'studyflow_progress';
const SETTINGS_KEY = 'studyflow_settings';
const NOTES_KEY = 'studyflow_notes';
const CHECKLISTS_KEY = 'studyflow_checklists';
const PROJECTS_KEY = 'studyflow_projects';
const APP_STATE_KEY = 'studyflow_app_state';
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const TASK_CATEGORIES = ['Study', 'Work', 'Personal', 'Game Development', 'Health', 'Learning', 'Creative', 'Other'];

// Filter state
let currentFilters = { subject: 'All', importance: 'All', status: 'All', category: 'All' };
let currentSortMode = 'soonest';
let currentSearchQuery = '';
let currentCalendarMonth = new Date();
let selectedCalendarDate = '';
let editingTaskId = null;
let editingNoteId = null;
let editingChecklistId = null;
let editingProjectId = null;
let currentNoteSearch = '';
let currentChecklistSearch = '';
let currentProjectSearch = '';
let draftProjectTaskId = '';

const SHOP_CATALOG = {
  themes: [
    { id: 'classic-dark', name: 'Classic Dark', cost: 0, accent: '🌙', description: 'La base limpia y equilibrada.' },
    { id: 'space', name: 'Space', cost: 100, accent: '✨', description: 'Gradientes profundos y brillo sutil.' },
    { id: 'ocean', name: 'Ocean', cost: 150, accent: '🌊', description: 'Azules suaves y sensación de calma.' },
    { id: 'forest', name: 'Forest', cost: 200, accent: '🌿', description: 'Tonos verdes y aire natural.' },
    { id: 'volcanic', name: 'Volcanic', cost: 300, accent: '🔥', description: 'Contrastes cálidos y energía intensa.' },
  ],
  styles: [
    { id: 'classic', name: 'Classic', cost: 0, accent: '◻️', description: 'El estilo base, limpio y neutral.' },
    { id: 'shiny', name: 'Shiny', cost: 100, accent: '✦', description: 'Sombras suaves y brillo pulido.' },
    { id: 'minimalist', name: 'Minimalist', cost: 150, accent: '—', description: 'Más aire, menos ruido visual.' },
    { id: 'futuristic', name: 'Futuristic', cost: 250, accent: '◌', description: 'Bordes nítidos y acento tecnológico.' },
    { id: 'pixel', name: 'Pixel Art', cost: 300, accent: '▣', description: 'Toque retro con esquinas marcadas.' },
  ],
  decorations: [
    { id: 'stars', name: 'Stars', cost: 0, accent: '⭐' },
    { id: 'flames', name: 'Flames', cost: 0, accent: '🔥' },
    { id: 'crystals', name: 'Crystals', cost: 0, accent: '💎' },
    { id: 'gears', name: 'Gears', cost: 0, accent: '⚙️' },
    { id: 'moon', name: 'Moon', cost: 0, accent: '🌙' },
  ]
};

const DEFAULT_SHOP_STATE = {
  purchased: {
    themes: ['classic-dark'],
    styles: ['classic'],
    decorations: ['stars', 'flames', 'crystals', 'gears', 'moon']
  },
  equipped: {
    theme: 'classic-dark',
    cardStyle: 'classic',
    decoration: 'stars'
  }
};

const DEFAULT_PROGRESS = {
  streak: 0,
  maxStreak: 0,
  lastCompletionDate: '',
  totalXp: 0,
  bonusPoints: 0
};

const DEFAULT_SETTINGS = {
  themeMode: 'light',
  primaryColor: '#5b8def',
  secondaryColor: '#7ee0a8',
  fontFamily: 'Inter',
  backgroundMode: 'gradient',
  backgroundImage: '',
  darkOverlay: true,
  autoCompleteTaskWithSubtasks: true,
  isPremium: false
};

const DEFAULT_TASK_CATEGORY = 'Study';

// --- Utility helpers ---
function qs(id){ return document.getElementById(id); }
function cloneDefaultShopState(){ return JSON.parse(JSON.stringify(DEFAULT_SHOP_STATE)); }
function generateEntityId(prefix){
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
function generateTaskId(){
  return generateEntityId('task');
}
function createEmptyUserData(profile = {}){
  const id = profile.id || generateEntityId('user');
  return {
    id,
    name: String(profile.name || '').trim(),
    grade: String(profile.grade || '').trim(),
    tasks: [],
    notes: [],
    checklists: [],
    projects: [],
    progress: { ...DEFAULT_PROGRESS },
    settings: { ...DEFAULT_SETTINGS },
    shop: cloneDefaultShopState()
  };
}
function createEmptyAppState(){
  return { activeUserId: '', users: {} };
}
function safeParseJson(raw, fallback){
  if(!raw) return fallback;
  try{
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}
function normalizeUserData(user){
  const normalized = createEmptyUserData(user);
  normalized.tasks = Array.isArray(user.tasks) ? user.tasks.map(normalizeTask) : [];
  normalized.notes = Array.isArray(user.notes) ? user.notes.map(normalizeNote) : [];
  normalized.checklists = Array.isArray(user.checklists) ? user.checklists.map(normalizeChecklist) : [];
  normalized.projects = Array.isArray(user.projects) ? user.projects.map(normalizeProject) : [];
  normalized.progress = { ...DEFAULT_PROGRESS, ...(user.progress || {}) };
  normalized.settings = { ...DEFAULT_SETTINGS, ...(user.settings || {}) };
  normalized.shop = normalizeShopState(user.shop);
  return normalized;
}
function normalizeAppState(state){
  const normalized = createEmptyAppState();
  Object.values(state.users || {}).forEach(user => {
    const normalizedUser = normalizeUserData(user);
    if(normalizedUser.id && normalizedUser.name){
      normalized.users[normalizedUser.id] = normalizedUser;
    }
  });
  normalized.activeUserId = normalized.users[state.activeUserId] ? state.activeUserId : Object.keys(normalized.users)[0] || '';
  return normalized;
}
function loadLegacyList(key){
  return safeParseJson(localStorage.getItem(key), []);
}
function buildStateFromLegacyStorage(){
  const legacyUser = safeParseJson(localStorage.getItem(USER_KEY), null);
  const state = createEmptyAppState();
  if(!legacyUser) return state;
  const user = createEmptyUserData({ ...legacyUser, id: generateEntityId('user') });
  user.tasks = loadLegacyList(TASKS_KEY).map(normalizeTask);
  user.notes = loadLegacyList(NOTES_KEY).map(normalizeNote);
  user.checklists = loadLegacyList(CHECKLISTS_KEY).map(normalizeChecklist);
  user.projects = loadLegacyList(PROJECTS_KEY).map(normalizeProject);
  user.progress = { ...DEFAULT_PROGRESS, ...safeParseJson(localStorage.getItem(PROGRESS_KEY), {}) };
  user.settings = { ...DEFAULT_SETTINGS, ...safeParseJson(localStorage.getItem(SETTINGS_KEY), {}) };
  user.shop = normalizeShopState(safeParseJson(localStorage.getItem(SHOP_KEY), null));
  state.users[user.id] = user;
  state.activeUserId = user.id;
  return state;
}
function loadAppState(){
  const stored = localStorage.getItem(APP_STATE_KEY);
  const state = stored ? normalizeAppState(safeParseJson(stored, createEmptyAppState())) : buildStateFromLegacyStorage();
  saveAppState(state);
  return state;
}
function saveAppState(state){
  localStorage.setItem(APP_STATE_KEY, JSON.stringify(normalizeAppState(state)));
}
function getUsers(){
  return Object.values(loadAppState().users).sort((a, b) => a.name.localeCompare(b.name));
}
function getActiveUserData(){
  const state = loadAppState();
  return state.activeUserId ? state.users[state.activeUserId] || null : null;
}
function updateActiveUserData(mutator){
  const state = loadAppState();
  const activeId = state.activeUserId;
  if(!activeId || !state.users[activeId]) return null;
  const nextUser = normalizeUserData(state.users[activeId]);
  mutator(nextUser);
  state.users[activeId] = normalizeUserData(nextUser);
  saveAppState(state);
  return state.users[activeId];
}
function saveUser(user){
  if(user.id){
    const state = loadAppState();
    const existing = state.users[user.id] || createEmptyUserData(user);
    state.users[user.id] = normalizeUserData({ ...existing, ...user });
    state.activeUserId = user.id;
    saveAppState(state);
    return;
  }
  updateActiveUserData(active => {
    active.name = String(user.name || active.name).trim();
    active.grade = String(user.grade || active.grade).trim();
  });
}
function loadUser(){
  const user = getActiveUserData();
  return user ? { id: user.id, name: user.name, grade: user.grade } : null;
}
function createUserProfile(name, grade){
  const state = loadAppState();
  const user = createEmptyUserData({ name, grade });
  state.users[user.id] = user;
  state.activeUserId = user.id;
  saveAppState(state);
  return user;
}
function switchUser(userId){
  const state = loadAppState();
  if(!state.users[userId]) return;
  state.activeUserId = userId;
  saveAppState(state);
  editingTaskId = null;
  applyUserVisualSettings();
  applyShopCosmetics();
  renderUserSwitcher();
  showHome();
}
function deleteActiveUser(){
  const state = loadAppState();
  if(!state.activeUserId) return;
  delete state.users[state.activeUserId];
  state.activeUserId = Object.keys(state.users)[0] || '';
  saveAppState(state);
}
function loadTasks(){
  const user = getActiveUserData();
  const tasks = user ? user.tasks : [];
  const normalized = tasks.map(normalizeTask);
  if(user && JSON.stringify(tasks) !== JSON.stringify(normalized)) saveTasks(normalized);
  return normalized;
}
function saveTasks(tasks){
  updateActiveUserData(user => { user.tasks = tasks.map(normalizeTask); });
}
function mapStorageKeyToUserProp(key){
  return {
    [NOTES_KEY]: 'notes',
    [CHECKLISTS_KEY]: 'checklists',
    [PROJECTS_KEY]: 'projects'
  }[key];
}
function loadJsonList(key){
  const user = getActiveUserData();
  const prop = mapStorageKeyToUserProp(key);
  return user && prop ? user[prop] || [] : [];
}
function saveJsonList(key, value){
  const prop = mapStorageKeyToUserProp(key);
  if(!prop) return;
  updateActiveUserData(user => { user[prop] = Array.isArray(value) ? value : []; });
}
function normalizeShopState(rawState){
  const parsed = rawState || {};
  const state = cloneDefaultShopState();
  state.purchased.themes = Array.from(new Set([...(parsed.purchased?.themes || []), ...state.purchased.themes]));
  state.purchased.styles = Array.from(new Set([...(parsed.purchased?.styles || []), ...state.purchased.styles]));
  state.purchased.decorations = Array.from(new Set([...(parsed.purchased?.decorations || []), ...state.purchased.decorations]));
  state.equipped.theme = parsed.equipped?.theme || state.equipped.theme;
  state.equipped.cardStyle = parsed.equipped?.cardStyle || state.equipped.cardStyle;
  state.equipped.decoration = parsed.equipped?.decoration || state.equipped.decoration;
  return state;
}
function saveShopState(state){
  updateActiveUserData(user => { user.shop = normalizeShopState(state); });
}
function normalizeTask(task){
  const normalized = { ...task };
  if(!normalized.id) normalized.id = generateTaskId();
  if(typeof normalized.completed !== 'boolean') normalized.completed = !!normalized.completed;
  if(!normalized.category || !TASK_CATEGORIES.includes(normalized.category)) normalized.category = DEFAULT_TASK_CATEGORY;
  if(normalized.projectId === undefined) normalized.projectId = '';
  normalized.subtasks = Array.isArray(normalized.subtasks) ? normalized.subtasks.map(normalizeSubtask).filter(item => item.title) : [];
  normalized.xpAwarded = !!normalized.xpAwarded;
  return normalized;
}
function normalizeSubtask(subtask){
  const normalized = { ...subtask };
  if(!normalized.id) normalized.id = generateEntityId('subtask');
  normalized.title = String(normalized.title || normalized.text || '').trim();
  normalized.completed = !!normalized.completed;
  return normalized;
}
function loadNotes(){
  const notes = loadJsonList(NOTES_KEY);
  const normalized = notes.map(normalizeNote);
  if(JSON.stringify(notes) !== JSON.stringify(normalized)) saveJsonList(NOTES_KEY, normalized);
  return normalized;
}
function saveNotes(notes){ saveJsonList(NOTES_KEY, notes); }
function normalizeNote(note){
  const normalized = { ...note };
  if(!normalized.id) normalized.id = generateEntityId('note');
  normalized.title = String(normalized.title || '').trim();
  normalized.content = String(normalized.content || '').trim();
  normalized.tags = Array.isArray(normalized.tags) ? normalized.tags.filter(Boolean) : String(normalized.tags || '').split(',').map(tag => tag.trim()).filter(Boolean);
  normalized.updatedAt = normalized.updatedAt || new Date().toISOString();
  return normalized;
}
function loadChecklists(){
  const checklists = loadJsonList(CHECKLISTS_KEY);
  const normalized = checklists.map(normalizeChecklist);
  if(JSON.stringify(checklists) !== JSON.stringify(normalized)) saveJsonList(CHECKLISTS_KEY, normalized);
  return normalized;
}
function saveChecklists(checklists){ saveJsonList(CHECKLISTS_KEY, checklists); }
function normalizeChecklistItem(item){
  const normalized = { ...item };
  if(!normalized.id) normalized.id = generateEntityId('checkitem');
  normalized.text = String(normalized.text || '').trim();
  normalized.completed = !!normalized.completed;
  return normalized;
}
function normalizeChecklist(checklist){
  const normalized = { ...checklist };
  if(!normalized.id) normalized.id = generateEntityId('checklist');
  normalized.title = String(normalized.title || '').trim();
  normalized.items = Array.isArray(normalized.items) ? normalized.items.map(normalizeChecklistItem).filter(item => item.text) : [];
  normalized.updatedAt = normalized.updatedAt || new Date().toISOString();
  return normalized;
}
function loadProjects(){
  const projects = loadJsonList(PROJECTS_KEY);
  const normalized = projects.map(normalizeProject);
  if(JSON.stringify(projects) !== JSON.stringify(normalized)) saveJsonList(PROJECTS_KEY, normalized);
  return normalized;
}
function saveProjects(projects){ saveJsonList(PROJECTS_KEY, projects); }
function normalizeProject(project){
  const normalized = { ...project };
  if(!normalized.id) normalized.id = generateEntityId('project');
  normalized.name = String(normalized.name || '').trim();
  normalized.description = String(normalized.description || '').trim();
  normalized.section = String(normalized.section || '').trim();
  normalized.updatedAt = normalized.updatedAt || new Date().toISOString();
  return normalized;
}
function loadProgress(){
  const user = getActiveUserData();
  return user ? { ...DEFAULT_PROGRESS, ...(user.progress || {}) } : { ...DEFAULT_PROGRESS };
}
function saveProgress(progress){
  updateActiveUserData(user => { user.progress = { ...DEFAULT_PROGRESS, ...progress }; });
}
function loadSettings(){
  const user = getActiveUserData();
  return user ? { ...DEFAULT_SETTINGS, ...(user.settings || {}) } : { ...DEFAULT_SETTINGS };
}
function saveSettings(settings){
  updateActiveUserData(user => { user.settings = { ...DEFAULT_SETTINGS, ...settings }; });
}
function loadShopState(){
  const user = getActiveUserData();
  const state = normalizeShopState(user ? user.shop : null);
  if(user) saveShopState(state);
  return state;
}

function getShopItem(category, id){
  return SHOP_CATALOG[category].find(item => item.id === id);
}

function getShopState(){
  return loadShopState();
}

function getShopSpentPoints(state = getShopState()){
  const paidThemeCosts = state.purchased.themes.reduce((total, id) => total + (getShopItem('themes', id)?.cost || 0), 0);
  const paidStyleCosts = state.purchased.styles.reduce((total, id) => total + (getShopItem('styles', id)?.cost || 0), 0);
  return paidThemeCosts + paidStyleCosts;
}

function getShopLabel(category, id){
  const item = getShopItem(category, id);
  return item ? item.name : 'Classic';
}

function getDecorationAccent(id){
  const item = getShopItem('decorations', id);
  return item ? item.accent : '⭐';
}

function isUnlocked(category, id, state = getShopState()){
  return state.purchased[category].includes(id);
}

function applyShopCosmetics(){
  const state = getShopState();
  const body = document.body;
  const themeClasses = SHOP_CATALOG.themes.map(item => `shop-theme-${item.id}`);
  const styleClasses = SHOP_CATALOG.styles.map(item => `card-style-${item.id}`);
  body.classList.remove(...themeClasses, ...styleClasses);
  body.classList.add(`card-style-${state.equipped.cardStyle}`);
  body.dataset.decoration = state.equipped.decoration;
  if(document.documentElement.getAttribute('data-theme') === 'dark'){
    body.classList.add(`shop-theme-${state.equipped.theme}`);
  }
  const accent = getDecorationAccent(state.equipped.decoration);
  document.querySelectorAll('[data-decoration-slot]').forEach(slot => {
    slot.textContent = accent;
  });
}
function pad2(value){ return String(value).padStart(2, '0'); }
function getLocalDateTimeValue(date = new Date()){
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}
function parseDateOnly(dateString){
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}
function parseTaskDueDate(task){
  if(task.dueAt) return new Date(task.dueAt);
  if(task.date && task.time) return new Date(`${task.date}T${task.time}`);
  if(task.date) return new Date(`${task.date}T23:59:59`);
  return new Date(NaN);
}
function getTaskDueLabel(task){
  const dueDate = parseTaskDueDate(task);
  if(Number.isNaN(dueDate.getTime())) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(dueDate);
}
function getHoursLeft(dueDate){
  return Math.round((dueDate.getTime() - Date.now()) / (60 * 60 * 1000));
}
function getDaysUntilDueDate(dueDate){
  if(Number.isNaN(dueDate.getTime())) return Infinity;
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dueStart = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
  return Math.floor((dueStart.getTime() - todayStart.getTime()) / MS_PER_DAY);
}
function getDaysLeft(dateString){
  const dueDate = parseDateOnly(dateString);
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((dueDate - todayStart) / MS_PER_DAY);
}
function getAutoImportance(task){
  if(task.completed) return 'Low';
  const dueDate = parseTaskDueDate(task);
  if(Number.isNaN(dueDate.getTime())) return task.importance || 'Medium';
  const daysLeft = getDaysUntilDueDate(dueDate);
  if(daysLeft <= 2) return 'High';
  if(daysLeft <= 5) return 'Medium';
  return 'Low';
}
function getPriorityRank(task){
  const importance = getAutoImportance(task);
  if(importance === 'High') return 3;
  if(importance === 'Medium') return 2;
  return 1;
}
function getRelativeDueText(task){
  const dueDate = parseTaskDueDate(task);
  if(Number.isNaN(dueDate.getTime())) return 'Sin fecha';
  const minutesLeft = Math.round((dueDate.getTime() - Date.now()) / (60 * 1000));
  if(task.completed) return 'Completada';
  if(minutesLeft <= 0){
    const overdueHours = Math.abs(Math.round(minutesLeft / 60));
    if(overdueHours < 24) return overdueHours <= 1 ? 'Vencida hace 1 hora' : `Vencida hace ${overdueHours} horas`;
    const overdueDays = Math.ceil(overdueHours / 24);
    return overdueDays === 1 ? 'Vencida hace 1 día' : `Vencida hace ${overdueDays} días`;
  }
  if(minutesLeft < 60) return minutesLeft === 1 ? 'Queda 1 minuto' : `Quedan ${minutesLeft} minutos`;
  const hoursLeft = Math.round(minutesLeft / 60);
  if(hoursLeft < 24) return hoursLeft === 1 ? 'Queda 1 hora' : `Quedan ${hoursLeft} horas`;
  const daysLeft = Math.ceil(hoursLeft / 24);
  return daysLeft === 1 ? 'Queda 1 día' : `Quedan ${daysLeft} días`;
}

function getCategoryLabel(category){
  return TASK_CATEGORIES.includes(category) ? category : DEFAULT_TASK_CATEGORY;
}

function getProjectLabel(projectId){
  if(!projectId) return 'Sin proyecto';
  const project = loadProjects().find(item => item.id === projectId);
  return project ? project.name : 'Proyecto eliminado';
}

function getChecklistProgress(checklist){
  const total = checklist.items.length;
  const completed = checklist.items.filter(item => item.completed).length;
  return { total, completed, percent: total ? Math.round((completed / total) * 100) : 0 };
}

function getProjectTasks(projectId){
  return loadTasks().filter(task => task.projectId === projectId);
}

function debounce(fn, wait){
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), wait);
  };
}

function applyUserVisualSettings(){
  const settings = loadSettings();
  const body = document.body;
  body.style.setProperty('--primary', settings.primaryColor || DEFAULT_SETTINGS.primaryColor);
  body.style.setProperty('--accent', settings.secondaryColor || DEFAULT_SETTINGS.secondaryColor);
  body.style.setProperty('--app-font', `${settings.fontFamily || DEFAULT_SETTINGS.fontFamily}, system-ui, -apple-system, "Segoe UI", Roboto, Arial`);
  body.style.fontFamily = 'var(--app-font)';
  body.dataset.backgroundMode = settings.backgroundMode || DEFAULT_SETTINGS.backgroundMode;
  body.dataset.overlay = settings.darkOverlay === false ? 'off' : 'on';
  if(settings.backgroundMode === 'image' && settings.backgroundImage){
    body.style.backgroundImage = `linear-gradient(rgba(255,255,255,${settings.darkOverlay === false ? '0.02' : '0.12'}), rgba(255,255,255,${settings.darkOverlay === false ? '0.02' : '0.12'})), url('${settings.backgroundImage}')`;
    body.style.backgroundSize = 'cover';
    body.style.backgroundAttachment = 'fixed';
  } else {
    body.style.backgroundImage = '';
    body.style.backgroundSize = '';
    body.style.backgroundAttachment = '';
  }
  const themeMode = settings.themeMode || 'light';
  if(themeMode === 'dark') document.documentElement.setAttribute('data-theme', 'dark'); else document.documentElement.removeAttribute('data-theme');
  const button = qs('themeToggleBtn');
  if(button) button.textContent = document.documentElement.getAttribute('data-theme') === 'dark' ? 'Modo claro' : 'Modo oscuro';
}

function getTaskDateKey(task){
  const dueDate = parseTaskDueDate(task);
  if(Number.isNaN(dueDate.getTime())) return '';
  return `${dueDate.getFullYear()}-${pad2(dueDate.getMonth() + 1)}-${pad2(dueDate.getDate())}`;
}

function getXpLevel(totalXp){
  return Math.max(1, Math.floor(Math.max(0, totalXp) / 100) + 1);
}

function getXpProgressPercent(totalXp){
  return Math.max(0, Math.min(100, Math.round((Math.max(0, totalXp) % 100) / 100 * 100)));
}

function getProgressState(){
  return loadProgress();
}

function updateProgressOnCompletion(isCompleted){
  if(!isCompleted) return;
  const progress = loadProgress();
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = yesterday.toISOString().split('T')[0];
  if(progress.lastCompletionDate !== today){
    progress.streak = progress.lastCompletionDate === yesterdayKey ? (progress.streak || 0) + 1 : 1;
    progress.maxStreak = Math.max(progress.maxStreak || 0, progress.streak);
    progress.lastCompletionDate = today;
  }
  progress.totalXp = (progress.totalXp || 0) + 10;
  saveProgress(progress);
}

function awardTaskXpIfNeeded(task){
  if(!task || !task.completed || task.xpAwarded) return task;
  updateProgressOnCompletion(true);
  task.xpAwarded = true;
  return task;
}

function buildSubtasksFromInput(existingSubtasks = []){
  const input = qs('taskSubtasksInput');
  if(!input) return existingSubtasks.map(normalizeSubtask);
  const existingByTitle = new Map(existingSubtasks.map(item => [item.title.toLowerCase(), item]));
  return input.value
    .split('\n')
    .map(title => title.trim())
    .filter(Boolean)
    .map(title => normalizeSubtask(existingByTitle.get(title.toLowerCase()) || { title, completed: false }));
}

// --- Registration ---
function createUser(){
  const name = qs('nameInput').value.trim();
  const grade = qs('gradeInput').value.trim();
  if(!name || !grade){
    alert('Por favor completa Nombre y Grado.');
    return;
  }
  createUserProfile(name, grade);
  qs('nameInput').value = '';
  qs('gradeInput').value = '';
  loadShopState();
  applyUserVisualSettings();
  renderUserSwitcher();
  showHome();
}

function renderUserSwitcher(){
  const users = getUsers();
  const active = loadUser();
  const select = qs('userSwitcher');
  if(select){
    select.innerHTML = users.length
      ? users.map(user => `<option value="${user.id}">${user.name}</option>`).join('')
      : '<option value="">Sin usuarios</option>';
    select.value = active ? active.id : '';
    select.disabled = users.length === 0;
  }
  const list = qs('registerUsersList');
  if(!list) return;
  list.innerHTML = '';
  if(users.length === 0){
    const empty = document.createElement('p');
    empty.className = 'muted';
    empty.textContent = 'Todavía no hay usuarios.';
    list.appendChild(empty);
    return;
  }
  users.forEach(user => {
    const row = document.createElement('div');
    row.className = 'user-row';
    const label = document.createElement('span');
    label.innerHTML = `<strong>${user.name}</strong> <small class="muted">${user.grade}</small>`;
    const button = document.createElement('button');
    button.className = 'btn small ghost';
    button.textContent = active && active.id === user.id ? 'Activo' : 'Entrar';
    button.disabled = active && active.id === user.id;
    button.addEventListener('click', ()=>switchUser(user.id));
    row.appendChild(label);
    row.appendChild(button);
    list.appendChild(row);
  });
}

// --- Navigation / UI ---
function hideAll(){
  ['register-section','home-section','create-task-section','profile-section','shop-section','calendar-section','settings-section','notes-section','checklists-section','projects-section'].forEach(id=>{
    const section = qs(id);
    if(section) section.classList.add('hidden');
  });
}

function showRegister(){
  hideAll();
  qs('register-section').classList.remove('hidden');
  renderUserSwitcher();
}

function showHome(){
  const user = loadUser();
  if(!user){ showRegister(); return; }
  hideAll();
  qs('home-section').classList.remove('hidden');
  qs('greeting').textContent = `Hola, ${user.name} 👋`;
  renderUserSwitcher();
  renderDashboard();
  renderTasks();
}

function showShop(){
  const user = loadUser();
  if(!user){ showRegister(); return; }
  hideAll();
  qs('shop-section').classList.remove('hidden');
  renderShop();
}

function showNotes(){
  const user = loadUser();
  if(!user){ showRegister(); return; }
  hideAll();
  qs('notes-section').classList.remove('hidden');
  renderNotes();
}

function showChecklists(){
  const user = loadUser();
  if(!user){ showRegister(); return; }
  hideAll();
  qs('checklists-section').classList.remove('hidden');
  renderChecklists();
}

function showProjects(){
  const user = loadUser();
  if(!user){ showRegister(); return; }
  hideAll();
  qs('projects-section').classList.remove('hidden');
  renderProjects();
}

function showCreateTask(taskId = null, projectId = ''){
  const task = taskId ? loadTasks().find(item => item.id === taskId) : null;
  editingTaskId = task ? task.id : null;
  draftProjectTaskId = projectId || (task ? task.projectId || '' : '');
  hideAll();
  qs('create-task-section').classList.remove('hidden');
  setMinTaskDate();
  qs('createTaskHeading').textContent = editingTaskId ? 'Editar tarea' : 'Agregar tarea';
  qs('saveTaskBtn').textContent = editingTaskId ? 'Guardar cambios' : 'Guardar tarea';
  qs('taskTitle').value = task ? task.title : '';
  qs('taskSubject').value = task ? task.subject : '';
  qs('taskDateTime').value = task ? task.dueAt : '';
  if(qs('taskSubtasksInput')) qs('taskSubtasksInput').value = task ? (task.subtasks || []).map(item => item.title).join('\n') : '';
  if(qs('taskCategory')) qs('taskCategory').value = task ? getCategoryLabel(task.category) : DEFAULT_TASK_CATEGORY;
  populateProjectSelect(task ? task.projectId || draftProjectTaskId : draftProjectTaskId);
  updateAutoImportancePreview();
}

function showCalendar(){
  const user = loadUser();
  if(!user){ showRegister(); return; }
  hideAll();
  const calendarSection = qs('calendar-section');
  if(calendarSection) calendarSection.classList.remove('hidden');
  renderCalendar();
}

function showSettings(){
  const user = loadUser();
  if(!user){ showRegister(); return; }
  hideAll();
  const settingsSection = qs('settings-section');
  if(settingsSection) settingsSection.classList.remove('hidden');
  renderSettings();
}

function getTodayDate(){
  const today = new Date();
  return today.toISOString().split('T')[0];
}

function setMinTaskDate(){
  const dateInput = qs('taskDateTime');
  if(dateInput){
    const min = getLocalDateTimeValue();
    dateInput.setAttribute('min', min);
  }
}

function showProfile(){
  const user = loadUser();
  if(!user){ showRegister(); return; }
  hideAll();
  qs('profile-section').classList.remove('hidden');
  if(qs('profileAvatar')) qs('profileAvatar').textContent = (user.name || '?').trim().charAt(0).toUpperCase();
  qs('profileName').textContent = user.name;
  qs('profileGrade').textContent = user.grade;
  qs('editProfileForm').classList.add('hidden');
  renderProfileStats();
}

function getTaskStats(){
  const tasks = loadTasks();
  const shopState = getShopState();
  const progress = loadProgress();
  let completed = 0;
  let overdue = 0;
  let left = 0;
  let totalTasks = 0;
  tasks.forEach(task => {
    totalTasks += 1;
    if(task.completed) completed += 1;
    else {
      left += 1;
      const due = parseTaskDueDate(task);
      if(!Number.isNaN(due.getTime()) && due < new Date()) overdue += 1;
    }
  });
  const earnedPoints = Math.max(0, (completed * 10) - (overdue * 5));
  const totalXp = progress.totalXp || 0;
  const bonusPoints = progress.bonusPoints || 0;
  return {
    totalTasks,
    completed,
    overdue,
    left,
    earnedPoints,
    spentPoints: getShopSpentPoints(shopState),
    bonusPoints,
    points: Math.max(0, earnedPoints + bonusPoints - getShopSpentPoints(shopState)),
    totalXp,
    level: getXpLevel(totalXp),
    streak: progress.streak || 0,
    maxStreak: progress.maxStreak || 0,
    nextTask: getNextUpcomingTask(tasks)
  };
}

function getNextUpcomingTask(tasks = loadTasks()){
  const now = new Date();
  const pending = tasks.filter(task => !task.completed);
  const upcoming = pending.filter(task => parseTaskDueDate(task) >= now);
  const list = (upcoming.length ? upcoming : pending).slice().sort((a, b) => parseTaskDueDate(a) - parseTaskDueDate(b));
  return list[0] || null;
}

function renderProfileStats(){
  const stats = getTaskStats();
  qs('completedCount').textContent = stats.completed;
  qs('overdueCount').textContent = stats.overdue;
  qs('leftCount').textContent = stats.left;
  if(qs('createdCount')) qs('createdCount').textContent = stats.totalTasks;
  qs('pointsCount').textContent = stats.points;
  if(qs('profileLevelCount')) qs('profileLevelCount').textContent = stats.level;
  if(qs('profileXpCount')) qs('profileXpCount').textContent = stats.totalXp;
  if(qs('profileXpBar')) qs('profileXpBar').style.width = `${getXpProgressPercent(stats.totalXp)}%`;
  if(qs('profileStreakCount')) qs('profileStreakCount').textContent = stats.streak;
  if(qs('profileMaxStreakCount')) qs('profileMaxStreakCount').textContent = stats.maxStreak;
}

function renderDashboard(){
  const user = loadUser();
  if(!user) return;
  const stats = getTaskStats();
  const avatar = qs('dashboardAvatar');
  const username = qs('dashboardUsername');
  const points = qs('dashboardPoints');
  const pending = qs('dashboardPending');
  const completed = qs('dashboardCompleted');
  const overdue = qs('dashboardOverdue');
  const spent = qs('dashboardSpent');
  const nextTaskTitle = qs('dashboardNextTaskTitle');
  const nextTaskMeta = qs('dashboardNextTaskMeta');
  const xpValue = qs('dashboardXpValue');
  const xpBar = qs('dashboardXpBar');
  const streakValue = qs('dashboardStreakValue');
  if(avatar) avatar.textContent = (user.name || '?').trim().charAt(0).toUpperCase();
  if(username) username.textContent = user.name;
  if(points) points.textContent = stats.points;
  if(pending) pending.textContent = stats.left;
  if(completed) completed.textContent = stats.completed;
  if(overdue) overdue.textContent = stats.overdue;
  if(spent) spent.textContent = stats.spentPoints;
  if(nextTaskTitle) nextTaskTitle.textContent = stats.nextTask ? stats.nextTask.title : 'No hay tareas próximas';
  if(nextTaskMeta) nextTaskMeta.textContent = stats.nextTask ? `${stats.nextTask.subject} • ${getRelativeDueText(stats.nextTask)}` : 'Agrega una tarea para verla aquí.';
  if(xpValue) xpValue.textContent = `${stats.totalXp} XP`;
  if(xpBar) xpBar.style.width = `${getXpProgressPercent(stats.totalXp)}%`;
  if(streakValue) streakValue.textContent = `${stats.streak} 🔥`;
  renderRecommendation();
}

function renderShop(){
  const state = getShopState();
  const balance = getTaskStats().points;
  const equippedTheme = qs('equippedThemeLabel');
  const equippedStyle = qs('equippedStyleLabel');
  const equippedDecoration = qs('equippedDecorationLabel');
  if(equippedTheme) equippedTheme.textContent = getShopLabel('themes', state.equipped.theme);
  if(equippedStyle) equippedStyle.textContent = getShopLabel('styles', state.equipped.cardStyle);
  if(equippedDecoration) equippedDecoration.textContent = getShopLabel('decorations', state.equipped.decoration);
  if(qs('shopBalance')) qs('shopBalance').textContent = balance;

  renderShopCategory('shopThemesList', 'themes', balance);
  renderShopCategory('shopStylesList', 'styles', balance);
  renderShopCategory('shopDecorationsList', 'decorations', balance);
  applyShopCosmetics();
}

function renderShopCategory(containerId, category, balance){
  const container = qs(containerId);
  if(!container) return;
  const state = getShopState();
  const isPremium = isPremiumUser();
  container.innerHTML = '';
  SHOP_CATALOG[category].forEach(item => {
    const owned = isUnlocked(category, item.id, state);
    const active = category === 'themes' ? state.equipped.theme === item.id : category === 'styles' ? state.equipped.cardStyle === item.id : state.equipped.decoration === item.id;
    const isPremiumOnly = item.cost > 0 && category === 'themes';
    const isLocked = isPremiumOnly && !isPremium && !owned;
    
    const card = document.createElement('div');
    card.className = 'shop-item';
    if(active) card.classList.add('active');
    if(isLocked) card.classList.add('premium-locked');

    const badge = document.createElement('div');
    badge.className = 'shop-item-badge';
    badge.textContent = item.accent;

    const title = document.createElement('h4');
    title.textContent = item.name;

    const description = document.createElement('p');
    description.className = 'muted';
    description.textContent = item.description || 'Cosmético y ligero.';

    const footer = document.createElement('div');
    footer.className = 'shop-item-footer';

    const cost = document.createElement('span');
    cost.className = 'shop-cost';
    cost.textContent = item.cost === 0 ? 'Free' : `${item.cost} pts`;

    const button = document.createElement('button');
    button.className = 'btn small primary';
    if(isLocked){
      button.textContent = '🔒 Premium';
      button.disabled = true;
      button.addEventListener('click', ()=>checkPremiumAccess('Temas exclusivos'));
    } else if(active){
      button.textContent = 'Active';
      button.disabled = true;
    } else if(owned || item.cost === 0){
      button.textContent = 'Equip';
      button.addEventListener('click', ()=>equipShopItem(category, item.id));
    } else {
      button.textContent = item.cost > balance ? 'Need points' : 'Buy';
      button.disabled = item.cost > balance;
      button.addEventListener('click', ()=>buyShopItem(category, item.id));
    }

    footer.appendChild(cost);
    footer.appendChild(button);
    card.appendChild(badge);
    card.appendChild(title);
    card.appendChild(description);
    card.appendChild(footer);
    container.appendChild(card);
  });
}

function refreshAfterShopChange(){
  applyShopCosmetics();
  renderDashboard();
  renderProfileStats();
  if(qs('home-section') && !qs('home-section').classList.contains('hidden')) renderTasks();
  if(qs('shop-section') && !qs('shop-section').classList.contains('hidden')) renderShop();
}

function refreshAfterCoreDataChange(){
  renderDashboard();
  renderProfileStats();
  if(qs('home-section') && !qs('home-section').classList.contains('hidden')) renderTasks();
  if(qs('projects-section') && !qs('projects-section').classList.contains('hidden')) renderProjects();
}

function equipShopItem(category, id){
  const state = getShopState();
  if(!isUnlocked(category, id, state)) return;
  if(category === 'themes') state.equipped.theme = id;
  if(category === 'styles') state.equipped.cardStyle = id;
  if(category === 'decorations') state.equipped.decoration = id;
  saveShopState(state);
  refreshAfterShopChange();
}

function buyShopItem(category, id){
  const state = getShopState();
  const item = getShopItem(category, id);
  if(!item || isUnlocked(category, id, state)){
    equipShopItem(category, id);
    return;
  }
  const balance = getTaskStats().points;
  if(item.cost > balance){
    alert('No tienes puntos suficientes para comprar este artículo.');
    return;
  }
  state.purchased[category].push(id);
  if(category === 'themes') state.equipped.theme = id;
  if(category === 'styles') state.equipped.cardStyle = id;
  if(category === 'decorations') state.equipped.decoration = id;
  saveShopState(state);
  refreshAfterShopChange();
}

function renderNotifications(){
  const container = qs('notificationsContainer');
  if(!container) return;
  const tasks = loadTasks();
  const sortedTasks = sortTasks(tasks, 'soonest');

  container.innerHTML = '';

  if(sortedTasks.length === 0){
    const empty = document.createElement('div');
    empty.className = 'notification-item empty';
    empty.textContent = 'No hay tareas todavía.';
    container.appendChild(empty);
    return;
  }

  sortedTasks.forEach(task => {
    const item = document.createElement('div');
    item.className = 'notification-item';

    const title = document.createElement('strong');
    title.textContent = task.title;

    const message = document.createElement('span');
    message.textContent = getRelativeDueText(task);
    if(task.completed){
      item.classList.add('done');
    } else if(getAutoImportance(task) === 'High'){
      item.classList.add('overdue');
    } else {
      item.classList.add('soon');
    }

    item.appendChild(title);
    item.appendChild(message);
    container.appendChild(item);
  });
}

function resetNoteForm(){
  editingNoteId = null;
  if(qs('noteTitleInput')) qs('noteTitleInput').value = '';
  if(qs('noteContentInput')) qs('noteContentInput').value = '';
  if(qs('noteTagsInput')) qs('noteTagsInput').value = '';
  if(qs('noteSaveBtn')) qs('noteSaveBtn').textContent = 'Guardar nota';
}

function saveNote(){
  const title = qs('noteTitleInput') ? qs('noteTitleInput').value.trim() : '';
  const content = qs('noteContentInput') ? qs('noteContentInput').value.trim() : '';
  const tags = qs('noteTagsInput') ? qs('noteTagsInput').value : '';
  if(!title && !content){
    alert('Escribe un título o contenido para la nota.');
    return;
  }
  const notes = loadNotes();
  if(editingNoteId){
    const index = notes.findIndex(note => note.id === editingNoteId);
    if(index !== -1){
      notes[index] = { ...notes[index], title, content, tags, updatedAt: new Date().toISOString() };
    }
  } else {
    notes.unshift({ id: generateEntityId('note'), title, content, tags, updatedAt: new Date().toISOString() });
  }
  saveNotes(notes.map(normalizeNote));
  resetNoteForm();
  renderNotes();
}

function editNote(id){
  const note = loadNotes().find(item => item.id === id);
  if(!note) return;
  editingNoteId = id;
  if(qs('noteTitleInput')) qs('noteTitleInput').value = note.title;
  if(qs('noteContentInput')) qs('noteContentInput').value = note.content;
  if(qs('noteTagsInput')) qs('noteTagsInput').value = Array.isArray(note.tags) ? note.tags.join(', ') : '';
  if(qs('noteSaveBtn')) qs('noteSaveBtn').textContent = 'Actualizar nota';
}

function deleteNote(id){
  const notes = loadNotes();
  const note = notes.find(item => item.id === id);
  if(!note) return;
  if(!confirm(`¿Eliminar la nota "${note.title || 'sin título'}"?`)) return;
  saveNotes(notes.filter(item => item.id !== id));
  if(editingNoteId === id) resetNoteForm();
  renderNotes();
}

function renderNotes(){
  const container = qs('notesContainer');
  if(!container) return;
  const notes = loadNotes().filter(note => {
    if(!currentNoteSearch) return true;
    const search = currentNoteSearch.toLowerCase();
    const tags = Array.isArray(note.tags) ? note.tags.join(' ') : '';
    return `${note.title} ${note.content} ${tags}`.toLowerCase().includes(search);
  });
  container.innerHTML = '';
  if(notes.length === 0){
    const empty = document.createElement('div');
    empty.className = 'no-tasks';
    empty.textContent = currentNoteSearch ? 'No se encontraron notas.' : 'Todavía no hay notas.';
    container.appendChild(empty);
    return;
  }
  notes.forEach(note => {
    const card = document.createElement('div');
    card.className = 'module-card';
    const header = document.createElement('div');
    header.className = 'module-card-head';
    const dateStr = new Date(note.updatedAt || Date.now()).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' });
    header.innerHTML = `<div><h3>${note.title || 'Sin título'}</h3><p class="muted">${dateStr}</p></div>`;
    const tags = document.createElement('div');
    tags.className = 'tag-row';
    (Array.isArray(note.tags) ? note.tags : []).forEach(tag => {
      const span = document.createElement('span');
      span.className = 'task-badge';
      span.textContent = tag;
      tags.appendChild(span);
    });
    const content = document.createElement('p');
    content.className = 'module-text';
    content.textContent = note.content || 'Sin contenido';
    const actions = document.createElement('div');
    actions.className = 'actions';
    const editBtn = document.createElement('button');
    editBtn.className = 'btn ghost';
    editBtn.textContent = 'Editar';
    editBtn.addEventListener('click', ()=>editNote(note.id));
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn danger';
    deleteBtn.textContent = 'Eliminar';
    deleteBtn.addEventListener('click', ()=>deleteNote(note.id));
    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);
    card.appendChild(header);
    if(tags.childNodes.length) card.appendChild(tags);
    card.appendChild(content);
    card.appendChild(actions);
    container.appendChild(card);
  });
}

function createChecklist(){
  const title = qs('checklistTitleInput') ? qs('checklistTitleInput').value.trim() : '';
  const firstItem = qs('checklistItemInput') ? qs('checklistItemInput').value.trim() : '';
  if(!title){
    alert('Escribe un título para la checklist.');
    return;
  }
  const checklists = loadChecklists();
  checklists.unshift({
    id: generateEntityId('checklist'),
    title,
    items: firstItem ? [{ id: generateEntityId('checkitem'), text: firstItem, completed: false }] : [],
    updatedAt: new Date().toISOString()
  });
  saveChecklists(checklists.map(normalizeChecklist));
  if(qs('checklistTitleInput')) qs('checklistTitleInput').value = '';
  if(qs('checklistItemInput')) qs('checklistItemInput').value = '';
  renderChecklists();
}

function editChecklistTitle(id){
  const checklists = loadChecklists();
  const checklist = checklists.find(item => item.id === id);
  if(!checklist) return;
  const nextTitle = prompt('Nuevo título de la checklist', checklist.title);
  if(nextTitle === null) return;
  checklist.title = nextTitle.trim() || checklist.title;
  checklist.updatedAt = new Date().toISOString();
  saveChecklists(checklists);
  renderChecklists();
}

function deleteChecklist(id){
  const checklists = loadChecklists();
  const checklist = checklists.find(item => item.id === id);
  if(!checklist) return;
  if(!confirm(`¿Eliminar la checklist "${checklist.title}"?`)) return;
  saveChecklists(checklists.filter(item => item.id !== id));
  renderChecklists();
}

function addChecklistItem(id){
  const input = qs(`checklist-item-input-${id}`);
  const value = input ? input.value.trim() : '';
  if(!value) return;
  const checklists = loadChecklists();
  const checklist = checklists.find(item => item.id === id);
  if(!checklist) return;
  checklist.items.push({ id: generateEntityId('checkitem'), text: value, completed: false });
  checklist.updatedAt = new Date().toISOString();
  saveChecklists(checklists.map(normalizeChecklist));
  if(input) input.value = '';
  renderChecklists();
}

function toggleChecklistItem(checklistId, itemId){
  const checklists = loadChecklists();
  const checklist = checklists.find(item => item.id === checklistId);
  if(!checklist) return;
  const item = checklist.items.find(entry => entry.id === itemId);
  if(!item) return;
  item.completed = !item.completed;
  checklist.updatedAt = new Date().toISOString();
  saveChecklists(checklists);
  renderChecklists();
}

function editChecklistItem(checklistId, itemId){
  const checklists = loadChecklists();
  const checklist = checklists.find(item => item.id === checklistId);
  if(!checklist) return;
  const item = checklist.items.find(entry => entry.id === itemId);
  if(!item) return;
  const nextText = prompt('Editar elemento', item.text);
  if(nextText === null) return;
  item.text = nextText.trim() || item.text;
  checklist.updatedAt = new Date().toISOString();
  saveChecklists(checklists);
  renderChecklists();
}

function deleteChecklistItem(checklistId, itemId){
  const checklists = loadChecklists();
  const checklist = checklists.find(item => item.id === checklistId);
  if(!checklist) return;
  checklist.items = checklist.items.filter(entry => entry.id !== itemId);
  checklist.updatedAt = new Date().toISOString();
  saveChecklists(checklists);
  renderChecklists();
}

function renderChecklists(){
  const container = qs('checklistsContainer');
  if(!container) return;
  const checklists = loadChecklists().filter(checklist => {
    if(!currentChecklistSearch) return true;
    const search = currentChecklistSearch.toLowerCase();
    const itemText = checklist.items.map(item => item.text).join(' ');
    return `${checklist.title} ${itemText}`.toLowerCase().includes(search);
  });
  container.innerHTML = '';
  if(checklists.length === 0){
    const empty = document.createElement('div');
    empty.className = 'no-tasks';
    empty.textContent = currentChecklistSearch ? 'No se encontraron checklists.' : 'Todavía no hay checklists.';
    container.appendChild(empty);
    return;
  }
  checklists.forEach(checklist => {
    const progress = getChecklistProgress(checklist);
    const card = document.createElement('div');
    card.className = 'module-card';
    const header = document.createElement('div');
    header.className = 'module-card-head';
    header.innerHTML = `<div><h3>${checklist.title}</h3><p class="muted">${progress.completed}/${progress.total} completados</p></div>`;
    const meta = document.createElement('div');
    meta.className = 'xp-bar';
    meta.innerHTML = `<span style="width:${progress.percent}%"></span>`;
    const list = document.createElement('div');
    list.className = 'checklist-items';
    checklist.items.forEach(item => {
      const row = document.createElement('div');
      row.className = 'checklist-item';
      const label = document.createElement('label');
      label.className = 'checklist-item-label';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = item.completed;
      checkbox.addEventListener('change', ()=>toggleChecklistItem(checklist.id, item.id));
      const text = document.createElement('span');
      text.textContent = item.text;
      label.appendChild(checkbox);
      label.appendChild(text);
      const actions = document.createElement('div');
      actions.className = 'task-actions';
      const editBtn = document.createElement('button');
      editBtn.className = 'btn ghost small';
      editBtn.textContent = 'Editar';
      editBtn.addEventListener('click', ()=>editChecklistItem(checklist.id, item.id));
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn danger small';
      deleteBtn.textContent = 'Eliminar';
      deleteBtn.addEventListener('click', ()=>deleteChecklistItem(checklist.id, item.id));
      actions.appendChild(editBtn);
      actions.appendChild(deleteBtn);
      row.appendChild(label);
      row.appendChild(actions);
      list.appendChild(row);
    });
    const addRow = document.createElement('div');
    addRow.className = 'checklist-add-row';
    addRow.innerHTML = `<input id="checklist-item-input-${checklist.id}" type="text" placeholder="Agregar elemento" /><button class="btn primary small" type="button">Agregar</button>`;
    addRow.querySelector('button').addEventListener('click', ()=>addChecklistItem(checklist.id));
    const footer = document.createElement('div');
    footer.className = 'actions';
    const editBtn = document.createElement('button');
    editBtn.className = 'btn ghost';
    editBtn.textContent = 'Editar título';
    editBtn.addEventListener('click', ()=>editChecklistTitle(checklist.id));
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn danger';
    deleteBtn.textContent = 'Eliminar checklist';
    deleteBtn.addEventListener('click', ()=>deleteChecklist(checklist.id));
    footer.appendChild(editBtn);
    footer.appendChild(deleteBtn);
    card.appendChild(header);
    card.appendChild(meta);
    card.appendChild(list);
    card.appendChild(addRow);
    card.appendChild(footer);
    container.appendChild(card);
  });
}

function resetProjectForm(){
  editingProjectId = null;
  if(qs('projectNameInput')) qs('projectNameInput').value = '';
  if(qs('projectSectionInput')) qs('projectSectionInput').value = '';
  if(qs('projectDescriptionInput')) qs('projectDescriptionInput').value = '';
  if(qs('projectSaveBtn')) qs('projectSaveBtn').textContent = 'Guardar proyecto';
}

function saveProject(){
  const name = qs('projectNameInput') ? qs('projectNameInput').value.trim() : '';
  const section = qs('projectSectionInput') ? qs('projectSectionInput').value.trim() : '';
  const description = qs('projectDescriptionInput') ? qs('projectDescriptionInput').value.trim() : '';
  if(!name){
    alert('Escribe un nombre para el proyecto.');
    return;
  }
  const projects = loadProjects();
  if(editingProjectId){
    const index = projects.findIndex(project => project.id === editingProjectId);
    if(index !== -1){
      projects[index] = { ...projects[index], name, section, description, updatedAt: new Date().toISOString() };
    }
  } else {
    projects.unshift({ id: generateEntityId('project'), name, section, description, updatedAt: new Date().toISOString() });
  }
  saveProjects(projects.map(normalizeProject));
  resetProjectForm();
  renderProjects();
  populateProjectSelect(draftProjectTaskId);
}

function editProject(id){
  const project = loadProjects().find(item => item.id === id);
  if(!project) return;
  editingProjectId = id;
  if(qs('projectNameInput')) qs('projectNameInput').value = project.name;
  if(qs('projectSectionInput')) qs('projectSectionInput').value = project.section;
  if(qs('projectDescriptionInput')) qs('projectDescriptionInput').value = project.description;
  if(qs('projectSaveBtn')) qs('projectSaveBtn').textContent = 'Actualizar proyecto';
}

function deleteProject(id){
  const projects = loadProjects();
  const project = projects.find(item => item.id === id);
  if(!project) return;
  if(!confirm(`¿Eliminar el proyecto "${project.name}"? Las tareas se conservarán sin proyecto.`)) return;
  saveProjects(projects.filter(item => item.id !== id));
  const tasks = loadTasks().map(task => task.projectId === id ? { ...task, projectId: '' } : task);
  saveTasks(tasks);
  renderProjects();
  if(qs('home-section') && !qs('home-section').classList.contains('hidden')) renderTasks();
  populateProjectSelect(draftProjectTaskId);
}

function renderProjectTaskSummary(projectId){
  const tasks = getProjectTasks(projectId);
  const completed = tasks.filter(task => task.completed).length;
  const total = tasks.length;
  const pending = total - completed;
  const percent = total ? Math.round((completed / total) * 100) : 0;
  return { tasks, completed, total, pending, percent };
}

function renderProjects(){
  const container = qs('projectsContainer');
  if(!container) return;
  const projects = loadProjects().filter(project => {
    if(!currentProjectSearch) return true;
    const search = currentProjectSearch.toLowerCase();
    return `${project.name} ${project.section} ${project.description}`.toLowerCase().includes(search);
  });
  container.innerHTML = '';
  if(projects.length === 0){
    const empty = document.createElement('div');
    empty.className = 'no-tasks';
    empty.textContent = currentProjectSearch ? 'No se encontraron proyectos.' : 'Todavía no hay proyectos.';
    container.appendChild(empty);
    return;
  }
  projects.forEach(project => {
    const summary = renderProjectTaskSummary(project.id);
    const card = document.createElement('div');
    card.className = 'module-card';
    const header = document.createElement('div');
    header.className = 'module-card-head';
    header.innerHTML = `<div><h3>${project.name}</h3><p class="muted">${project.section || 'Sin sección'} · ${summary.completed}/${summary.total} tareas</p></div><strong>${summary.percent}%</strong>`;
    const progress = document.createElement('div');
    progress.className = 'xp-bar';
    progress.innerHTML = `<span style="width:${summary.percent}%"></span>`;
    const description = document.createElement('p');
    description.className = 'module-text';
    description.textContent = project.description || 'Sin descripción';
    const taskList = document.createElement('div');
    taskList.className = 'project-task-list';
    summary.tasks.slice(0, 6).forEach(task => {
      const row = document.createElement('div');
      row.className = 'project-task-row';
      row.innerHTML = `<span>${task.title}</span><small class="muted">${getCategoryLabel(task.category)} · ${task.completed ? 'Completada' : 'Pendiente'}</small>`;
      const action = document.createElement('button');
      action.className = 'btn ghost small';
      action.textContent = 'Editar tarea';
      action.addEventListener('click', ()=>showCreateTask(task.id, project.id));
      row.appendChild(action);
      taskList.appendChild(row);
    });
    const actions = document.createElement('div');
    actions.className = 'actions';
    const newTaskBtn = document.createElement('button');
    newTaskBtn.className = 'btn primary';
    newTaskBtn.textContent = 'Nueva tarea';
    newTaskBtn.addEventListener('click', ()=>showCreateTask(null, project.id));
    const editBtn = document.createElement('button');
    editBtn.className = 'btn ghost';
    editBtn.textContent = 'Editar proyecto';
    editBtn.addEventListener('click', ()=>editProject(project.id));
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn danger';
    deleteBtn.textContent = 'Eliminar';
    deleteBtn.addEventListener('click', ()=>deleteProject(project.id));
    actions.appendChild(newTaskBtn);
    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);
    card.appendChild(header);
    card.appendChild(progress);
    card.appendChild(description);
    card.appendChild(taskList);
    card.appendChild(actions);
    container.appendChild(card);
  });
}

function populateProjectSelect(selectedId = ''){
  const select = qs('taskProject');
  if(!select) return;
  const projects = loadProjects();
  select.innerHTML = '<option value="">Sin proyecto</option>' + projects.map(project => `<option value="${project.id}">${project.name}</option>`).join('');
  if(selectedId) select.value = selectedId;
  else if(draftProjectTaskId) select.value = draftProjectTaskId;
}

function getCalendarLabel(date){
  return new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(date);
}

function getCalendarGrid(date){
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const startDate = new Date(year, month, 1 - startOffset);
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(startDate);
    day.setDate(startDate.getDate() + index);
    return day;
  });
}

function getTasksForDateKey(dateKey){
  return loadTasks().filter(task => getTaskDateKey(task) === dateKey);
}

function renderCalendarTaskPanel(dateKey){
  const panel = qs('calendarTaskPanel');
  if(!panel) return;
  panel.innerHTML = '';
  if(!dateKey){
    panel.innerHTML = '<p class="muted">Selecciona un día para ver sus tareas.</p>';
    return;
  }
  const tasks = getTasksForDateKey(dateKey).sort((a, b) => parseTaskDueDate(a) - parseTaskDueDate(b));
  const heading = document.createElement('h4');
  heading.textContent = `${dateKey} • ${tasks.length} tarea${tasks.length === 1 ? '' : 's'}`;
  panel.appendChild(heading);
  if(tasks.length === 0){
    const empty = document.createElement('p');
    empty.className = 'muted';
    empty.textContent = 'No hay tareas para este día.';
    panel.appendChild(empty);
    return;
  }
  tasks.forEach(task => {
    const row = document.createElement('div');
    row.className = 'calendar-task-row';
    row.innerHTML = `<strong>${task.title}</strong><span>${task.subject} • ${getRelativeDueText(task)}</span>`;
    const actions = document.createElement('div');
    actions.className = 'calendar-task-actions';
    const editBtn = document.createElement('button');
    editBtn.className = 'btn small ghost';
    editBtn.textContent = 'Editar';
    editBtn.addEventListener('click', ()=>showCreateTask(task.id));
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'btn small primary';
    toggleBtn.textContent = task.completed ? 'Reabrir' : 'Completar';
    toggleBtn.addEventListener('click', ()=>toggleTask(loadTasks().findIndex(item => item.id === task.id)));
    actions.appendChild(editBtn);
    actions.appendChild(toggleBtn);
    row.appendChild(actions);
    panel.appendChild(row);
  });
}

function renderCalendar(){
  const monthLabel = qs('calendarMonthLabel');
  const grid = qs('calendarGrid');
  const summary = qs('calendarSummary');
  if(monthLabel) monthLabel.textContent = getCalendarLabel(currentCalendarMonth);
  if(summary){
    const total = loadTasks().filter(task => getTaskDateKey(task).startsWith(`${currentCalendarMonth.getFullYear()}-${pad2(currentCalendarMonth.getMonth() + 1)}`)).length;
    summary.textContent = `${total} tareas en este mes`;
  }
  if(!grid) return;
  grid.innerHTML = '';
  const todayKey = new Date().toISOString().split('T')[0];
  const cells = getCalendarGrid(currentCalendarMonth);
  const tasks = loadTasks();
  cells.forEach(day => {
    const dateKey = day.toISOString().split('T')[0];
    const dayTasks = tasks.filter(task => getTaskDateKey(task) === dateKey);
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'calendar-day';
    if(day.getMonth() !== currentCalendarMonth.getMonth()) cell.classList.add('muted-day');
    if(dateKey === todayKey) cell.classList.add('today');
    if(dayTasks.some(task => !task.completed && parseTaskDueDate(task) < new Date())) cell.classList.add('overdue');
    else if(dayTasks.some(task => !task.completed)) cell.classList.add('soon');
    if(selectedCalendarDate === dateKey) cell.classList.add('selected');
    cell.innerHTML = `<span class="calendar-day-number">${day.getDate()}</span><span class="calendar-day-count">${dayTasks.length ? `${dayTasks.length} tarea${dayTasks.length === 1 ? '' : 's'}` : ''}</span>`;
    cell.addEventListener('click', ()=>{
      selectedCalendarDate = dateKey;
      renderCalendar();
    });
    grid.appendChild(cell);
  });
  renderCalendarTaskPanel(selectedCalendarDate);
}

function shiftCalendarMonth(offset){
  currentCalendarMonth = new Date(currentCalendarMonth.getFullYear(), currentCalendarMonth.getMonth() + offset, 1);
  renderCalendar();
}

function renderSettings(){
  const settings = loadSettings();
  const themeSelect = qs('settingsThemeMode');
  const primaryInput = qs('settingsPrimaryColor');
  const secondaryInput = qs('settingsSecondaryColor');
  const fontSelect = qs('settingsFontFamily');
  const backgroundSelect = qs('settingsBackgroundMode');
  const overlayToggle = qs('settingsOverlayToggle');
  const autoCompleteToggle = qs('settingsAutoCompleteSubtasks');
  const premiumToggle = qs('premiumToggle');
  if(themeSelect) themeSelect.value = settings.themeMode;
  if(primaryInput) primaryInput.value = settings.primaryColor;
  if(secondaryInput) secondaryInput.value = settings.secondaryColor;
  if(fontSelect) fontSelect.value = settings.fontFamily;
  if(backgroundSelect) backgroundSelect.value = settings.backgroundMode;
  if(overlayToggle) overlayToggle.checked = settings.darkOverlay !== false;
  if(autoCompleteToggle) autoCompleteToggle.checked = settings.autoCompleteTaskWithSubtasks !== false;
  if(premiumToggle) premiumToggle.checked = settings.isPremium === true;
  if(qs('settingsBackgroundStatus')){
    qs('settingsBackgroundStatus').textContent = settings.backgroundImage ? 'Imagen cargada' : 'Sin imagen personalizada';
  }
  const bonusPoints = loadProgress().bonusPoints || 0;
  if(qs('settingsBonusPoints')) qs('settingsBonusPoints').value = String(bonusPoints);
  if(qs('settingsBonusStatus')) qs('settingsBonusStatus').textContent = `Puntos manuales actuales: ${bonusPoints}`;
  renderSettingsUserCard();
}

function persistVisualSettings(){
  const settings = loadSettings();
  const themeSelect = qs('settingsThemeMode');
  const primaryInput = qs('settingsPrimaryColor');
  const secondaryInput = qs('settingsSecondaryColor');
  const fontSelect = qs('settingsFontFamily');
  const backgroundSelect = qs('settingsBackgroundMode');
  const overlayToggle = qs('settingsOverlayToggle');
  const autoCompleteToggle = qs('settingsAutoCompleteSubtasks');
  settings.themeMode = themeSelect ? themeSelect.value : settings.themeMode;
  settings.primaryColor = primaryInput ? primaryInput.value : settings.primaryColor;
  settings.secondaryColor = secondaryInput ? secondaryInput.value : settings.secondaryColor;
  settings.fontFamily = fontSelect ? fontSelect.value : settings.fontFamily;
  settings.backgroundMode = backgroundSelect ? backgroundSelect.value : settings.backgroundMode;
  settings.darkOverlay = overlayToggle ? overlayToggle.checked : settings.darkOverlay;
  settings.autoCompleteTaskWithSubtasks = autoCompleteToggle ? autoCompleteToggle.checked : settings.autoCompleteTaskWithSubtasks;
  saveSettings(settings);
  applyUserVisualSettings();
  renderDashboard();
  renderProfileStats();
  if(qs('shop-section') && !qs('shop-section').classList.contains('hidden')) renderShop();
}

function setSettingsBackgroundImage(file){
  if(!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const settings = loadSettings();
    settings.backgroundImage = String(reader.result || '');
    settings.backgroundMode = 'image';
    saveSettings(settings);
    applyUserVisualSettings();
    renderSettings();
  };
  reader.readAsDataURL(file);
}

function exportBackup(){
  const backup = {
    appState: loadAppState(),
    user: loadUser(),
    tasks: loadTasks(),
    shop: getShopState(),
    progress: loadProgress(),
    settings: loadSettings(),
    notes: loadNotes(),
    checklists: loadChecklists(),
    projects: loadProjects()
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `taskflow-backup-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function importBackupFile(file){
  if(!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try{
      const data = JSON.parse(String(reader.result || '{}'));
      if(data.appState && data.appState.users){
        saveAppState(normalizeAppState(data.appState));
      } else if(data.user){
        const user = createUserProfile(data.user.name || 'Usuario importado', data.user.grade || 'Sin grado');
        saveUser({ ...data.user, id: user.id });
      }
      if(Array.isArray(data.tasks)) saveTasks(data.tasks.map(normalizeTask));
      if(data.shop) saveShopState(data.shop);
      if(data.progress) saveProgress({ ...DEFAULT_PROGRESS, ...data.progress });
      if(data.settings) saveSettings({ ...DEFAULT_SETTINGS, ...data.settings });
      if(Array.isArray(data.notes)) saveNotes(data.notes.map(normalizeNote));
      if(Array.isArray(data.checklists)) saveChecklists(data.checklists.map(normalizeChecklist));
      if(Array.isArray(data.projects)) saveProjects(data.projects.map(normalizeProject));
      applyUserVisualSettings();
      loadShopState();
      renderUserSwitcher();
      showHome();
    } catch {
      alert('El archivo de respaldo no es válido.');
    }
  };
  reader.readAsText(file);
}

function applyManualPoints(){
  const input = qs('settingsBonusPoints');
  const amount = input ? Number(input.value) : NaN;
  if(Number.isNaN(amount)){
    alert('Introduce un número válido de puntos.');
    return;
  }
  const progress = loadProgress();
  progress.bonusPoints = Math.max(0, Math.floor(amount));
  saveProgress(progress);
  if(qs('settingsBonusStatus')) qs('settingsBonusStatus').textContent = `Puntos manuales actuales: ${progress.bonusPoints}`;
  renderDashboard();
  renderProfileStats();
  if(qs('shop-section') && !qs('shop-section').classList.contains('hidden')) renderShop();
}

function clearManualPoints(){
  const progress = loadProgress();
  progress.bonusPoints = 0;
  saveProgress(progress);
  if(qs('settingsBonusPoints')) qs('settingsBonusPoints').value = '0';
  if(qs('settingsBonusStatus')) qs('settingsBonusStatus').textContent = 'Puntos manuales actuales: 0';
  renderDashboard();
  renderProfileStats();
  if(qs('shop-section') && !qs('shop-section').classList.contains('hidden')) renderShop();
}

function resetSystem(){
  if(!confirm('¿Restablecer toda la aplicación? Se eliminarán cuenta, tareas, progreso, shop y ajustes.')) return;
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(TASKS_KEY);
  localStorage.removeItem(SHOP_KEY);
  localStorage.removeItem(PROGRESS_KEY);
  localStorage.removeItem(SETTINGS_KEY);
  localStorage.removeItem(NOTES_KEY);
  localStorage.removeItem(CHECKLISTS_KEY);
  localStorage.removeItem(PROJECTS_KEY);
  localStorage.removeItem(APP_STATE_KEY);
  showRegister();
}

function renderSettingsUserCard(){
  const user = loadUser();
  const users = getUsers();
  const currentUserName = qs('settingsCurrentUserName');
  const currentUserGrade = qs('settingsCurrentUserGrade');
  const userSwitcher = qs('settingsUserSwitcher');
  
  if(currentUserName) currentUserName.textContent = user ? user.name : '-';
  if(currentUserGrade) currentUserGrade.textContent = user ? user.grade : '-';
  
  if(userSwitcher){
    userSwitcher.innerHTML = '<option value="">Seleccionar usuario...</option>' + 
      users.map(u => `<option value="${u.id}" ${user && user.id === u.id ? 'selected' : ''}>${u.name}</option>`).join('');
  }
}

function showSettingsUserForm(){
  qs('settingsUserForm').classList.remove('hidden');
  qs('settingsNewUserName').value = '';
  qs('settingsNewUserGrade').value = '';
}

function hideSettingsUserForm(){
  qs('settingsUserForm').classList.add('hidden');
}

function createSettingsUser(){
  const name = qs('settingsNewUserName').value.trim();
  const grade = qs('settingsNewUserGrade').value.trim();
  if(!name || !grade){
    alert('Por favor completa Nombre y Grado.');
    return;
  }
  createUserProfile(name, grade);
  hideSettingsUserForm();
  renderSettingsUserCard();
  renderUserSwitcher();
  showHome();
}

function switchSettingsUser(userId){
  if(!userId) return;
  switchUser(userId);
  renderSettingsUserCard();
}

function logoutFromSettings(){
  if(!confirm('¿Cerrar sesión actual?')) return;
  const users = getUsers();
  if(users.length > 1){
    deleteActiveUser();
    renderSettingsUserCard();
    renderUserSwitcher();
    showHome();
  } else {
    alert('No puedes cerrar sesión si es el único usuario. Crea otra cuenta primero.');
  }
}

function isPremiumUser(){
  const settings = loadSettings();
  return settings.isPremium === true;
}

function togglePremium(){
  const settings = loadSettings();
  settings.isPremium = !settings.isPremium;
  saveSettings(settings);
  renderSettings();
  updatePremiumUI();
}

function updatePremiumUI(){
  const isPremium = isPremiumUser();
  
  // Update premium toggle in settings
  const toggle = qs('premiumToggle');
  if(toggle) toggle.checked = isPremium;
  
  // Update plan list locked status
  const lockedLists = document.querySelectorAll('.plan-list.locked');
  lockedLists.forEach(list => {
    if(isPremium){
      list.classList.remove('locked');
    } else {
      list.classList.add('locked');
    }
  });
  
  // Update shop premium themes
  renderShop();
  
  // Update premium features visibility
  updatePremiumFeatures();
}

function updatePremiumFeatures(){
  const isPremium = isPremiumUser();
  
  // Advanced statistics
  const advancedStats = qs('advancedStatsSection');
  if(advancedStats){
    if(isPremium){
      advancedStats.classList.remove('hidden');
      renderAdvancedStats();
    } else {
      advancedStats.classList.add('hidden');
    }
  }
  
  // Smart recommendations
  const smartRecs = qs('smartRecommendationsSection');
  if(smartRecs){
    if(isPremium){
      smartRecs.classList.remove('hidden');
      renderSmartRecommendations();
    } else {
      smartRecs.classList.add('hidden');
    }
  }
  
  // Export data button
  const exportBtn = qs('premiumExportBtn');
  if(exportBtn){
    if(isPremium){
      exportBtn.classList.remove('hidden');
    } else {
      exportBtn.classList.add('hidden');
    }
  }
}

function checkPremiumAccess(featureName){
  if(!isPremiumUser()){
    alert(`¡Función exclusiva de Plan Premium!\n\n${featureName} está disponible solo para usuarios Premium.\nActiva el modo Premium en Ajustes para acceder.`);
    return false;
  }
  return true;
}

function renderAdvancedStats(){
  const tasks = loadTasks();
  const completedTasks = tasks.filter(t => t.completed);
  const totalTasks = tasks.length;
  const completionRate = totalTasks ? Math.round((completedTasks.length / totalTasks) * 100) : 0;
  
  // Tasks by category
  const byCategory = {};
  tasks.forEach(task => {
    const category = getCategoryLabel(task.category);
    byCategory[category] = (byCategory[category] || 0) + 1;
  });
  
  // Tasks by importance
  const byImportance = { High: 0, Medium: 0, Low: 0 };
  tasks.forEach(task => {
    const importance = getAutoImportance(task);
    byImportance[importance]++;
  });
  
  const container = qs('advancedStatsContent');
  if(!container) return;
  
  container.innerHTML = `
    <div class="stats-summary">
      <div class="stat-item">
        <span class="stat-label">Tasa de completado</span>
        <span class="stat-value">${completionRate}%</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Total tareas</span>
        <span class="stat-value">${totalTasks}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Completadas</span>
        <span class="stat-value">${completedTasks.length}</span>
      </div>
    </div>
    <div class="stats-breakdown">
      <h4>Por categoría</h4>
      <div class="stats-bars">
        ${Object.entries(byCategory).map(([cat, count]) => `
          <div class="stat-bar">
            <span class="stat-bar-label">${cat}</span>
            <div class="stat-bar-track">
              <div class="stat-bar-fill" style="width:${totalTasks ? (count/totalTasks)*100 : 0}%"></div>
            </div>
            <span class="stat-bar-value">${count}</span>
          </div>
        `).join('')}
      </div>
      <h4>Por importancia</h4>
      <div class="stats-bars">
        ${Object.entries(byImportance).map(([imp, count]) => `
          <div class="stat-bar">
            <span class="stat-bar-label">${imp}</span>
            <div class="stat-bar-track">
              <div class="stat-bar-fill importance-${imp.toLowerCase()}" style="width:${totalTasks ? (count/totalTasks)*100 : 0}%"></div>
            </div>
            <span class="stat-bar-value">${count}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderSmartRecommendations(){
  const tasks = loadTasks();
  const pendingTasks = tasks.filter(t => !t.completed);
  const recommendations = [];
  
  // High priority tasks
  const highPriorityTasks = pendingTasks.filter(t => getAutoImportance(t) === 'High');
  if(highPriorityTasks.length > 2){
    recommendations.push({
      type: 'warning',
      text: `Tienes ${highPriorityTasks.length} tareas con prioridad Alta. Te recomendamos empezar por la más corta para reducir el estrés.`
    });
  }
  
  // Overdue tasks
  const overdueTasks = pendingTasks.filter(t => {
    const due = parseTaskDueDate(t);
    return !Number.isNaN(due.getTime()) && due < new Date();
  });
  if(overdueTasks.length > 0){
    recommendations.push({
      type: 'urgent',
      text: `Tienes ${overdueTasks.length} tareas vencidas. Prioriza completarlas hoy mismo.`
    });
  }
  
  // Productivity tip
  const completedToday = tasks.filter(t => t.completed).length;
  if(completedToday > 5){
    recommendations.push({
      type: 'success',
      text: `¡Excelente productividad! Has completado ${completedToday} tareas. Considera tomar un descanso breve.`
    });
  }
  
  // Category balance
  const byCategory = {};
  pendingTasks.forEach(task => {
    const category = getCategoryLabel(task.category);
    byCategory[category] = (byCategory[category] || 0) + 1;
  });
  const dominantCategory = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];
  if(dominantCategory && dominantCategory[1] > 3){
    recommendations.push({
      type: 'info',
      text: `La mayoría de tus tareas pendientes son de "${dominantCategory[0]}". Considera equilibrar tu carga de trabajo.`
    });
  }
  
  const container = qs('smartRecommendationsContent');
  if(!container) return;
  
  if(recommendations.length === 0){
    container.innerHTML = '<p class="muted">No hay recomendaciones específicas en este momento. ¡Sigue así!</p>';
    return;
  }
  
  container.innerHTML = recommendations.map(rec => `
    <div class="recommendation-item ${rec.type}">
      <span class="recommendation-icon">${rec.type === 'urgent' ? '⚠️' : rec.type === 'warning' ? '🔔' : rec.type === 'success' ? '✅' : '💡'}</span>
      <span class="recommendation-text">${rec.text}</span>
    </div>
  `).join('');
}

function exportPremiumData(){
  if(!checkPremiumAccess('Exportar datos')) return;
  
  const user = loadUser();
  const tasks = loadTasks();
  const stats = getTaskStats();
  
  const exportData = {
    usuario: user ? user.name : 'N/A',
    fechaExportacion: new Date().toISOString(),
    estadisticas: {
      totalTareas: stats.totalTasks,
      tareasCompletadas: stats.completed,
      tareasPendientes: stats.left,
      puntos: stats.points,
      nivel: stats.level,
      xpTotal: stats.totalXp,
      racha: stats.streak
    },
    tareas: tasks.map(task => ({
      titulo: task.title,
      materia: task.subject,
      categoria: getCategoryLabel(task.category),
      estado: task.completed ? 'Completada' : 'Pendiente',
      importancia: getAutoImportance(task),
      fechaEntrega: task.dueAt,
      proyecto: getProjectLabel(task.projectId),
      subtareas: task.subtasks.length
    }))
  };
  
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `taskflow-export-${user ? user.name : 'usuario'}-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

// --- Focus Mode (Pomodoro) ---
let focusTimerInterval = null;
let focusTimeRemaining = 25 * 60; // 25 minutes in seconds
let focusTaskId = null;
let focusIsRunning = false;

function enterFocusMode(taskId = null){
  const tasks = loadTasks();
  const pendingTasks = tasks.filter(t => !t.completed);
  
  if(pendingTasks.length === 0){
    alert('No tienes tareas pendientes para enfocarte.');
    return;
  }
  
  focusTaskId = taskId || pendingTasks[0].id;
  const task = tasks.find(t => t.id === focusTaskId);
  
  if(!task) return;
  
  hideAll();
  qs('focusModeSection').classList.remove('hidden');
  
  qs('focusTaskTitle').textContent = task.title;
  qs('focusTaskSubject').textContent = task.subject;
  qs('focusTaskMeta').textContent = `${getCategoryLabel(task.category)} • ${getRelativeDueText(task)}`;
  
  resetFocusTimer();
}

function exitFocusMode(){
  pauseFocusTimer();
  hideAll();
  showHome();
}

function resetFocusTimer(){
  pauseFocusTimer();
  focusTimeRemaining = 25 * 60;
  updateTimerDisplay();
  qs('timerStatus').textContent = 'Listo para comenzar';
  qs('startTimerBtn').classList.remove('hidden');
  qs('pauseTimerBtn').classList.add('hidden');
}

function startFocusTimer(){
  if(focusIsRunning) return;
  focusIsRunning = true;
  qs('timerStatus').textContent = '🎯 Enfócate en tu tarea';
  qs('startTimerBtn').classList.add('hidden');
  qs('pauseTimerBtn').classList.remove('hidden');
  
  focusTimerInterval = setInterval(() => {
    focusTimeRemaining--;
    updateTimerDisplay();
    
    if(focusTimeRemaining <= 0){
      pauseFocusTimer();
      qs('timerStatus').textContent = '🎉 ¡Tiempo completado! Tómate un descanso.';
      if(confirm('¡Tiempo completado! ¿Quieres marcar la tarea como completada?')){
        completeFocusTask();
      }
    }
  }, 1000);
}

function pauseFocusTimer(){
  focusIsRunning = false;
  if(focusTimerInterval){
    clearInterval(focusTimerInterval);
    focusTimerInterval = null;
  }
  qs('timerStatus').textContent = focusTimeRemaining > 0 ? 'Pausado' : 'Completado';
  qs('startTimerBtn').classList.remove('hidden');
  qs('pauseTimerBtn').classList.add('hidden');
}

function updateTimerDisplay(){
  const minutes = Math.floor(focusTimeRemaining / 60);
  const seconds = focusTimeRemaining % 60;
  qs('timerDisplay').textContent = `${pad2(minutes)}:${pad2(seconds)}`;
  document.title = `${pad2(minutes)}:${pad2(seconds)} - Modo Enfoque`;
}

function completeFocusTask(){
  if(!focusTaskId) return;
  const tasks = loadTasks();
  const index = tasks.findIndex(t => t.id === focusTaskId);
  if(index !== -1){
    tasks[index].completed = true;
    awardTaskXpIfNeeded(tasks[index]);
    saveTasks(tasks);
    refreshAfterCoreDataChange();
  }
  exitFocusMode();
}

function skipFocusTask(){
  const tasks = loadTasks();
  const pendingTasks = tasks.filter(t => !t.completed && t.id !== focusTaskId);
  
  if(pendingTasks.length === 0){
    alert('No hay más tareas pendientes.');
    exitFocusMode();
    return;
  }
  
  resetFocusTimer();
  enterFocusMode(pendingTasks[0].id);
}

// --- Tasks ---
function createTask(){
  // called when Save Task pressed
  const title = qs('taskTitle').value.trim();
  const subject = qs('taskSubject').value.trim();
  const dueAt = qs('taskDateTime').value;
  const category = qs('taskCategory') ? qs('taskCategory').value : DEFAULT_TASK_CATEGORY;
  const projectId = qs('taskProject') ? qs('taskProject').value : '';
  if(!title || !subject || !dueAt){ alert('Por favor completa todos los campos de la tarea.'); return; }
  const tasks = loadTasks();
  if(editingTaskId){
    const index = tasks.findIndex(task => task.id === editingTaskId);
    if(index === -1){
      editingTaskId = null;
      alert('No se pudo encontrar la tarea para editar.');
      return;
    }
    tasks[index] = {
      ...tasks[index],
      title,
      subject,
      dueAt,
      category,
      projectId,
      subtasks: buildSubtasksFromInput(tasks[index].subtasks || [])
    };
    saveTasks(tasks);
    editingTaskId = null;
    draftProjectTaskId = '';
    refreshAfterCoreDataChange();
    showHome();
    return;
  }
  if(new Date(dueAt) < new Date()){ alert('La fecha y hora deben ser ahora o después.'); return; }
  const task = { id: generateTaskId(), title, subject, dueAt, completed: false, category, projectId, subtasks: buildSubtasksFromInput([]), xpAwarded: false };
  tasks.push(task);
  saveTasks(tasks);
  draftProjectTaskId = '';
  refreshAfterCoreDataChange();
  showHome();
}

function sortTasks(tasks, mode = currentSortMode){
  return tasks.slice().sort((a, b) => {
    const dateDiff = parseTaskDueDate(a) - parseTaskDueDate(b);
    return mode === 'latest' ? -dateDiff : dateDiff;
  });
}

function getRecommendedTask(tasks = loadTasks()){
  return tasks
    .filter(task => !task.completed)
    .slice()
    .sort((a, b) => {
      const priorityDiff = getPriorityRank(b) - getPriorityRank(a);
      if(priorityDiff) return priorityDiff;
      return parseTaskDueDate(a) - parseTaskDueDate(b);
    })[0] || null;
}

function getPriorityClass(importance){
  if(importance === 'High') return 'high';
  if(importance === 'Medium') return 'medium';
  return 'low';
}

function renderRecommendation(){
  const title = qs('recommendationTitle');
  const meta = qs('recommendationMeta');
  const priority = qs('recommendationPriority');
  if(!title || !meta || !priority) return;
  const task = getRecommendedTask();
  priority.className = 'priority-pill low';
  if(!task){
    title.textContent = '¡Todo listo!';
    meta.textContent = 'No tienes tareas pendientes. Buen trabajo.';
    priority.textContent = 'Sin pendientes';
    return;
  }
  const importance = getAutoImportance(task);
  title.textContent = task.title;
  meta.textContent = `${task.subject} · ${getRelativeDueText(task)} · ${getTaskDueLabel(task)}`;
  priority.className = `priority-pill ${getPriorityClass(importance)}`;
  priority.textContent = `Prioridad ${getImportanceLabel(importance)}`;
}

function refreshTaskCompletionFromSubtasks(task){
  const settings = loadSettings();
  if(!settings.autoCompleteTaskWithSubtasks || !task.subtasks.length) return;
  const allDone = task.subtasks.every(subtask => subtask.completed);
  if(allDone && !task.completed){
    task.completed = true;
    awardTaskXpIfNeeded(task);
  }
}

function toggleSubtask(taskId, subtaskId){
  const tasks = loadTasks();
  const task = tasks.find(item => item.id === taskId);
  if(!task) return;
  const subtask = task.subtasks.find(item => item.id === subtaskId);
  if(!subtask) return;
  subtask.completed = !subtask.completed;
  refreshTaskCompletionFromSubtasks(task);
  saveTasks(tasks);
  refreshAfterCoreDataChange();
}

function addSubtask(taskId){
  const input = qs(`subtask-input-${taskId}`);
  const value = input ? input.value.trim() : '';
  if(!value) return;
  const tasks = loadTasks();
  const task = tasks.find(item => item.id === taskId);
  if(!task) return;
  task.subtasks.push({ id: generateEntityId('subtask'), title: value, completed: false });
  if(task.completed) task.completed = false;
  saveTasks(tasks);
  refreshAfterCoreDataChange();
}

function editSubtask(taskId, subtaskId){
  const tasks = loadTasks();
  const task = tasks.find(item => item.id === taskId);
  if(!task) return;
  const subtask = task.subtasks.find(item => item.id === subtaskId);
  if(!subtask) return;
  const nextTitle = prompt('Editar subtarea', subtask.title);
  if(nextTitle === null) return;
  subtask.title = nextTitle.trim() || subtask.title;
  saveTasks(tasks);
  refreshAfterCoreDataChange();
}

function deleteSubtask(taskId, subtaskId){
  const tasks = loadTasks();
  const task = tasks.find(item => item.id === taskId);
  if(!task) return;
  task.subtasks = task.subtasks.filter(item => item.id !== subtaskId);
  saveTasks(tasks);
  refreshAfterCoreDataChange();
}

function updateAutoImportancePreview(){
  const preview = qs('autoImportancePreview');
  const input = qs('taskDateTime');
  if(!preview || !input) return;
  if(!input.value){
    preview.textContent = 'Media';
    return;
  }
  const importance = getAutoImportance({ dueAt: input.value, completed: false });
  preview.textContent = getImportanceLabel(importance);
}

function renderTasks(){
  renderNotifications();
  renderDashboard();
  populateSubjectFilter();
  populateCategoryFilter();
  const container = qs('tasksContainer');
  container.innerHTML = '';
  const tasks = loadTasks();
  const sortedTasks = sortTasks(tasks);
  const filtered = applyFilters(sortedTasks);
  if(!tasks || tasks.length === 0){
    const el = document.createElement('div');
    el.className = 'no-tasks';
    el.innerHTML = `<p>No hay tareas aún</p><div style="margin-top:8px"><button id="addTaskEmptyBtn" class="btn primary">Agregar tarea</button></div>`;
    container.appendChild(el);
    setTimeout(()=>{
      const btn = qs('addTaskEmptyBtn'); if(btn) btn.addEventListener('click', showCreateTask);
    },0);
    return;
  }
  if(filtered.length === 0){
    const el = document.createElement('div');
    el.className = 'no-tasks';
    el.innerHTML = `<p>No se encontraron tareas con estos filtros.</p><div style="margin-top:8px"><button id="clearFilterNoTasksBtn" class="btn ghost">Limpiar filtros</button></div>`;
    container.appendChild(el);
    setTimeout(()=>{
      const btn = qs('clearFilterNoTasksBtn'); if(btn) btn.addEventListener('click', clearFilters);
    },0);
    return;
  }
  filtered.forEach((t, idx)=>{
    const card = document.createElement('div');
    card.className = 'task-card';
    if(t.completed) card.classList.add('completed');

    const top = document.createElement('div'); top.className = 'task-top';
    const left = document.createElement('div');
    const title = document.createElement('div'); title.className = 'task-title'; title.textContent = t.title;
    const importance = getAutoImportance(t);
    const importanceLabel = getImportanceLabel(importance);
    const categoryLabel = getCategoryLabel(t.category);
    const projectLabel = getProjectLabel(t.projectId);
    const badges = document.createElement('div');
    badges.className = 'task-badges';
    badges.innerHTML = `<span class="task-badge">${categoryLabel}</span><span class="task-badge subtle">${projectLabel}</span>`;
    const meta = document.createElement('div'); meta.className = 'task-meta'; meta.textContent = `${t.subject} • Entrega ${getTaskDueLabel(t)} • ${importanceLabel}`;
    left.appendChild(badges);
    left.appendChild(title); left.appendChild(meta);

    const right = document.createElement('div'); right.className = 'task-actions';
    const realIndex = getRealIndex(idx, filtered, tasks);
    const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = !!t.completed;
    cb.setAttribute('aria-label', `${t.title} - alternar completado`);
    cb.addEventListener('change', ()=>toggleTask(realIndex));
    right.appendChild(cb);

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'btn small ghost';
    editBtn.textContent = 'Editar';
    editBtn.setAttribute('aria-label', `Editar ${t.title}`);
    editBtn.addEventListener('click', ()=>showCreateTask(t.id));
    right.appendChild(editBtn);

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'btn danger small';
    deleteBtn.textContent = 'Eliminar';
    deleteBtn.setAttribute('aria-label', `Eliminar ${t.title}`);
    deleteBtn.addEventListener('click', ()=>deleteTask(realIndex));
    right.appendChild(deleteBtn);

    card.tabIndex = 0;
    card.setAttribute('role','article');
    card.setAttribute('aria-label', `${t.title}, ${t.subject}, categoría ${categoryLabel}, proyecto ${projectLabel}, entrega ${getTaskDueLabel(t)}, importancia ${importanceLabel}`);
    card.addEventListener('keydown', (ev)=>{
      if(ev.target !== card) return;
      if(ev.key === 'ArrowRight' || ev.key === 'ArrowDown'){
        ev.preventDefault(); focusNextCard(card, 1);
      } else if(ev.key === 'ArrowLeft' || ev.key === 'ArrowUp'){
        ev.preventDefault(); focusNextCard(card, -1);
      } else if(ev.key === 'Enter'){
        ev.preventDefault(); const realIndex = getRealIndex(idx, filtered, tasks); toggleTask(realIndex);
      }
    });

    top.appendChild(left); top.appendChild(right);

    const footer = document.createElement('div'); footer.className = 'task-meta';
    footer.textContent = t.completed ? 'Completada' : 'Pendiente';

    card.appendChild(top); card.appendChild(footer);
    if(t.subtasks && t.subtasks.length){
      const subtasksList = document.createElement('div');
      subtasksList.className = 'subtasks-list';
      t.subtasks.forEach(subtask => {
        const row = document.createElement('div');
        row.className = `subtask-row ${subtask.completed ? 'completed' : ''}`;
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = subtask.completed;
        checkbox.setAttribute('aria-label', `Completar subtarea ${subtask.title}`);
        checkbox.addEventListener('change', ()=>toggleSubtask(t.id, subtask.id));
        const text = document.createElement('span');
        text.textContent = subtask.title;
        const actions = document.createElement('div');
        actions.className = 'task-actions';
        const editSubtaskBtn = document.createElement('button');
        editSubtaskBtn.className = 'btn ghost small';
        editSubtaskBtn.textContent = 'Editar';
        editSubtaskBtn.addEventListener('click', ()=>editSubtask(t.id, subtask.id));
        const deleteSubtaskBtn = document.createElement('button');
        deleteSubtaskBtn.className = 'btn danger small';
        deleteSubtaskBtn.textContent = 'Eliminar';
        deleteSubtaskBtn.addEventListener('click', ()=>deleteSubtask(t.id, subtask.id));
        actions.appendChild(editSubtaskBtn);
        actions.appendChild(deleteSubtaskBtn);
        row.appendChild(checkbox);
        row.appendChild(text);
        row.appendChild(actions);
        subtasksList.appendChild(row);
      });
      card.appendChild(subtasksList);
    }
    const addSubtaskRow = document.createElement('div');
    addSubtaskRow.className = 'subtask-add-row';
    addSubtaskRow.innerHTML = `<input id="subtask-input-${t.id}" type="text" placeholder="Nueva subtarea" /><button class="btn primary small" type="button">Agregar</button>`;
    addSubtaskRow.querySelector('button').addEventListener('click', ()=>addSubtask(t.id));
    card.appendChild(addSubtaskRow);
    container.appendChild(card);
  });
}

function getRealIndex(filteredIdx, filteredArray, fullArray){
  const item = filteredArray[filteredIdx];
  return fullArray.findIndex(t => t.id === item.id);
}

function applyFilters(tasks){
  const query = currentSearchQuery.trim().toLowerCase();
  return tasks.filter(t => {
    if(currentFilters.subject && currentFilters.subject !== 'All' && t.subject !== currentFilters.subject) return false;
    if(currentFilters.importance && currentFilters.importance !== 'All' && getAutoImportance(t) !== currentFilters.importance) return false;
    if(currentFilters.category && currentFilters.category !== 'All' && getCategoryLabel(t.category) !== currentFilters.category) return false;
    if(currentFilters.status && currentFilters.status !== 'All'){
      if(currentFilters.status === 'Completed' && !t.completed) return false;
      if(currentFilters.status === 'Pending' && t.completed) return false;
      if(currentFilters.status === 'Overdue'){
        const due = parseTaskDueDate(t);
        if(t.completed || Number.isNaN(due.getTime()) || due >= new Date()) return false;
      }
    }
    if(query){
      const haystack = `${t.title} ${t.subject}`.toLowerCase();
      if(!haystack.includes(query)) return false;
    }
    return true;
  });
}

function getImportanceLabel(value){
  if(value === 'High') return '🔴 Alta';
  if(value === 'Low') return '🟢 Baja';
  return '🟡 Media';
}

function populateSubjectFilter(){
  const select = qs('filterSubject');
  if(!select) return;
  const tasks = loadTasks();
  const subjects = Array.from(new Set(tasks.map(t=>t.subject))).filter(Boolean).sort();
  select.innerHTML = '<option value="All">Todas</option>' + subjects.map(s=>`<option value="${s}">${s}</option>`).join('');
  select.value = currentFilters.subject || 'All';
}

function populateCategoryFilter(){
  const select = qs('filterCategory');
  if(!select) return;
  select.innerHTML = '<option value="All">Todas</option>' + TASK_CATEGORIES.map(category => `<option value="${category}">${category}</option>`).join('');
  select.value = currentFilters.category || 'All';
}

function clearFilters(){
  currentFilters = { subject: 'All', importance: 'All', status: 'All', category: 'All' };
  qs('filterSubject').value = 'All';
  qs('filterImportance').value = 'All';
  if(qs('filterCategory')) qs('filterCategory').value = 'All';
  if(qs('filterStatus')) qs('filterStatus').value = 'All';
  if(qs('taskSearchInput')) qs('taskSearchInput').value = '';
  currentSearchQuery = '';
  renderTasks();
}

function setSortMode(mode){
  currentSortMode = mode;
  renderTasks();
}

function toggleTask(index){
  const tasks = loadTasks();
  if(!tasks || !tasks[index]) return;
  tasks[index].completed = !tasks[index].completed;
  awardTaskXpIfNeeded(tasks[index]);
  saveTasks(tasks);
  refreshAfterCoreDataChange();
}

function deleteTask(index){
  const tasks = loadTasks();
  if(!tasks || !tasks[index]) return;
  if(!confirm(`¿Eliminar "${tasks[index].title}"? Esta acción no se puede deshacer.`)) return;
  tasks.splice(index, 1);
  saveTasks(tasks);
  refreshAfterCoreDataChange();
}

// --- Profile actions ---
function deleteAccount(){
  if(!confirm('¿Eliminar cuenta y todas las tareas? Esto no puede deshacerse.')) return;
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(TASKS_KEY);
  localStorage.removeItem(SHOP_KEY);
  localStorage.removeItem(PROGRESS_KEY);
  localStorage.removeItem(SETTINGS_KEY);
  localStorage.removeItem(NOTES_KEY);
  localStorage.removeItem(CHECKLISTS_KEY);
  localStorage.removeItem(PROJECTS_KEY);
  showRegister();
}

function editProfile(){
  const user = loadUser(); if(!user) return;
  qs('editProfileForm').classList.remove('hidden');
  qs('editName').value = user.name; qs('editGrade').value = user.grade;
}

function saveProfile(){
  const name = qs('editName').value.trim();
  const grade = qs('editGrade').value.trim();
  if(!name || !grade){ alert('Por favor completa ambos campos.'); return; }
  const user = { name, grade };
  saveUser(user);
  renderUserSwitcher();
  showProfile();
}

// --- Event bindings ---
document.addEventListener('DOMContentLoaded', ()=>{
  // Elements
  qs('createAccountBtn').addEventListener('click', createUser);
  qs('addTaskBtn').addEventListener('click', showCreateTask);
  qs('saveTaskBtn').addEventListener('click', createTask);
  qs('cancelTaskBtn').addEventListener('click', ()=>{ editingTaskId = null; showHome(); });
  // filters
  if(qs('taskSearchInput')) qs('taskSearchInput').addEventListener('input', debounce((e)=>{ currentSearchQuery = e.target.value || ''; renderTasks(); }, 140));
  if(qs('filterSubject')) qs('filterSubject').addEventListener('change', (e)=>{ currentFilters.subject = e.target.value; renderTasks(); });
  if(qs('filterCategory')) qs('filterCategory').addEventListener('change', (e)=>{ currentFilters.category = e.target.value; renderTasks(); });
  if(qs('filterImportance')) qs('filterImportance').addEventListener('change', (e)=>{ currentFilters.importance = e.target.value; renderTasks(); });
  if(qs('filterStatus')) qs('filterStatus').addEventListener('change', (e)=>{ currentFilters.status = e.target.value; renderTasks(); });
  if(qs('clearFiltersBtn')) qs('clearFiltersBtn').addEventListener('click', clearFilters);
  if(qs('sortTasksBy')) qs('sortTasksBy').addEventListener('change', (e)=>{ setSortMode(e.target.value); });
  if(qs('openNotesBtn')) qs('openNotesBtn').addEventListener('click', showNotes);
  if(qs('closeNotesBtn')) qs('closeNotesBtn').addEventListener('click', showHome);
  if(qs('notesSearchInput')) qs('notesSearchInput').addEventListener('input', debounce((e)=>{ currentNoteSearch = e.target.value || ''; renderNotes(); }, 140));
  if(qs('noteSaveBtn')) qs('noteSaveBtn').addEventListener('click', saveNote);
  if(qs('noteCancelBtn')) qs('noteCancelBtn').addEventListener('click', resetNoteForm);
  if(qs('openChecklistsBtn')) qs('openChecklistsBtn').addEventListener('click', showChecklists);
  if(qs('closeChecklistsBtn')) qs('closeChecklistsBtn').addEventListener('click', showHome);
  if(qs('checklistsSearchInput')) qs('checklistsSearchInput').addEventListener('input', debounce((e)=>{ currentChecklistSearch = e.target.value || ''; renderChecklists(); }, 140));
  if(qs('checklistSaveBtn')) qs('checklistSaveBtn').addEventListener('click', createChecklist);
  if(qs('checklistCancelBtn')) qs('checklistCancelBtn').addEventListener('click', ()=>{ if(qs('checklistTitleInput')) qs('checklistTitleInput').value = ''; if(qs('checklistItemInput')) qs('checklistItemInput').value = ''; });
  if(qs('openProjectsBtn')) qs('openProjectsBtn').addEventListener('click', showProjects);
  if(qs('closeProjectsBtn')) qs('closeProjectsBtn').addEventListener('click', showHome);
  if(qs('projectsSearchInput')) qs('projectsSearchInput').addEventListener('input', debounce((e)=>{ currentProjectSearch = e.target.value || ''; renderProjects(); }, 140));
  if(qs('projectSaveBtn')) qs('projectSaveBtn').addEventListener('click', saveProject);
  if(qs('projectCancelBtn')) qs('projectCancelBtn').addEventListener('click', resetProjectForm);
  if(qs('openShopBtn')) qs('openShopBtn').addEventListener('click', showShop);
  if(qs('enterFocusBtn')) qs('enterFocusBtn').addEventListener('click', ()=>enterFocusMode());
  if(qs('closeShopBtn')) qs('closeShopBtn').addEventListener('click', showHome);
  if(qs('openCalendarBtn')) qs('openCalendarBtn').addEventListener('click', showCalendar);
  if(qs('closeCalendarBtn')) qs('closeCalendarBtn').addEventListener('click', showHome);
  if(qs('calendarPrevBtn')) qs('calendarPrevBtn').addEventListener('click', ()=>shiftCalendarMonth(-1));
  if(qs('calendarNextBtn')) qs('calendarNextBtn').addEventListener('click', ()=>shiftCalendarMonth(1));
  if(qs('openSettingsBtn')) qs('openSettingsBtn').addEventListener('click', showSettings);
  if(qs('closeSettingsBtn')) qs('closeSettingsBtn').addEventListener('click', showHome);
  if(qs('settingsThemeMode')) qs('settingsThemeMode').addEventListener('change', persistVisualSettings);
  if(qs('settingsPrimaryColor')) qs('settingsPrimaryColor').addEventListener('input', persistVisualSettings);
  if(qs('settingsSecondaryColor')) qs('settingsSecondaryColor').addEventListener('input', persistVisualSettings);
  if(qs('settingsFontFamily')) qs('settingsFontFamily').addEventListener('change', persistVisualSettings);
  if(qs('settingsBackgroundMode')) qs('settingsBackgroundMode').addEventListener('change', persistVisualSettings);
  if(qs('settingsOverlayToggle')) qs('settingsOverlayToggle').addEventListener('change', persistVisualSettings);
  if(qs('settingsAutoCompleteSubtasks')) qs('settingsAutoCompleteSubtasks').addEventListener('change', persistVisualSettings);
  if(qs('settingsBackgroundInput')) qs('settingsBackgroundInput').addEventListener('change', (e)=>setSettingsBackgroundImage(e.target.files && e.target.files[0]));
  if(qs('settingsExportBtn')) qs('settingsExportBtn').addEventListener('click', exportBackup);
  if(qs('settingsImportBtn')) qs('settingsImportBtn').addEventListener('click', ()=>qs('settingsImportInput') && qs('settingsImportInput').click());
  if(qs('settingsImportInput')) qs('settingsImportInput').addEventListener('change', (e)=>importBackupFile(e.target.files && e.target.files[0]));
  if(qs('settingsApplyBonusBtn')) qs('settingsApplyBonusBtn').addEventListener('click', applyManualPoints);
  if(qs('settingsClearBonusBtn')) qs('settingsClearBonusBtn').addEventListener('click', clearManualPoints);
  if(qs('settingsResetBtn')) qs('settingsResetBtn').addEventListener('click', resetSystem);
  if(qs('settingsCreateUserBtn')) qs('settingsCreateUserBtn').addEventListener('click', showSettingsUserForm);
  if(qs('settingsSaveUserBtn')) qs('settingsSaveUserBtn').addEventListener('click', createSettingsUser);
  if(qs('settingsCancelUserBtn')) qs('settingsCancelUserBtn').addEventListener('click', hideSettingsUserForm);
  if(qs('settingsUserSwitcher')) qs('settingsUserSwitcher').addEventListener('change', (e)=>switchSettingsUser(e.target.value));
  if(qs('settingsLogoutBtn')) qs('settingsLogoutBtn').addEventListener('click', logoutFromSettings);
  if(qs('premiumToggle')) qs('premiumToggle').addEventListener('change', togglePremium);
  if(qs('premiumExportBtn')) qs('premiumExportBtn').addEventListener('click', exportPremiumData);
  if(qs('exitFocusBtn')) qs('exitFocusBtn').addEventListener('click', exitFocusMode);
  if(qs('startTimerBtn')) qs('startTimerBtn').addEventListener('click', startFocusTimer);
  if(qs('pauseTimerBtn')) qs('pauseTimerBtn').addEventListener('click', pauseFocusTimer);
  if(qs('resetTimerBtn')) qs('resetTimerBtn').addEventListener('click', resetFocusTimer);
  if(qs('completeFocusTaskBtn')) qs('completeFocusTaskBtn').addEventListener('click', completeFocusTask);
  if(qs('skipFocusTaskBtn')) qs('skipFocusTaskBtn').addEventListener('click', skipFocusTask);
  qs('profileBtn').addEventListener('click', showProfile);
  qs('closeProfileBtn').addEventListener('click', showHome);
  qs('deleteAccountBtn').addEventListener('click', deleteAccount);
  qs('editProfileBtn').addEventListener('click', editProfile);
  qs('saveProfileBtn').addEventListener('click', saveProfile);
  qs('cancelEditProfileBtn').addEventListener('click', ()=>{ qs('editProfileForm').classList.add('hidden'); });
  qs('themeToggleBtn').addEventListener('click', toggleTheme);
  if(qs('userSwitcher')) qs('userSwitcher').addEventListener('change', (e)=>switchUser(e.target.value));

  // If user exists, show home, otherwise register
  const user = loadUser();
  if(user) showHome(); else showRegister();

  // populate filters initially
  populateSubjectFilter();
  populateCategoryFilter();
  loadShopState();
  applySavedTheme();
  applyShopCosmetics();
  updatePremiumUI();
  if(qs('sortTasksBy')) qs('sortTasksBy').value = currentSortMode;
  if(qs('taskDateTime')) qs('taskDateTime').addEventListener('input', updateAutoImportancePreview);

  // Keyboard accessibility: shortcuts (when not typing in inputs)
  document.addEventListener('keydown', (e)=>{
    const tag = (e.target && e.target.tagName) || '';
    const typing = ['INPUT','TEXTAREA','SELECT'].includes(tag) || e.target.isContentEditable;
    if(typing) return;
    if(e.key === 'n' || e.key === 'N'){
      e.preventDefault(); showCreateTask();
    } else if(e.key === 'p' || e.key === 'P'){
      e.preventDefault(); showProfile();
    } else if(e.key === 'Escape'){
      e.preventDefault(); showHome();
    }
  });

  // helper to move focus between cards
  window.focusNextCard = function(currentCard, offset){
    const cards = Array.from(document.querySelectorAll('.task-card'));
    if(!cards.length) return;
    const idx = cards.indexOf(currentCard);
    let next = idx + offset;
    if(next < 0) next = cards.length - 1;
    if(next >= cards.length) return 0;
    const target = cards[next];
    if(target) target.focus();
  }
});

function toggleTheme(){
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('studyflow_theme', newTheme);
  const settings = loadSettings();
  settings.themeMode = newTheme;
  saveSettings(settings);
  applyUserVisualSettings();
}

function applySavedTheme(){
  const savedTheme = localStorage.getItem('studyflow_theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  const settings = loadSettings();
  settings.themeMode = savedTheme;
  saveSettings(settings);
  applyUserVisualSettings();
  applyShopCosmetics();
}
