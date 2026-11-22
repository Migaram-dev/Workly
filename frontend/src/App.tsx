import { useEffect, useMemo, useState, type FormEvent } from 'react'
import Auth from './components/Auth'
import { getUser, isAuthenticated, removeToken, removeUser, saveUser, fetchProjects, createProject, updateProject, deleteProject as deleteProjectApi, fetchTasks, createTask, updateTask, deleteTask as deleteTaskApi, type User, type ApiProject, type ApiTask } from './services/api'
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  CalendarDays,
  Users,
  Bell,
  Search,
  Plus,
  ArrowUpRight,
  Clock,
  MoreHorizontal,
  Check,
  X,
  Trash2,
  Pencil,
  Filter,
  ChevronDown,
  Sun,
  Moon,
  Circle,
  AlertCircle,
  Menu,
  ListTodo,
  TrendingUp,
  LogOut,
} from 'lucide-react'

type Status = 'To Do' | 'In Progress' | 'Completed'
type Priority = 'Low' | 'Medium' | 'High'
type View = 'dashboard' | 'tasks' | 'projects' | 'kanban' | 'calendar'

type Project = {
  id: string
  name: string
  description: string
  color: string
  status: 'Planning' | 'In Progress' | 'On Hold' | 'Completed'
  startDate: string
  dueDate: string
}

type Task = {
  id: string
  title: string
  description: string
  projectId: string | number
  priority: Priority
  status: Status
  dueDate: string
  createdAt: string
}

const projectColors = [
  '#635BFF',
  '#0EA5E9',
  '#F97316',
  '#10B981',
  '#EC4899',
  '#8B5CF6',
]

function mapApiTask(apiTask: ApiTask): Task {
  const statusMap: Record<string, Status> = {
    TODO: 'To Do',
    IN_PROGRESS: 'In Progress',
    IN_REVIEW: 'In Progress',
    DONE: 'Completed',
    'To Do': 'To Do',
    'In Progress': 'In Progress',
    Completed: 'Completed',
  }
  const priorityMap: Record<string, Priority> = {
    LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High',
    Low: 'Low', Medium: 'Medium', High: 'High',
  }
  return {
    id: String(apiTask.id),
    title: apiTask.title,
    description: apiTask.description ?? '',
    projectId: String(apiTask.projectId),
    priority: priorityMap[apiTask.priority] || 'Medium',
    status: statusMap[apiTask.status] || 'To Do',
    dueDate: apiTask.dueDate ? String(apiTask.dueDate).slice(0, 10) : '',
    createdAt: apiTask.createdAt ? String(apiTask.createdAt).slice(0, 10) : today,
  }
}

const today = new Date().toISOString().split('T')[0]


function mapApiProject(project: ApiProject): Project {
  return {
    id: project.id,
    name: project.name,
    description: project.description ?? '',
    color: project.color || projectColors[0],
    // These fields are UI-only for now; the current backend Project model stores name, description and color.
    status: 'Planning',
    startDate: '',
    dueDate: '',
  }
}

function App() {
  const [projects, setProjects] = useState<Project[]>([])
  const [projectsLoading, setProjectsLoading] = useState(false)

  const [tasks, setTasks] = useState<Task[]>([])
  const [tasksLoading, setTasksLoading] = useState(false)

  const [view, setView] = useState<View>('dashboard')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [priorityFilter, setPriorityFilter] = useState('All')
  const [projectFilter, setProjectFilter] = useState('All')
  const [sortBy, setSortBy] = useState('dueDate')
  const [darkMode, setDarkMode] = useState(false)

  const [taskModal, setTaskModal] = useState(false)
  const [projectModal, setProjectModal] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  const [toast, setToast] = useState('')

  // ==================== AUTHENTICATION ====================
  const [currentUser, setCurrentUser] = useState<User | null>(() =>
    isAuthenticated() ? getUser() : null
  )

  function handleAuthSuccess(user: User) {
    saveUser(user)
    setCurrentUser(user)
  }

  function handleLogout() {
    removeToken()
    removeUser()
    setCurrentUser(null)
  }

  useEffect(() => {
    if (!currentUser) {
      setProjects([])
      return
    }

    let cancelled = false
    setProjectsLoading(true)

    fetchProjects()
      .then((apiProjects) => {
        if (cancelled) return
        setProjects(apiProjects.map(mapApiProject))
      })
      .catch((error) => {
        if (!cancelled) setToast(error instanceof Error ? error.message : 'Could not load projects.')
      })
      .finally(() => {
        if (!cancelled) setProjectsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [currentUser])

  useEffect(() => {
    if (!currentUser) {
      setTasks([])
      return
    }

    let cancelled = false
    setTasksLoading(true)

    fetchTasks()
      .then((apiTasks) => {
        if (!cancelled) setTasks(apiTasks.map(mapApiTask))
      })
      .catch((error) => {
        if (!cancelled) setToast(error instanceof Error ? error.message : 'Could not load tasks.')
      })
      .finally(() => {
        if (!cancelled) setTasksLoading(false)
      })

    return () => { cancelled = true }
  }, [currentUser])

  useEffect(() => {
    if (!toast) return

    const timeout = window.setTimeout(() => setToast(''), 3000)

    return () => window.clearTimeout(timeout)
  }, [toast])

  const completedTasks = tasks.filter(
    (task) => task.status === 'Completed'
  ).length

  const activeTasks = tasks.filter(
    (task) => task.status !== 'Completed'
  ).length

  const overdueTasks = tasks.filter(
    (task) =>
      task.status !== 'Completed' &&
      task.dueDate &&
      task.dueDate < today
  ).length

  const completionRate = tasks.length
    ? Math.round((completedTasks / tasks.length) * 100)
    : 0

  const filteredTasks = useMemo(() => {
    let result = [...tasks]

    if (statusFilter !== 'All') {
      result = result.filter((task) => task.status === statusFilter)
    }

    if (priorityFilter !== 'All') {
      result = result.filter((task) => task.priority === priorityFilter)
    }

    if (projectFilter !== 'All') {
      result = result.filter(
        (task) => String(task.projectId) === projectFilter
      )
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()

      result = result.filter((task) => {
        const project = projects.find(
          (p) => String(p.id) === String(task.projectId)
        )

        return (
          task.title.toLowerCase().includes(query) ||
          task.description.toLowerCase().includes(query) ||
          project?.name.toLowerCase().includes(query)
        )
      })
    }

    if (sortBy === 'priority') {
      const order = { High: 1, Medium: 2, Low: 3 }

      result.sort(
        (a, b) => order[a.priority] - order[b.priority]
      )
    } else if (sortBy === 'newest') {
      result.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime()
      )
    } else if (sortBy === 'oldest') {
      result.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() -
          new Date(b.createdAt).getTime()
      )
    } else if (sortBy === 'dueDate') {
      result.sort((a, b) =>
        (a.dueDate || '9999-99-99').localeCompare(
          b.dueDate || '9999-99-99'
        )
      )
    }

    return result
  }, [
    tasks,
    projects,
    statusFilter,
    priorityFilter,
    projectFilter,
    searchQuery,
    sortBy,
  ])

  function openNewTask() {
    setEditingTask(null)
    setTaskModal(true)
  }

  function openEditTask(task: Task) {
    setEditingTask(task)
    setTaskModal(true)
  }

  async function saveTask(e: FormEvent<HTMLFormElement>, formData: FormData) {
    e.preventDefault()

    const title = String(formData.get('title') || '').trim()
    if (!title) return

    // Read the selected project from the form and fall back to the first loaded project.
    const selectedProjectValue = formData.get('projectId')
    const formProjectId = selectedProjectValue == null
      ? ''
      : String(selectedProjectValue).trim()
    const fallbackProjectId = projects.length > 0 && projects[0].id
      ? String(projects[0].id).trim()
      : ''
    const projectId = formProjectId || fallbackProjectId

    if (!projectId) {
      setToast('Please create a project before adding a task.')
      console.error('Task creation stopped: no project ID was available.', {
        formProjectId,
        projects,
        formDataProjectId: selectedProjectValue,
      })
      return
    }

    const payload = {
      title,
      description: String(formData.get('description') || '').trim(),
      projectId,
      priority: String(formData.get('priority') || 'Medium').toUpperCase(),
      status: ({ 'To Do': 'TODO', 'In Progress': 'IN_PROGRESS', Completed: 'DONE' } as Record<string, string>)[String(formData.get('status') || 'To Do')] || 'TODO',
      dueDate: String(formData.get('dueDate') || '') || null,
    }

    try {
      if (editingTask) {
        const updated = await updateTask(editingTask.id, payload)
        const updatedTask = mapApiTask(updated)
        setTasks((previous) => previous.map((task) => task.id === editingTask.id ? updatedTask : task))
        if (selectedTask?.id === editingTask.id) setSelectedTask(updatedTask)
        setToast('Task updated successfully!')
      } else {
        console.log('Workly task creation payload:', payload)
        const created = await createTask(payload)
        setTasks((previous) => [mapApiTask(created), ...previous])
        setToast('Task created successfully!')
      }
      setTaskModal(false)
      setEditingTask(null)
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Could not save task.')
    }
  }

  async function deleteTask(id: string) {
    if (!window.confirm('Are you sure you want to delete this task?')) return

    try {
      await deleteTaskApi(id)
      setTasks((previous) => previous.filter((task) => task.id !== id))
      setSelectedTask(null)
      setToast('Task deleted successfully!')
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Could not delete task.')
    }
  }

  async function changeTaskStatus(id: string, status: Status) {
    const task = tasks.find((item) => item.id === id)
    if (!task) return

    const statusValue = ({ 'To Do': 'TODO', 'In Progress': 'IN_PROGRESS', Completed: 'DONE' } as Record<Status, string>)[status]
    try {
      const updated = await updateTask(id, {
        title: task.title,
        description: task.description,
        projectId: String(task.projectId),
        priority: task.priority.toUpperCase(),
        status: statusValue,
        dueDate: task.dueDate || null,
      })
      const updatedTask = mapApiTask(updated)
      setTasks((previous) => previous.map((item) => item.id === id ? updatedTask : item))
      if (selectedTask?.id === id) setSelectedTask(updatedTask)
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Could not update task status.')
    }
  }

  function openNewProject() {
    setEditingProject(null)
    setProjectModal(true)
  }

  async function saveProject(e: FormEvent<HTMLFormElement>, formData: FormData) {
    e.preventDefault()

    const name = String(formData.get('name') || '').trim()
    if (!name) return

    const projectPayload = {
      name,
      description: String(formData.get('description') || '').trim(),
      color: String(formData.get('color') || projectColors[0]),
    }

    try {
      if (editingProject) {
        const updated = await updateProject(editingProject.id, projectPayload)
        setProjects((previous) => previous.map((project) =>
          project.id === editingProject.id ? mapApiProject(updated) : project
        ))
        setToast('Project updated successfully!')
      } else {
        const created = await createProject(projectPayload)
        setProjects((previous) => [mapApiProject(created), ...previous])
        setToast('Project created successfully!')
      }

      setProjectModal(false)
      setEditingProject(null)
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Could not save project.')
    }
  }

  async function deleteProject(id: string) {
    const relatedTasks = tasks.filter((task) => String(task.projectId) === String(id))
    const message = relatedTasks.length > 0
      ? `This project has ${relatedTasks.length} tasks. Delete the project and its tasks?`
      : 'Delete this project?'

    if (!window.confirm(message)) return

    try {
      await deleteProjectApi(id)
      setProjects((previous) => previous.filter((project) => project.id !== id))
      setTasks((previous) => previous.filter((task) => String(task.projectId) !== String(id)))
      setToast('Project deleted successfully!')
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Could not delete project.')
    }
  }

  function getProject(id: string | number) {
    return projects.find((project) => String(project.id) === String(id))
  }

  function projectProgress(projectId: string | number) {
    const projectTasks = tasks.filter((task) => String(task.projectId) === String(projectId))

    if (!projectTasks.length) return 0

    const completed = projectTasks.filter((task) => task.status === 'Completed').length
    return Math.round((completed / projectTasks.length) * 100)
  }

  function navigate(nextView: View) {
    setView(nextView)
    setStatusFilter('All')
    setPriorityFilter('All')
    setProjectFilter('All')
  }

  const pageTitle: Record<View, string> = {
    dashboard: 'Dashboard',
    tasks: 'Tasks',
    projects: 'Projects',
    kanban: 'Kanban Board',
    calendar: 'Calendar',
  }

  const bg = darkMode ? 'bg-[#151522] text-white' : 'bg-gradient-to-br from-[#F1EDFF] via-[#EEF7FF] to-[#FFF0F7] text-[#1E1E2F]'
  const card = darkMode
    ? 'bg-[#222232] border-[#333347]'
    : 'bg-white border-violet-200 shadow-violet-100/50'

  if (!currentUser) {
    return <Auth onAuthSuccess={handleAuthSuccess} />
  }

  return (
    <div className={`min-h-screen ${bg} transition-colors`}>

      {/* HEADER */}
      <header className={`border-b shadow-sm ${darkMode ? 'border-[#333347] bg-[#20202E]' : 'border-violet-200 bg-white/90 backdrop-blur-xl shadow-sm'}`}>
        <div className="max-w-[1500px] mx-auto px-5 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">

            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-[#635BFF] to-[#A855F7] text-white p-2 rounded-xl shadow-md shadow-violet-200">
                <CheckSquare size={22} />
              </div>

              <div>
                <h1 className="text-xl font-bold">Workly</h1>
                <p className="text-[11px] text-gray-400">
                  Workspace
                </p>
              </div>
            </div>

            <nav className="hidden lg:flex items-center gap-2">
              <NavItem
                icon={<LayoutDashboard size={17} />}
                label="Dashboard"
                active={view === 'dashboard'}
                onClick={() => navigate('dashboard')}
              />

              <NavItem
                icon={<FolderKanban size={17} />}
                label="Projects"
                active={view === 'projects'}
                onClick={() => navigate('projects')}
              />

              <NavItem
                icon={<CheckSquare size={17} />}
                label="Tasks"
                active={view === 'tasks'}
                onClick={() => navigate('tasks')}
              />

              <NavItem
                icon={<ListTodo size={17} />}
                label="Kanban"
                active={view === 'kanban'}
                onClick={() => navigate('kanban')}
              />

              <NavItem
                icon={<CalendarDays size={17} />}
                label="Calendar"
                active={view === 'calendar'}
                onClick={() => navigate('calendar')}
              />
            </nav>

            <div className="flex items-center gap-3">

              <div className={`hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg ${darkMode ? 'bg-[#303044]' : 'bg-gray-100'}`}>
                <Search size={16} className="text-gray-400" />

                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tasks..."
                  className="bg-transparent outline-none text-sm w-32"
                />
              </div>

              <button
                onClick={() => setDarkMode((previous) => !previous)}
                className="p-2 text-gray-500 hover:text-[#635BFF]"
                title="Toggle theme"
              >
                {darkMode ? <Sun size={19} /> : <Moon size={19} />}
              </button>

              <button
                className="relative p-2 text-gray-500 hover:text-[#635BFF]"
                title="Notifications"
                onClick={() => setToast('You are all caught up!')}
              >
                <Bell size={20} />
                {overdueTasks > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
                )}
              </button>

              <div className="hidden sm:flex flex-col text-right">
                <span className="text-sm font-semibold">{currentUser.name}</span>
                <span className="text-xs text-gray-400">{currentUser.email}</span>
              </div>

              <div className="w-9 h-9 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-semibold text-sm">
                {currentUser.name.charAt(0).toUpperCase()}
              </div>

              <button
                onClick={handleLogout}
                className="p-2 text-gray-500 hover:text-red-500 transition"
                title="Log out"
                aria-label="Log out"
              >
                <LogOut size={19} />
              </button>

            </div>
          </div>

          {/* MOBILE NAV */}
          <div className="flex lg:hidden gap-2 mt-4 overflow-x-auto pb-1">
            {([
              ['dashboard', 'Dashboard'],
              ['projects', 'Projects'],
              ['tasks', 'Tasks'],
              ['kanban', 'Kanban'],
              ['calendar', 'Calendar'],
            ] as [View, string][]).map(([item, label]) => (
              <button
                key={item}
                onClick={() => navigate(item)}
                className={`px-3 py-2 rounded-lg text-sm whitespace-nowrap ${
                  view === item
                    ? 'bg-gradient-to-r from-[#635BFF] to-[#8B5CF6] text-white'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

        </div>
      </header>

      {/* PAGE */}
      <main className="max-w-[1500px] mx-auto px-5 lg:px-8 py-8">

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">

          <div>
            <p className="text-sm text-gray-400 mb-1">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>

            <h2 className="text-3xl font-bold">
              {view === 'dashboard' ? `Good morning, ${currentUser.name.split(' ')[0]} 👋` : pageTitle[view]}
            </h2>

            <p className="text-gray-400 mt-2">
              {view === 'dashboard'
                ? "Here's what's happening with your projects today."
                : `Manage your ${view} and stay productive.`}
            </p>
          </div>

          <div className="flex gap-2">
            {(view === 'dashboard' || view === 'tasks' || view === 'kanban') && (
              <button
                onClick={openNewTask}
                className="bg-[#635BFF] hover:bg-[#4F46E5] text-white px-4 py-3 rounded-xl flex items-center gap-2 font-medium transition"
              >
                <Plus size={18} />
                Add Task
              </button>
            )}

            {(view === 'dashboard' || view === 'projects') && (
              <button
                onClick={openNewProject}
                className="border border-gray-200 bg-white px-4 py-3 rounded-xl flex items-center gap-2 font-medium hover:bg-gray-50 transition text-gray-700"
              >
                <Plus size={18} />
                New Project
              </button>
            )}
          </div>

        </div>

        {/* DASHBOARD */}
        {view === 'dashboard' && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">

              <StatCard
                title="Total Projects"
                value={projects.length}
                description="Your workspace projects"
                icon={<FolderKanban size={20} />}
                color="purple"
              />

              <StatCard
                title="Total Tasks"
                value={tasks.length}
                description="Across all projects"
                icon={<CheckSquare size={20} />}
                color="blue"
              />

              <StatCard
                title="Completed"
                value={completedTasks}
                description={`${completionRate}% completion rate`}
                icon={<Check size={20} />}
                color="green"
              />

              <StatCard
                title="Overdue Tasks"
                value={overdueTasks}
                description="Need your attention"
                icon={<AlertCircle size={20} />}
                color="orange"
              />

            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">

              {/* PROJECT OVERVIEW */}
              <div className={`xl:col-span-2 border rounded-2xl p-6 shadow-md ${card}`}>

                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-bold">My Projects</h3>

                  <button
                    onClick={() => navigate('projects')}
                    className="text-[#635BFF] text-sm font-medium flex items-center gap-1"
                  >
                    View all <ArrowUpRight size={16} />
                  </button>
                </div>

                {projects.length ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {projects.slice(0, 4).map((project) => (
                      <ProjectCard
                        key={project.id}
                        project={project}
                        tasks={tasks.filter((t) => String(t.projectId) === String(project.id))}
                        progress={projectProgress(project.id)}
                        onEdit={() => {
                          setEditingProject(project)
                          setProjectModal(true)
                        }}
                        onDelete={() => deleteProject(project.id)}
                        onClick={() => {
                        navigate('tasks')
                        setProjectFilter(String(project.id))
                    }}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="No projects yet"
                    description="Create your first project to get started."
                    action="Create Project"
                    onClick={openNewProject}
                  />
                )}

              </div>

              {/* OVERVIEW */}
              <div className={`border rounded-2xl p-6 shadow-md ${card}`}>

                <h3 className="text-lg font-bold mb-5">
                  Task Overview
                </h3>

                <div className="flex justify-center mb-6">
                  <ProgressRing progress={completionRate} />
                </div>

                <div className="space-y-4">

                  <OverviewRow
                    label="To Do"
                    count={tasks.filter((t) => t.status === 'To Do').length}
                    color="bg-gray-400"
                  />

                  <OverviewRow
                    label="In Progress"
                    count={tasks.filter((t) => t.status === 'In Progress').length}
                    color="bg-blue-500"
                  />

                  <OverviewRow
                    label="Completed"
                    count={completedTasks}
                    color="bg-green-500"
                  />

                </div>

              </div>

            </div>

            {/* RECENT TASKS */}
            <div className={`border rounded-2xl p-6 shadow-md ${card}`}>

              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-lg font-bold">Recent Tasks</h3>
                  <p className="text-sm text-gray-400 mt-1">
                    Your latest tasks
                  </p>
                </div>

                <button
                  onClick={() => navigate('tasks')}
                  className="text-[#635BFF] text-sm font-medium"
                >
                  View all
                </button>
              </div>

              <div className="space-y-3">
                {tasks.slice(0, 5).map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    project={getProject(task.projectId)}
                    onToggle={() =>
                      changeTaskStatus(
                        task.id,
                        task.status === 'Completed'
                          ? 'To Do'
                          : 'Completed'
                      )
                    }
                    onEdit={() => openEditTask(task)}
                    onDelete={() => deleteTask(task.id)}
                    onClick={() => setSelectedTask(task)}
                  />
                ))}
              </div>

            </div>
          </>
        )}

        {/* TASKS VIEW */}
        {view === 'tasks' && (
          <div className={`border rounded-2xl p-6 shadow-md ${card}`}>

            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">

              <div>
                <h3 className="text-xl font-bold">All Tasks</h3>
                <p className="text-sm text-gray-400 mt-1">
                  {tasksLoading ? 'Loading tasks...' : `${filteredTasks.length} tasks found`}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-700"
                >
                  <option value="All">All Statuses</option>
                  <option value="To Do">To Do</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>

                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-700"
                >
                  <option value="All">All Priorities</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>

                <select
                  value={projectFilter}
                  onChange={(e) => setProjectFilter(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-700"
                >
                  <option value="All">All Projects</option>
                  {projects.map((project) => (
                    <option key={project.id} value={String(project.id)}>
                      {project.name}
                    </option>
                  ))}
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-700"
                >
                  <option value="dueDate">Sort: Due Date</option>
                  <option value="priority">Sort: Priority</option>
                  <option value="newest">Sort: Newest</option>
                  <option value="oldest">Sort: Oldest</option>
                </select>

              </div>

            </div>

            <div className="flex flex-wrap gap-2 mb-5">

              {(['All', 'To Do', 'In Progress', 'Completed'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    statusFilter === status
                      ? 'bg-gradient-to-r from-[#635BFF] to-[#8B5CF6] text-white'
                      : 'bg-white text-gray-600 border border-gray-200 hover:bg-violet-50 hover:border-violet-200'
                  }`}
                >
                  {status}
                  {status === 'All' && ` (${tasks.length})`}
                  {status === 'To Do' &&
                    ` (${tasks.filter((t) => t.status === 'To Do').length})`}
                  {status === 'In Progress' &&
                    ` (${tasks.filter((t) => t.status === 'In Progress').length})`}
                  {status === 'Completed' && ` (${completedTasks})`}
                </button>
              ))}

            </div>

            {filteredTasks.length ? (
              <div className="space-y-3">
                {filteredTasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    project={getProject(task.projectId)}
                    onToggle={() =>
                      changeTaskStatus(
                        task.id,
                        task.status === 'Completed'
                          ? 'To Do'
                          : 'Completed'
                      )
                    }
                    onEdit={() => openEditTask(task)}
                    onDelete={() => deleteTask(task.id)}
                    onClick={() => setSelectedTask(task)}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No tasks found"
                description="Try changing your filters or create a new task."
                action="Create Task"
                onClick={openNewTask}
              />
            )}

          </div>
        )}

        {/* PROJECTS VIEW */}
        {view === 'projects' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">

              {projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  tasks={tasks.filter((t) => String(t.projectId) === String(project.id))}
                  progress={projectProgress(project.id)}
                  onEdit={() => {
                    setEditingProject(project)
                    setProjectModal(true)
                  }}
                  onDelete={() => deleteProject(project.id)}
                  onClick={() => {
                  navigate('tasks')
                  setProjectFilter(String(project.id))
                  }}
                />
              ))}

            </div>

            {!projects.length && (
              <EmptyState
                title="No projects yet"
                description="Create a project to organize your tasks."
                action="Create Project"
                onClick={openNewProject}
              />
            )}
          </>
        )}

        {/* KANBAN */}
        {view === 'kanban' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {(['To Do', 'In Progress', 'Completed'] as Status[]).map((status) => {
              const columnTasks = filteredTasks.filter(
                (task) => task.status === status
              )

              return (
                <div key={status} className={`border rounded-2xl p-4 ${card}`}>

                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <StatusDot status={status} />
                      <h3 className="font-bold">{status}</h3>
                      <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full text-xs">
                        {columnTasks.length}
                      </span>
                    </div>

                    <button
                      onClick={openNewTask}
                      className="text-gray-400 hover:text-[#635BFF]"
                    >
                      <Plus size={18} />
                    </button>
                  </div>

                  <div className="space-y-3">

                    {columnTasks.map((task) => (
                      <div
                        key={task.id}
                        className="bg-gradient-to-br from-white to-indigo-50/50 border border-indigo-100 rounded-xl p-4 shadow-sm text-gray-800 hover:shadow-md transition"
                      >

                        <div className="flex justify-between items-start mb-3">
                          <PriorityBadge priority={task.priority} />

                          <button
                            onClick={() => openEditTask(task)}
                            className="text-gray-400 hover:text-[#635BFF]"
                          >
                            <Pencil size={15} />
                          </button>
                        </div>

                        <button
                          onClick={() => setSelectedTask(task)}
                          className="font-semibold text-left hover:text-[#635BFF]"
                        >
                          {task.title}
                        </button>

                        <p className="text-xs text-gray-400 mt-2 line-clamp-2">
                          {task.description || 'No description'}
                        </p>

                        <div className="flex items-center justify-between mt-4">

                          <span className="text-xs text-gray-500">
                            {getProject(task.projectId)?.name || 'Unknown Project'}
                          </span>

                          <span className="text-xs text-gray-400">
                            {formatDate(task.dueDate)}
                          </span>

                        </div>

                        <div className="flex gap-1 mt-3">

                          {(['To Do', 'In Progress', 'Completed'] as Status[]).map((nextStatus) => (
                            <button
                              key={nextStatus}
                              onClick={() => changeTaskStatus(task.id, nextStatus)}
                              className={`flex-1 text-[10px] py-1.5 rounded ${
                                task.status === nextStatus
                                  ? 'bg-gradient-to-r from-[#635BFF] to-[#8B5CF6] text-white'
                                  : 'bg-white text-gray-500 border border-gray-100 hover:bg-violet-50'
                              }`}
                            >
                              {nextStatus}
                            </button>
                          ))}

                        </div>

                      </div>
                    ))}

                    {!columnTasks.length && (
                      <div className="text-center py-8 text-sm text-gray-400">
                        No tasks here
                      </div>
                    )}

                  </div>
                </div>
              )
            })}

          </div>
        )}

        {/* CALENDAR */}
        {view === 'calendar' && (
          <div className={`border rounded-2xl p-6 shadow-md ${card}`}>

            <div className="mb-6">
              <h3 className="text-xl font-bold">Upcoming Tasks</h3>
              <p className="text-sm text-gray-400 mt-1">
                Tasks organized by due date
              </p>
            </div>

            {filteredTasks
              .filter((task) => task.dueDate)
              .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
              .length ? (
              <div className="space-y-5">

                {Object.entries(
                  filteredTasks
                    .filter((task) => task.dueDate)
                    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
                    .reduce<Record<string, Task[]>>((groups, task) => {
                      const date = task.dueDate
                      groups[date] = groups[date] || []
                      groups[date].push(task)
                      return groups
                    }, {})
                ).map(([date, dateTasks]) => (
                  <div key={date}>

                    <div className="flex items-center gap-3 mb-3">
                      <div className="bg-gradient-to-r from-violet-100 to-indigo-100 text-[#635BFF] rounded-lg px-3 py-2 font-semibold text-sm ring-1 ring-violet-200/70">
                        {formatDate(date)}
                      </div>

                      <span className="text-xs text-gray-400">
                        {dateTasks.length} task(s)
                      </span>
                    </div>

                    <div className="space-y-2 ml-2 border-l-2 border-gray-100 pl-4">
                      {dateTasks.map((task) => (
                        <TaskRow
                          key={task.id}
                          task={task}
                          project={getProject(task.projectId)}
                          onToggle={() =>
                            changeTaskStatus(
                              task.id,
                              task.status === 'Completed'
                                ? 'To Do'
                                : 'Completed'
                            )
                          }
                          onEdit={() => openEditTask(task)}
                          onDelete={() => deleteTask(task.id)}
                          onClick={() => setSelectedTask(task)}
                        />
                      ))}
                    </div>

                  </div>
                ))}

              </div>
            ) : (
              <EmptyState
                title="No scheduled tasks"
                description="Tasks with due dates will appear here."
                action="Create Task"
                onClick={openNewTask}
              />
            )}

          </div>
        )}

      </main>

      {/* TASK MODAL */}
      {taskModal && (
        <TaskModal
          task={editingTask}
          projects={projects}
          onClose={() => {
            setTaskModal(false)
            setEditingTask(null)
          }}
          onSave={saveTask}
        />
      )}

      {/* PROJECT MODAL */}
      {projectModal && (
        <ProjectModal
          project={editingProject}
          onClose={() => {
            setProjectModal(false)
            setEditingProject(null)
          }}
          onSave={saveProject}
        />
      )}

      {/* TASK DETAILS */}
      {selectedTask && (
        <TaskDetailsModal
          task={selectedTask}
          project={getProject(selectedTask.projectId)}
          onClose={() => setSelectedTask(null)}
          onEdit={() => {
            setSelectedTask(null)
            openEditTask(selectedTask)
          }}
          onDelete={() => deleteTask(selectedTask.id)}
        />
      )}

      {/* TOAST */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[100] bg-[#1E1E2F] text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-3">
          <Check size={18} className="text-green-400" />
          {toast}
          <button onClick={() => setToast('')}>
            <X size={16} />
          </button>
        </div>
      )}

    </div>
  )
}

/* ================= COMPONENTS ================= */

function NavItem({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${
        active
          ? 'bg-gradient-to-r from-violet-100 to-indigo-100 text-[#635BFF] font-semibold shadow-sm'
          : 'text-gray-500 hover:bg-violet-50 hover:text-[#635BFF]'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

function StatCard({
  title,
  value,
  description,
  icon,
  color,
}: {
  title: string
  value: number
  description: string
  icon: React.ReactNode
  color: string
}) {
  const colors: Record<string, string> = {
    purple: 'bg-gradient-to-br from-violet-100 to-purple-100 text-violet-700 ring-1 ring-violet-200/70',
    blue: 'bg-gradient-to-br from-sky-100 to-blue-100 text-blue-700 ring-1 ring-blue-200/70',
    green: 'bg-gradient-to-br from-emerald-100 to-green-100 text-emerald-700 ring-1 ring-emerald-200/70',
    orange: 'bg-gradient-to-br from-amber-100 to-orange-100 text-orange-700 ring-1 ring-orange-200/70',
  }

  const statBackgrounds: Record<string, string> = {
    purple: 'bg-gradient-to-br from-violet-100 via-white to-purple-100 border-violet-200',
    blue: 'bg-gradient-to-br from-sky-100 via-white to-blue-100 border-sky-200',
    green: 'bg-gradient-to-br from-emerald-100 via-white to-green-100 border-emerald-200',
    orange: 'bg-gradient-to-br from-amber-100 via-white to-orange-100 border-orange-200',
  }

  return (
    <div className={`${statBackgrounds[color]} border rounded-2xl p-5 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-200`}>

      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-500">{title}</p>

        <div className={`p-2 rounded-lg ${colors[color]}`}>
          {icon}
        </div>
      </div>

      <h3 className="text-3xl font-bold mb-1">{value}</h3>
      <p className="text-sm text-gray-400">{description}</p>

    </div>
  )
}

function ProjectCard({
  project,
  tasks,
  progress,
  onEdit,
  onDelete,
  onClick,
}: {
  project: Project
  tasks: Task[]
  progress: number
  onEdit: () => void
  onDelete: () => void
  onClick: () => void
}) {
  return (
    <div className="border rounded-2xl p-5 hover:shadow-xl hover:-translate-y-1 transition-all duration-200" style={{ borderColor: `${project.color}55`, background: `linear-gradient(145deg, #ffffff 0%, ${project.color}12 100%)` }}>

      <div className="flex justify-between items-start mb-4">

        <div
          className="w-11 h-11 rounded-xl shadow-sm ring-4 ring-white/70"
          style={{ backgroundColor: project.color }}
        />

        <div className="flex gap-1">
          <button
            onClick={onEdit}
            className="p-2 text-gray-400 hover:text-[#635BFF]"
            title="Edit project"
          >
            <Pencil size={16} />
          </button>

          <button
            onClick={onDelete}
            className="p-2 text-gray-400 hover:text-red-500"
            title="Delete project"
          >
            <Trash2 size={16} />
          </button>
        </div>

      </div>

      <button onClick={onClick} className="text-left w-full">

        <h4 className="font-bold text-lg hover:text-[#635BFF]">
          {project.name}
        </h4>

        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
          {project.description || 'No project description'}
        </p>

      </button>

      <div className="flex justify-between items-center mt-4 mb-2 text-sm">
        <span className="text-gray-500">Progress</span>
        <span className="font-semibold">{progress}%</span>
      </div>

      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-4">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${progress}%`,
            backgroundColor: project.color,
          }}
        />
      </div>

      <div className="flex justify-between text-xs text-gray-400">
        <span>{tasks.length} tasks</span>
        <span>{project.status}</span>
      </div>

    </div>
  )
}

function TaskRow({
  task,
  project,
  onToggle,
  onEdit,
  onDelete,
  onClick,
}: {
  task: Task
  project?: Project
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
  onClick: () => void
}) {
  const overdue =
    task.status !== 'Completed' &&
    task.dueDate &&
    task.dueDate < today

  return (
    <div className="bg-gradient-to-r from-white to-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-center gap-3 hover:from-violet-100 hover:to-white hover:border-violet-200 hover:shadow-md transition group">

      <button
        onClick={onToggle}
        className={`w-5 h-5 flex-shrink-0 rounded-full border flex items-center justify-center ${
          task.status === 'Completed'
            ? 'bg-green-500 border-green-500 text-white'
            : 'border-gray-300 hover:border-[#635BFF]'
        }`}
      >
        {task.status === 'Completed' && <Check size={12} />}
      </button>

      <button onClick={onClick} className="flex-1 min-w-0 text-left">

        <h4
          className={`font-medium truncate ${
            task.status === 'Completed'
              ? 'line-through text-gray-400'
              : 'text-gray-800 hover:text-[#635BFF]'
          }`}
        >
          {task.title}
        </h4>

        <div className="flex flex-wrap items-center gap-2 mt-2">

          {project && (
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: project.color }}
              />
              {project.name}
            </span>
          )}

          <PriorityBadge priority={task.priority} />

          <StatusBadge status={task.status} />

          {task.dueDate && (
            <span className={`text-xs ${overdue ? 'text-red-500' : 'text-gray-400'}`}>
              <Clock size={12} className="inline mr-1" />
              {formatDate(task.dueDate)}
              {overdue && ' · Overdue'}
            </span>
          )}

        </div>

      </button>

      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
        <button
          onClick={onEdit}
          className="p-2 text-gray-400 hover:text-[#635BFF]"
          title="Edit task"
        >
          <Pencil size={15} />
        </button>

        <button
          onClick={onDelete}
          className="p-2 text-gray-400 hover:text-red-500"
          title="Delete task"
        >
          <Trash2 size={15} />
        </button>
      </div>

    </div>
  )
}

function PriorityBadge({ priority }: { priority: Priority }) {
  const styles: Record<Priority, string> = {
    High: 'bg-red-100 text-red-700 ring-1 ring-red-200',
    Medium: 'bg-amber-100 text-amber-800 ring-1 ring-amber-200',
    Low: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200',
  }

  return (
    <span className={`text-xs px-2 py-1 rounded-full ${styles[priority]}`}>
      {priority}
    </span>
  )
}

function StatusBadge({ status }: { status: Status }) {
  const styles: Record<Status, string> = {
    'To Do': 'bg-slate-100 text-slate-700 ring-1 ring-slate-200',
    'In Progress': 'bg-sky-100 text-sky-700 ring-1 ring-sky-200',
    Completed: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200',
  }

  return (
    <span className={`text-xs px-2 py-1 rounded-full ${styles[status]}`}>
      {status}
    </span>
  )
}

function StatusDot({ status }: { status: Status }) {
  const colors: Record<Status, string> = {
    'To Do': 'bg-gray-400',
    'In Progress': 'bg-blue-500',
    Completed: 'bg-green-500',
  }

  return <span className={`w-2.5 h-2.5 rounded-full ${colors[status]}`} />
}

function OverviewRow({
  label,
  count,
  color,
}: {
  label: string
  count: number
  color: string
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
        <span className="text-sm text-gray-500">{label}</span>
      </div>

      <span className="font-semibold">{count}</span>
    </div>
  )
}

function ProgressRing({ progress }: { progress: number }) {
  return (
    <div className="relative w-40 h-40">
      <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
        <circle
          cx="80"
          cy="80"
          r="65"
          fill="none"
          stroke="#F0F0F5"
          strokeWidth="14"
        />

        <circle
          cx="80"
          cy="80"
          r="65"
          fill="none"
          stroke="#8B5CF6"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${2 * Math.PI * 65}`}
          strokeDashoffset={`${2 * Math.PI * 65 * (1 - progress / 100)}`}
          className="transition-all duration-500"
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold">{progress}%</span>
        <span className="text-xs text-gray-400">Completed</span>
      </div>
    </div>
  )
}

function EmptyState({
  title,
  description,
  action,
  onClick,
}: {
  title: string
  description: string
  action: string
  onClick: () => void
}) {
  return (
    <div className="text-center py-14">

      <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
        <ListTodo size={24} />
      </div>

      <h3 className="font-semibold text-gray-700">{title}</h3>

      <p className="text-sm text-gray-400 mt-2">{description}</p>

      <button
        onClick={onClick}
        className="mt-4 bg-gradient-to-r from-[#635BFF] to-[#8B5CF6] text-white px-4 py-2 rounded-lg text-sm font-medium hover:brightness-105 shadow-md shadow-violet-200"
      >
        {action}
      </button>

    </div>
  )
}

function TaskModal({
  task,
  projects,
  onClose,
  onSave,
}: {
  task: Task | null
  projects: Project[]
  onClose: () => void
  onSave: (e: FormEvent<HTMLFormElement>, formData: FormData) => void
}) {
  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    const formData = new FormData(e.currentTarget)
    onSave(e, formData)
  }

  return (
    <Modal onClose={onClose} title={task ? 'Edit Task' : 'Create Task'}>

      <form onSubmit={handleSubmit} className="space-y-4">

        <FormField label="Task Title">
          <input
            name="title"
            defaultValue={task?.title}
            placeholder="Enter task title"
            required
            className="form-input"
          />
        </FormField>

        <FormField label="Description">
          <textarea
            name="description"
            defaultValue={task?.description}
            placeholder="Describe this task..."
            rows={3}
            className="form-input resize-none"
          />
        </FormField>

        <FormField label="Project">
          <select
            name="projectId"
            defaultValue={task ? String(task.projectId) : (projects[0]?.id ? String(projects[0].id) : '')}
            required
            className="form-input"
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </FormField>

        <div className="grid grid-cols-2 gap-4">

          <FormField label="Priority">
            <select
              name="priority"
              defaultValue={task?.priority ?? 'Medium'}
              className="form-input"
            >
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
            </select>
          </FormField>

          <FormField label="Status">
            <select
              name="status"
              defaultValue={task?.status ?? 'To Do'}
              className="form-input"
            >
              <option>To Do</option>
              <option>In Progress</option>
              <option>Completed</option>
            </select>
          </FormField>

        </div>

        <FormField label="Due Date">
          <input
            name="dueDate"
            type="date"
            defaultValue={task?.dueDate}
            className="form-input"
          />
        </FormField>

        <div className="flex gap-3 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 border border-gray-200 rounded-lg py-2.5 font-medium text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            className="flex-1 bg-gradient-to-r from-[#635BFF] to-[#8B5CF6] hover:brightness-105 text-white rounded-lg py-2.5 font-medium shadow-md shadow-violet-200"
          >
            {task ? 'Save Changes' : 'Create Task'}
          </button>
        </div>

      </form>

    </Modal>
  )
}

function ProjectModal({
  project,
  onClose,
  onSave,
}: {
  project: Project | null
  onClose: () => void
  onSave: (e: FormEvent<HTMLFormElement>, formData: FormData) => void
}) {
  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    const formData = new FormData(e.currentTarget)
    onSave(e, formData)
  }

  return (
    <Modal onClose={onClose} title={project ? 'Edit Project' : 'Create Project'}>

      <form onSubmit={handleSubmit} className="space-y-4">

        <FormField label="Project Name">
          <input
            name="name"
            defaultValue={project?.name}
            placeholder="Enter project name"
            required
            className="form-input"
          />
        </FormField>

        <FormField label="Description">
          <textarea
            name="description"
            defaultValue={project?.description}
            placeholder="Describe your project..."
            rows={3}
            className="form-input resize-none"
          />
        </FormField>

        <FormField label="Project Color">
          <div className="flex gap-3 flex-wrap">
            {projectColors.map((color) => (
              <label key={color} className="cursor-pointer">
                <input
                  type="radio"
                  name="color"
                  value={color}
                  defaultChecked={project?.color === color || (!project && color === projectColors[0])}
                  className="sr-only peer"
                />

                <span
                  className="block w-8 h-8 rounded-full ring-2 ring-transparent peer-checked:ring-gray-800 peer-checked:ring-offset-2"
                  style={{ backgroundColor: color }}
                />
              </label>
            ))}
          </div>
        </FormField>

        <FormField label="Status">
          <select
            name="status"
            defaultValue={project?.status ?? 'Planning'}
            className="form-input"
          >
            <option>Planning</option>
            <option>In Progress</option>
            <option>On Hold</option>
            <option>Completed</option>
          </select>
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Start Date">
            <input
              name="startDate"
              type="date"
              defaultValue={project?.startDate}
              className="form-input"
            />
          </FormField>

          <FormField label="Deadline">
            <input
              name="dueDate"
              type="date"
              defaultValue={project?.dueDate}
              className="form-input"
            />
          </FormField>
        </div>

        <div className="flex gap-3 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 border border-gray-200 rounded-lg py-2.5 font-medium text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            className="flex-1 bg-gradient-to-r from-[#635BFF] to-[#8B5CF6] hover:brightness-105 text-white rounded-lg py-2.5 font-medium shadow-md shadow-violet-200"
          >
            {project ? 'Save Changes' : 'Create Project'}
          </button>
        </div>

      </form>

    </Modal>
  )
}

function TaskDetailsModal({
  task,
  project,
  onClose,
  onEdit,
  onDelete,
}: {
  task: Task
  project?: Project
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <Modal onClose={onClose} title="Task Details">

      <div className="space-y-4">

        <h2 className="text-xl font-bold">{task.title}</h2>

        <p className="text-gray-500 text-sm leading-relaxed">
          {task.description || 'No description has been added.'}
        </p>

        <div className="grid grid-cols-2 gap-3">

          <DetailItem label="Status">
            <StatusBadge status={task.status} />
          </DetailItem>

          <DetailItem label="Priority">
            <PriorityBadge priority={task.priority} />
          </DetailItem>

          <DetailItem label="Project">
            <span>{project?.name || 'Unknown project'}</span>
          </DetailItem>

          <DetailItem label="Due Date">
            <span>{formatDate(task.dueDate)}</span>
          </DetailItem>

        </div>

        <div className="flex gap-3 pt-3">
          <button
            onClick={onDelete}
            className="border border-red-200 text-red-500 rounded-lg py-2.5 px-4 hover:bg-red-50"
          >
            <Trash2 size={16} />
          </button>

          <button
            onClick={onEdit}
            className="flex-1 bg-gradient-to-r from-[#635BFF] to-[#8B5CF6] text-white rounded-lg py-2.5 font-medium hover:brightness-105 shadow-md shadow-violet-200"
          >
            Edit Task
          </button>
        </div>

      </div>

    </Modal>
  )
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string
  children: React.ReactNode
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl max-h-[90vh] overflow-y-auto">

        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-800">{title}</h3>

          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700"
          >
            <X size={22} />
          </button>
        </div>

        {children}

      </div>
    </div>
  )
}

function FormField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      {children}
    </div>
  )
}

function DetailItem({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-gradient-to-br from-violet-50 to-sky-50 rounded-xl p-3 border border-violet-100">
      <p className="text-xs text-gray-400 mb-2">{label}</p>
      <div className="text-sm font-medium text-gray-700">
        {children}
      </div>
    </div>
  )
}

function formatDate(date: string) {
  if (!date) return 'No due date'

  return new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default App