const STORAGE_KEY = "todos";
const DEFAULT_CATEGORY = "기타";
const PRIORITY_LABELS = {
  high: "높음",
  medium: "보통",
  low: "낮음",
};

const form = document.querySelector("#todo-form");
const input = document.querySelector("#todo-input");
const categoryInput = document.querySelector("#todo-category");
const deadlineInput = document.querySelector("#todo-deadline");
const priorityInput = document.querySelector("#todo-priority");
const todoList = document.querySelector("#todo-list");
const emptyState = document.querySelector("#empty-state");
const progressBar = document.querySelector("#progress-bar");
const progressFill = progressBar.querySelector(".progress-fill");
const progressValue = document.querySelector("#progress-value");
const storageNotice = document.querySelector("#storage-notice");
const filterButtons = [...document.querySelectorAll("[data-filter]")];

let todos = [];
let activeFilter = "all";
let invalidInputTimer;

function getLocalDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function showStorageNotice(message) {
  storageNotice.textContent = message;
  storageNotice.classList.toggle("hidden", message.length === 0);
}

function loadTodos() {
  try {
    const savedTodos = localStorage.getItem(STORAGE_KEY);
    if (savedTodos === null) return [];

    const parsedTodos = JSON.parse(savedTodos);
    if (!Array.isArray(parsedTodos)) {
      throw new TypeError("저장된 할 일 데이터가 배열 형식이 아닙니다.");
    }

    const hasValidTodos = parsedTodos.every((todo) => (
      todo !== null
      && typeof todo === "object"
      && typeof todo.id === "string"
      && typeof todo.text === "string"
      && typeof todo.category === "string"
      && typeof todo.completed === "boolean"
      && typeof todo.date === "string"
      && (todo.deadline === undefined || typeof todo.deadline === "string")
      && (todo.priority === undefined || Object.hasOwn(PRIORITY_LABELS, todo.priority))
    ));
    if (!hasValidTodos) {
      throw new TypeError("저장된 할 일 항목 데이터가 올바르지 않습니다.");
    }

    return parsedTodos.map((todo) => ({
      ...todo,
      deadline: todo.deadline ?? "",
      priority: todo.priority ?? "medium",
    }));
  } catch (error) {
    console.error("할 일 데이터를 불러오지 못했습니다.", error);
    showStorageNotice("저장된 할 일을 불러오지 못했습니다. 브라우저 저장 공간을 확인해 주세요.");
    return [];
  }
}

function saveTodos() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
    showStorageNotice("");
  } catch (error) {
    console.error("할 일 데이터를 저장하지 못했습니다.", error);
    showStorageNotice("할 일 저장에 실패했습니다. 브라우저 저장 공간을 확인해 주세요.");
  }
}

function createTodoId() {
  let timestamp = Date.now();
  while (todos.some((todo) => todo.id === String(timestamp))) {
    timestamp += 1;
  }
  return String(timestamp);
}

function clearInvalidInput() {
  window.clearTimeout(invalidInputTimer);
  input.classList.remove("is-invalid");
  input.removeAttribute("aria-invalid");
}

function setInvalidInput() {
  window.clearTimeout(invalidInputTimer);
  input.classList.add("is-invalid");
  input.setAttribute("aria-invalid", "true");
  input.focus();
  invalidInputTimer = window.setTimeout(() => {
    input.classList.remove("is-invalid");
    input.removeAttribute("aria-invalid");
  }, 1000);
}

function getVisibleTodos() {
  if (activeFilter === "today") {
    const today = getLocalDate();
    return todos.filter((todo) => todo.date === today);
  }
  if (activeFilter === "completed") {
    return todos.filter((todo) => todo.completed === true);
  }
  return todos;
}

function createTodoCard(todo) {
  const item = document.createElement("li");
  const card = document.createElement("article");
  card.className = `todo-card${todo.completed ? " is-completed" : ""}`;

  const checkbox = document.createElement("input");
  checkbox.className = "todo-checkbox";
  checkbox.type = "checkbox";
  checkbox.checked = todo.completed;
  checkbox.setAttribute("aria-label", `${todo.text} 완료 여부`);
  checkbox.addEventListener("change", () => {
    todo.completed = checkbox.checked;
    saveTodos();
    render();
  });

  const category = document.createElement("span");
  category.className = "category-badge";
  category.textContent = todo.category;

  const text = document.createElement("p");
  text.className = "todo-text";
  text.textContent = todo.text;

  const details = document.createElement("div");
  details.className = "todo-details";

  if (todo.deadline) {
    const deadline = document.createElement("time");
    deadline.className = "deadline-badge";
    deadline.dateTime = todo.deadline;
    deadline.textContent = `마감 ${todo.deadline}`;
    details.append(deadline);
  }

  const priority = document.createElement("span");
  priority.className = "priority-badge";
  priority.dataset.priority = todo.priority;
  priority.textContent = PRIORITY_LABELS[todo.priority];
  details.append(priority);

  const deleteButton = document.createElement("button");
  deleteButton.className = "delete-button";
  deleteButton.type = "button";
  deleteButton.textContent = "삭제";
  deleteButton.setAttribute("aria-label", `삭제: ${todo.text}`);
  deleteButton.addEventListener("click", () => {
    todos = todos.filter((itemTodo) => itemTodo.id !== todo.id);
    saveTodos();
    render();
  });

  card.append(checkbox, category, text, details, deleteButton);
  item.append(card);
  return item;
}

function renderProgress() {
  const completedCount = todos.filter((todo) => todo.completed).length;
  const percentage = todos.length === 0
    ? 0
    : Math.round((completedCount / todos.length) * 100);

  progressFill.style.width = `${percentage}%`;
  progressBar.setAttribute("aria-valuenow", String(percentage));
  progressValue.textContent = `${percentage}%`;
}

function render() {
  const visibleTodos = getVisibleTodos();
  todoList.replaceChildren(...visibleTodos.map(createTodoCard));
  emptyState.hidden = visibleTodos.length > 0;

  for (const button of filterButtons) {
    const isActive = button.dataset.filter === activeFilter;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  }

  renderProgress();
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = input.value.trim();

  if (text.length === 0) {
    setInvalidInput();
    return;
  }

  clearInvalidInput();
  const category = categoryInput.value.trim() || DEFAULT_CATEGORY;
  const priority = Object.hasOwn(PRIORITY_LABELS, priorityInput.value)
    ? priorityInput.value
    : "medium";

  todos.push({
    id: createTodoId(),
    text,
    category,
    completed: false,
    date: getLocalDate(),
    deadline: deadlineInput.value,
    priority,
  });

  saveTodos();
  input.value = "";
  deadlineInput.value = "";
  priorityInput.value = "medium";
  render();
  input.focus();
});

input.addEventListener("input", () => {
  if (input.value.trim().length > 0) clearInvalidInput();
});

for (const button of filterButtons) {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    render();
  });
}

todos = loadTodos();
render();
