const STORAGE_KEY = "equipment-movements-v2";
const USERS_KEY = "equipment-users-v1"; 


const ADMIN_USER = {
  id: "admin-master",
  username: "admin",
  password: "crialed", 
  name: "Administrador",
  role: "admin"
};

let movements = loadMovements();
let registeredUsers = loadUsers();
let currentUser = null;

//  DOM 
const loginScreen = document.querySelector("#loginScreen");
const appScreen = document.querySelector("#appScreen");
const formLogin = document.querySelector("#formLogin");
const formRegister = document.querySelector("#formRegister");
const form = document.querySelector("#movementForm");
const recordId = document.querySelector("#recordId");
const recordsBody = document.querySelector("#recordsBody");
const status = document.querySelector("#status");
const returnFields = document.querySelector("#returnFields");
const statusFilter = document.querySelector("#statusFilter");
const actionTemplate = document.querySelector("#actionTemplate");

const fields = {
  equipmentType: document.querySelector("#equipmentType"),
  equipmentId: document.querySelector("#equipmentId"),
  department: document.querySelector("#department"),
  checkoutAt: document.querySelector("#checkoutAt"),
  status: document.querySelector("#status"),
  notes: document.querySelector("#notes"),
  returnAt: document.querySelector("#returnAt"),
  returnCondition: document.querySelector("#returnCondition"),
};

// BANCO DE DADOS 
function loadUsers() {
  try { return JSON.parse(localStorage.getItem(USERS_KEY)) ?? []; } 
  catch { return []; }
}

function persistUsers() {
  localStorage.setItem(USERS_KEY, JSON.stringify(registeredUsers));
}

//  AUTENTICAÇÃO E LOGIN 
function initAuth() {
  const savedUser = sessionStorage.getItem("loggedUser");
  if (savedUser) {
    currentUser = JSON.parse(savedUser);
    mostrarSistema();
  }
}

function toggleAuthMode(mode) {
  if (mode === 'register') {
    formLogin.style.display = 'none';
    formRegister.style.display = 'block';
  } else {
    formRegister.style.display = 'none';
    formLogin.style.display = 'block';
  }
}

function criarContaTecnico() {
  const name = document.querySelector("#regName").value.trim();
  const username = document.querySelector("#regUsername").value.trim().toLowerCase();
  const password = document.querySelector("#regPassword").value;

  if (!name || !username || !password) {
    return alert("Preencha todos os campos para criar a conta!");
  }

  if (username === "admin" || registeredUsers.some(u => u.username === username)) {
    return alert("Este nome de usuário já está em uso!");
  }

  const newUser = {
    id: makeId(),
    name: name,
    username: username,
    password: password, 
    role: "tech"
  };

  registeredUsers.push(newUser);
  persistUsers();
  
  alert("Conta criada com sucesso! Você já pode fazer login.");
  toggleAuthMode('login');
  
 
  document.querySelector("#regName").value = "";
  document.querySelector("#regUsername").value = "";
  document.querySelector("#regPassword").value = "";
}

function realizarLogin() {
  const userTxt = document.querySelector("#loginUsername").value.trim().toLowerCase();
  const passTxt = document.querySelector("#loginPassword").value;

  if (!userTxt || !passTxt) return alert("Preencha usuário e senha!");

 
  if (userTxt === ADMIN_USER.username && passTxt === ADMIN_USER.password) {
    currentUser = { id: ADMIN_USER.id, name: ADMIN_USER.name, role: ADMIN_USER.role };
  } 
  
  else {
    const tech = registeredUsers.find(u => u.username === userTxt && u.password === passTxt);
    if (tech) {
      currentUser = { id: tech.id, name: tech.name, role: tech.role };
    } else {
      return alert("Usuário ou senha incorretos!");
    }
  }
  
  sessionStorage.setItem("loggedUser", JSON.stringify(currentUser));
  
  document.querySelector("#loginUsername").value = "";
  document.querySelector("#loginPassword").value = "";
  
  mostrarSistema();
}

function fazerLogout() {
  sessionStorage.removeItem("loggedUser");
  currentUser = null;
  appScreen.style.display = "none";
  loginScreen.style.display = "flex";
}

function mostrarSistema() {
  loginScreen.style.display = "none";
  appScreen.style.display = "block";
  document.querySelector("#loggedUserInfo").textContent = `Logado: ${currentUser.name} (${currentUser.role === 'admin' ? 'Admin' : 'Técnico'})`;
  resetForm();
  render();
}

fields.equipmentType.addEventListener("change", (e) => {
  const isControladora = e.target.value === "Controladora";
  fields.equipmentId.disabled = isControladora;
  fields.equipmentId.required = !isControladora;
  if (isControladora) fields.equipmentId.value = "";
});

function loadMovements() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? []; } 
  catch { return []; }
}

function persistMovements() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(movements));
}

function nowForInput() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

function makeId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`;
}

function updateReturnVisibility() {
  const isReturned = status.value === "devolvido";
  returnFields.classList.toggle("is-visible", isReturned);
  if (isReturned && !fields.returnAt.value) {
    fields.returnAt.value = nowForInput();
  }
}

function resetForm() {
  form.reset();
  recordId.value = "";
  fields.checkoutAt.value = nowForInput();
  fields.status.value = "em_uso";
  fields.equipmentId.disabled = false;
  fields.equipmentId.required = true;
  updateReturnVisibility();
}

function saveMovement(event) {
  event.preventDefault();
  
  const data = {
    equipmentType: fields.equipmentType.value,
    equipmentId: fields.equipmentId.value.trim(),
    department: fields.department.value.trim(),
    checkoutAt: fields.checkoutAt.value,
    status: fields.status.value,
    notes: fields.notes.value.trim(),
    returnAt: fields.status.value === "devolvido" ? fields.returnAt.value : "",
    returnCondition: fields.status.value === "devolvido" ? fields.returnCondition.value : "",
    technicianId: currentUser.id,
    technicianName: currentUser.name // Salvamos o nome para exibir fácil na tabela
  };

  const currentId = recordId.value;
  const existing = movements.find((item) => item.id === currentId);

  // Regra: Técnico não pode editar registro de outro técnico
  if (existing && currentUser.role !== 'admin' && existing.technicianId !== currentUser.id) {
    return alert("Você não tem permissão para editar um registro de outro técnico.");
  }

  if (existing) {
    movements = movements.map((item) => item.id === currentId ? { ...item, ...data } : item );
  } else {
    movements.unshift({ id: makeId(), ...data });
  }

  persistMovements();
  render();
  resetForm();
}

function fillForm(record) {
  recordId.value = record.id;
  Object.entries(fields).forEach(([key, input]) => {
    if (input) input.value = record[key] ?? "";
  });
  
  fields.equipmentId.disabled = record.equipmentType === "Controladora";
  updateReturnVisibility();
}

function markAsReturned(record) {
  fillForm(record);
  fields.status.value = "devolvido";
  fields.returnAt.value = nowForInput();
  updateReturnVisibility();
}

function deleteMovement(id) {
  if(!confirm(`Tem certeza que deseja excluir este registro?`)) return;
  movements = movements.filter((item) => item.id !== id);
  persistMovements();
  render();
}

// --- RENDERIZAÇÃO DA TABELA ---
function getFilteredMovements() {
  const selectedStatus = statusFilter.value;

  return movements.filter((record) => {
    // Filtro principal de permissão
    if (currentUser.role === 'tech' && record.technicianId !== currentUser.id) {
      return false;
    }

    const matchesStatus = selectedStatus === "todos" || record.status === selectedStatus;
    return matchesStatus;
  });
}

function render() {
  const filtered = getFilteredMovements();
  recordsBody.replaceChildren();

  document.querySelector("#totalCount").textContent = filtered.length;
  document.querySelector("#activeCount").textContent = filtered.filter(i => i.status === "em_uso").length;
  document.querySelector("#returnedCount").textContent = filtered.filter(i => i.status === "devolvido").length;

  filtered.forEach((record) => {
    const row = document.createElement("tr");
    
    // Tratativa para exibir o nome do equipamento
    const equipName = record.equipmentType === 'Controladora' 
      ? 'Controladora' 
      : `${record.equipmentType} ${record.equipmentId ? `(${record.equipmentId})` : ''}`;

    row.innerHTML = `
      <td><strong>${equipName}</strong><br><small>${record.department}</small></td>
      <td>${record.technicianName || "Desconhecido"}</td>
      <td>${new Date(record.checkoutAt).toLocaleDateString('pt-BR')}</td>
      <td><span style="padding: 2px 8px; border-radius: 4px; font-size: 0.9em; background: ${record.status === 'em_uso' ? '#fef08a' : '#bbf7d0'}">
        ${record.status === 'em_uso' ? 'Em uso' : 'Devolvido'}
      </span></td>
      <td></td>
    `;

    const actions = actionTemplate.content.cloneNode(true);
    
    // Configura botões de ação
    actions.querySelector(".return-action").onclick = () => markAsReturned(record);
    actions.querySelector(".edit-action").onclick = () => fillForm(record);
    actions.querySelector(".delete-action").onclick = () => deleteMovement(record.id);

    // Esconde os botões de ação se for um Admin olhando registro de terceiros (opcional) ou se já foi devolvido
    if(record.status === 'devolvido') {
      actions.querySelector(".return-action").disabled = true;
      actions.querySelector(".return-action").style.opacity = "0.3";
    }

    if(currentUser.role === 'admin' && record.technicianId !== currentUser.id) {
       actions.querySelector(".return-action").style.display = "none";
       actions.querySelector(".edit-action").style.display = "none";
    }
    
    row.lastElementChild.append(actions);
    recordsBody.append(row);
  });
}

// Event Listeners
status.addEventListener("change", updateReturnVisibility);
form.addEventListener("submit", saveMovement);
statusFilter.addEventListener("change", render);
document.querySelector("#resetBtn").addEventListener("click", resetForm);
document.querySelector("#newRecordBtn").addEventListener("click", resetForm);

// Inicializa a aplicação
initAuth();