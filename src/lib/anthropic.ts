import Anthropic from '@anthropic-ai/sdk'

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export const AI_TOOLS: Anthropic.Tool[] = [
  {
    name: 'create_task',
    description: 'Create a new task for the user. Use this when the user asks to add, create, or schedule a task.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Task title' },
        scheduled_date: { type: 'string', description: 'Date in YYYY-MM-DD format, e.g. "2025-05-15"' },
        priority: { type: 'string', enum: ['low', 'medium', 'high'], description: 'Task priority' },
        project_id: { type: 'string', description: 'Optional project UUID to assign the task to' },
        description: { type: 'string', description: 'Optional task description or notes' },
      },
      required: ['title'],
    },
  },
  {
    name: 'update_task',
    description: 'Update an existing task status, title, date, or priority.',
    input_schema: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: 'UUID of the task to update' },
        title: { type: 'string', description: 'New title (optional)' },
        status: { type: 'string', enum: ['todo', 'in_progress', 'done'] },
        priority: { type: 'string', enum: ['low', 'medium', 'high'] },
        scheduled_date: { type: 'string', description: 'New scheduled date YYYY-MM-DD' },
      },
      required: ['task_id'],
    },
  },
  {
    name: 'list_tasks',
    description: 'Fetch tasks for a date range or all upcoming tasks.',
    input_schema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Specific date YYYY-MM-DD, or omit for all upcoming' },
        status: { type: 'string', enum: ['todo', 'in_progress', 'done'], description: 'Filter by status' },
      },
    },
  },
  {
    name: 'create_project',
    description: 'Create a new project.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Project name' },
        description: { type: 'string', description: 'Optional project description' },
        due_date: { type: 'string', description: 'Optional due date YYYY-MM-DD' },
        color: { type: 'string', description: 'Optional hex color, e.g. #6366f1' },
      },
      required: ['name'],
    },
  },
  {
    name: 'list_projects',
    description: 'List the user\'s active projects.',
    input_schema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'create_habit',
    description: 'Create a new habit to track.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Habit name' },
        description: { type: 'string', description: 'Optional description' },
        frequency: { type: 'string', enum: ['daily', 'weekdays', 'weekly'], description: 'How often to track' },
        color: { type: 'string', description: 'Optional hex color' },
      },
      required: ['name'],
    },
  },
  {
    name: 'log_habit',
    description: 'Log a habit as completed for today or a specific date.',
    input_schema: {
      type: 'object',
      properties: {
        habit_id: { type: 'string', description: 'UUID of the habit' },
        logged_date: { type: 'string', description: 'Date YYYY-MM-DD, defaults to today' },
      },
      required: ['habit_id'],
    },
  },
  {
    name: 'list_habits',
    description: 'List the user\'s habits with today\'s completion status.',
    input_schema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_daily_summary',
    description: 'Get a summary of today\'s tasks and habit status for planning.',
    input_schema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Date YYYY-MM-DD, defaults to today' },
      },
    },
  },
]

export const SYSTEM_PROMPT = `You are a helpful life planning assistant integrated into a daily planner app.

When the user asks you to do something — create a task, add a project, log a habit, schedule something — use the provided tools immediately to perform the action, then briefly confirm what you did.

Be concise and friendly. You have access to the user's tasks, projects, and habits. Use get_daily_summary to understand their current workload before making suggestions.

Today's date will be provided in the user's first message. Always use YYYY-MM-DD format for dates.

If the user says "tomorrow", "next week", etc., calculate the correct date based on today's date.`
