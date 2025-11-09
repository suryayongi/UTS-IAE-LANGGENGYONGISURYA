'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useSubscription, gql } from '@apollo/client';
import axios from 'axios';

const GET_TASKS = gql`
  query GetTasks {
    tasks {
      id
      title
      status
      teamId
    }
  }
`;

const CREATE_TASK = gql`
  mutation CreateTask($title: String!, $teamId: String!) {
    createTask(title: $title, teamId: $teamId) {
      id
      title
      status
    }
  }
`;

const TASK_CREATED_SUB = gql`
  subscription OnTaskCreated {
    taskCreated {
      id
      title
      status
    }
  }
`;

export default function Home() {
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('john@example.com');
  const [password, setPassword] = useState('adminpassword');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (savedToken) setToken(savedToken);
  }, []);

  const { data: taskData, loading, refetch } = useQuery(GET_TASKS, {
    skip: !token,
  });

  const [createTask] = useMutation(CREATE_TASK);

  useSubscription(TASK_CREATED_SUB, {
    onData: ({ data }) => {
      alert(`⚡ New Task Created: ${data.data.taskCreated.title}`);
      refetch();
    }
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:3000/api/users/login', { email, password });
      localStorage.setItem('token', res.data.token);
      setToken(res.data.token);
      setUser(res.data.user);
      alert('Login Berhasil!');
      window.location.reload();
    } catch (err) {
      alert('Login Gagal!');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.reload();
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle) return;
    try {
        await createTask({ variables: { title: newTaskTitle, teamId: user?.teamId || 'team-A' } });
        setNewTaskTitle('');
    } catch (err) {
        console.error(err);
        alert("Gagal membuat task! Cek console browser.");
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded shadow-md w-96">
          <h1 className="text-2xl font-bold mb-6 text-center">Login UTS</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <input className="w-full border p-2 rounded" type="email" value={email} onChange={e => setEmail(e.target.value)} />
            <input className="w-full border p-2 rounded" type="password" value={password} onChange={e => setPassword(e.target.value)} />
            <button className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600">Login (Dapat Token)</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Task Manager UTS 🚀</h1>
          <button onClick={handleLogout} className="bg-red-500 text-white px-4 py-2 rounded">Logout</button>
        </div>
        <div className="bg-white p-6 rounded-lg shadow mb-8">
            <h2 className="text-xl font-semibold mb-4">Create New Task</h2>
          <form onSubmit={handleCreateTask} className="flex gap-4">
            <input type="text" placeholder="Task title..." className="flex-1 border p-2 rounded" value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} />
            <button type="submit" className="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600">Add Task</button>
          </form>
        </div>
        <div className="grid gap-4">
          {loading ? <p>Loading tasks...</p> : taskData?.tasks.map((task: any) => (
            <div key={task.id} className="bg-white p-4 rounded shadow border-l-4 border-blue-500 flex justify-between">
              <div>
                  <h3 className="font-bold">{task.title}</h3>
                  <p className="text-sm text-gray-500">Team: {task.teamId}</p>
              </div>
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs h-fit">{task.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}