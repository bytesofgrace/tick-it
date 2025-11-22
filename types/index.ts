export interface Todo {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: boolean;
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}

export interface User {
  uid: string;
  email: string;
  displayName?: string;
}
