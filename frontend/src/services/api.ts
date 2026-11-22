const API_BASE_URL = "http://localhost:5000/api";

// ==================== API RESPONSE TYPES ====================
export type User = {
  id: string;
  name: string;
  email: string;
};

export type AuthResponse = {
  message: string;
  token: string;
  user: User;
};

export type ApiProject = {
  id: string;
  name: string;
  description: string | null;
  color: string;
  ownerId?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type ProjectPayload = {
  name: string;
  description?: string;
  color?: string;
};

export type ApiTask = {
  id: string;
  title: string;
  description: string | null;
  projectId: string;
  priority: string;
  status: string;
  dueDate: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type TaskPayload = {
  title: string;
  description?: string;
  projectId: string;
  priority: string;
  status: string;
  dueDate?: string | null;
};

// ==================== API ERROR HANDLING ====================
async function handleResponse<T>(response: Response): Promise<T> {
  let data: any = {};
  const text = await response.text();

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }

  if (!response.ok) {
    throw new Error(data.message || data.error || `Request failed (${response.status})`);
  }

  return data as T;
}

function authHeaders(): HeadersInit {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ==================== AUTHENTICATION API ====================
export async function loginUser(email: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse<AuthResponse>(response);
}

export async function registerUser(name: string, email: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });
  return handleResponse<AuthResponse>(response);
}

// ==================== TOKEN STORAGE ====================
export function saveToken(token: string): void {
  localStorage.setItem("workly-token", token);
}

export function getToken(): string | null {
  return localStorage.getItem("workly-token");
}

export function removeToken(): void {
  localStorage.removeItem("workly-token");
}

export function isAuthenticated(): boolean {
  return Boolean(getToken());
}

// ==================== USER STORAGE ====================
export function saveUser(user: User): void {
  localStorage.setItem("workly-user", JSON.stringify(user));
}

export function getUser(): User | null {
  try {
    const savedUser = localStorage.getItem("workly-user");
    return savedUser ? (JSON.parse(savedUser) as User) : null;
  } catch {
    return null;
  }
}

export function removeUser(): void {
  localStorage.removeItem("workly-user");
}

// ==================== PROJECTS API ====================
export async function fetchProjects(): Promise<ApiProject[]> {
  const response = await fetch(`${API_BASE_URL}/projects`, {
    method: "GET",
    headers: authHeaders(),
  });
  const data = await handleResponse<any>(response);
  return Array.isArray(data) ? data : data.projects;
}

export async function createProject(payload: ProjectPayload): Promise<ApiProject> {
  const response = await fetch(`${API_BASE_URL}/projects`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await handleResponse<any>(response);
  return data.project ?? data;
}

export async function updateProject(id: string, payload: ProjectPayload): Promise<ApiProject> {
  const response = await fetch(`${API_BASE_URL}/projects/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await handleResponse<any>(response);
  return data.project ?? data;
}

export async function deleteProject(id: string): Promise<{ message?: string }> {
  const response = await fetch(`${API_BASE_URL}/projects/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return handleResponse<{ message?: string }>(response);
}

// ==================== TASKS API ====================
export async function fetchTasks(): Promise<ApiTask[]> {
  const response = await fetch(`${API_BASE_URL}/tasks`, {
    method: "GET",
    headers: authHeaders(),
  });
  const data = await handleResponse<any>(response);
  return Array.isArray(data) ? data : data.tasks;
}

export async function createTask(payload: TaskPayload): Promise<ApiTask> {
  const response = await fetch(`${API_BASE_URL}/tasks`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await handleResponse<any>(response);
  return data.task ?? data;
}

export async function updateTask(id: string, payload: TaskPayload): Promise<ApiTask> {
  const response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await handleResponse<any>(response);
  return data.task ?? data;
}

export async function deleteTask(id: string): Promise<{ message?: string }> {
  const response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return handleResponse<{ message?: string }>(response);
}
