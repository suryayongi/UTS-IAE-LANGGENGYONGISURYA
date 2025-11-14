'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useSubscription, gql } from '@apollo/client';
import axios from 'axios';

// --- DEFINISI GRAPHQL (Sesuai Backend Baru) ---
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

// --- TAMBAHAN BARU ---
const DELETE_TASK = gql`
  mutation DeleteTask($id: ID!) {
    deleteTask(id: $id)
  }
`;
// ---------------------

// Subscription untuk notifikasi real-time
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
  const [email, setEmail] = useState(''); // DIKOSONGKAN
  const [password, setPassword] = useState(''); // DIKOSONGKAN
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [user, setUser] = useState<any>(null);

  // --- TAMBAHAN BARU ---
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  // ---------------------

  // Cek apakah sudah login saat buka web (DIMODIFIKASI)
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user'); // Ambil data user
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser)); // Simpan data user ke state
    }
  }, []);

  // GraphQL Hooks
  const { data: taskData, loading, refetch } = useQuery(GET_TASKS, {
    skip: !token, // Jangan query kalau belum punya token (nanti error 401)
  });

  const [createTask] = useMutation(CREATE_TASK);

  // --- TAMBAHAN BARU ---
  const [deleteTask] = useMutation(DELETE_TASK, {
    onCompleted: () => refetch(), // Refresh data setelah hapus
    onError: (error) => alert(error.message) // Tampilkan error jika (user biasa)
  });
  // ---------------------

  // Langsung listen subscription
  useSubscription(TASK_CREATED_SUB, {
    onData: ({ data }) => {
      const newTask = data.data.taskCreated;
      alert(`⚡ New Task Created: ${newTask.title}`);
      refetch(); // Refresh data otomatis
    }
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Tembak ke API Gateway -> REST Service
      const res = await axios.post('http://localhost:3000/api/users/login', {
        email,
        password
      });
      
      const receivedToken = res.data.token;
      localStorage.setItem('token', receivedToken); // Simpan token di browser
      localStorage.setItem('user', JSON.stringify(res.data.user)); // <-- TAMBAHAN INI
      setToken(receivedToken);
      setUser(res.data.user);
      alert('Login Berhasil!');
      window.location.reload(); // Refresh agar Apollo Client pakai token baru
    } catch (err) {
      alert('Login Gagal! Cek email/password.');
      console.error(err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user'); // <-- TAMBAHAN INI
    setToken('');
    setUser(null);
    window.location.reload();
  };

  // --- FUNGSI BARU ---
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:3000/api/users/register', { 
        name, 
        email, 
        password 
      });
      
      alert('Registrasi Berhasil! Silakan login.');
      // Kembalikan ke mode login
      setIsRegistering(false);
      setPassword('');
    } catch (err: any) {
      alert('Registrasi Gagal! ' + (err.response?.data?.message || 'Error tidak diketahui'));
      console.error(err);
    }
  };
  // -------------------

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle) return;
    try {
      await createTask({
        variables: {
          title: newTaskTitle,
          teamId: user?.teamId || 'team-A'
        }
      });
      setNewTaskTitle('');
    } catch (error) {
      console.error('Error creating task:', error);
      alert('Gagal buat task. Pastikan token valid.');
    }
  };

  // --- FUNGSI BARU ---
  const handleDeleteTask = async (taskId: string) => {
    if (confirm('Yakin mau hapus task ini? (Hanya Admin)')) {
      try {
        await deleteTask({ variables: { id: taskId } });
      } catch (err: any) {
        console.error('Error deleting task:', err);
        alert(err.message); // Akan muncul error 'Unauthorized' jika user biasa
      }
    }
  };
  // -------------------


  // --- TAMPILAN KALO BELUM LOGIN (SUDAH DIMODIFIKASI) ---
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded shadow-md w-96">
          
          {/* --- JUDUL BERGANTI --- */}
          <h1 className="text-2xl font-bold mb-6 text-center">
            {isRegistering ? 'Register Akun Baru' : 'Login UTS'}
          </h1>

          {/* --- FORM BERGANTI --- */}
          <form onSubmit={isRegistering ? handleRegister : handleLogin} className="space-y-4">
            
            {/* Field Nama (hanya muncul saat register) */}
            {isRegistering && (
              <input
                className="w-full border p-2 rounded"
                type="text"
                placeholder="Nama Lengkap"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            )}

            <input
              className="w-full border p-2 rounded"
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
            <input
              className="w-full border p-2 rounded"
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />

            {/* Tombol BERGANTI */}
            <button className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600">
              {isRegistering ? 'Register' : 'Login (Dapat Token)'}
            </button>
          </form>

          {/* --- TOMBOL TOGGLE --- */}
          <div className="text-center mt-4">
            <button 
              onClick={() => setIsRegistering(!isRegistering)} 
              className="text-sm text-blue-500 hover:underline"
            >
              {isRegistering ? 'Sudah punya akun? Login' : 'Belum punya akun? Register'}
            </button>
          </div>

        </div>
      </div>
    );
  }

  // --- TAMPILAN KALO SUDAH LOGIN (TASK MANAGER) ---
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* HEADER DASHBOARD (DIMODIFIKASI) */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Task Manager UTS 🚀</h1>
          <div>
            {user && (
              <span className="bg-gray-200 text-gray-800 px-3 py-2 rounded-full font-semibold mr-4">
                Role: {user.role}
              </span>
            )}
            <button onClick={handleLogout} className="bg-red-500 text-white px-4 py-2 rounded">
              Logout
            </button>
          </div>
        </div>

        {/* Form Tambah Task */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h2 className="text-xl font-semibold mb-4">Create New Task</h2>
          <form onSubmit={handleCreateTask} className="flex gap-4">
            <input
              type="text"
              placeholder="Task title..."
              className="flex-1 border p-2 rounded"
              value={newTaskTitle}
              onChange={e => setNewTaskTitle(e.target.value)}
            />
            <button type="submit" className="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600">
              Add Task
            </button>
          </form>
        </div>

        {/* Daftar Task (DIMODIFIKASI) */}
        <div className="grid gap-4">
          {loading ? (
            <p>Loading tasks...</p>
          ) : (
            taskData?.tasks.map((task: any) => (
              <div key={task.id} className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-lg">{task.title}</h3>
                  <p className="text-sm text-gray-500">Status: {task.status} • Team: {task.teamId}</p>
                </div>
                
                {/* --- LOGIKA MENAMPILKAN TOMBOL DELETE --- */}
                {user?.role === 'admin' ? (
                  // Tampilan untuk Admin
                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 text-sm"
                  >
                    Delete
                  </button>
                ) : (
                  // Tampilan untuk User biasa
                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                    {task.status}
                  </span>
                )}
                {/* ------------------------------------- */}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}