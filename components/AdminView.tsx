import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Settings, Users, History, Star } from 'lucide-react';
import { AdminModels } from './admin/AdminModels';
import { AdminUsers } from './admin/AdminUsers';
import { AdminHistory } from './admin/AdminHistory';

type AdminTab = 'models' | 'users' | 'history';

export const AdminView: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AdminTab>('models');

  const tabs = [
    { id: 'models' as const, label: 'Modelos AI', icon: Settings },
    { id: 'users' as const, label: 'Usuarios', icon: Users },
    { id: 'history' as const, label: 'Historial', icon: History },
  ];

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-pink-50 via-white to-rose-50 text-gray-800">
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-pink-200/30 rounded-full blur-[150px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-rose-200/20 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 px-4 py-2 bg-white/80 hover:bg-white border border-pink-200 rounded-xl text-gray-600 hover:text-pink-600 transition-all shadow-sm"
            >
              <Home className="w-4 h-4" />
              <span className="text-sm font-medium">Dashboard</span>
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-rose-500 rounded-xl flex items-center justify-center">
                <Settings className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Panel de Administración</h1>
                <p className="text-sm text-gray-500">Configuración y gestión del sistema</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mb-6 border-b border-pink-100 pb-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-500/25'
                    : 'bg-white/60 text-gray-600 hover:bg-white hover:text-pink-600'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-pink-100 shadow-lg shadow-pink-100/30 p-6">
          {activeTab === 'models' && <AdminModels />}
          {activeTab === 'users' && <AdminUsers />}
          {activeTab === 'history' && <AdminHistory />}
        </div>
      </div>
    </div>
  );
};
