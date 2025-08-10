import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Edit, Trash2, Upload, Download, Users, Search } from 'lucide-react';
import { moduleAPI } from '../../utils/api';

interface Module {
  _id: string;
  title: string;
  description: string;
  files: Array<{
    _id: string;
    fileName: string;
    originalName: string;
    fileType: string;
    fileSize: number;
  }>;
  createdBy: {
    firstName: string;
    lastName: string;
  };
  createdAt: string;
}

const ModuleManagement: React.FC = () => {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [newModule, setNewModule] = useState({
    title: '',
    description: '',
    files: [] as File[]
  });
  const [editModule, setEditModule] = useState({
    title: '',
    description: '',
    files: [] as File[]
  });

  useEffect(() => {
    loadModules();
  }, []);

  // Search effect with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadModules(searchTerm);
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const loadModules = async (search = '') => {
    try {
      setLoading(true);
      const response = await moduleAPI.getModules(1, 100, search);
      if (response.success && response.data) {
        setModules(response.data.modules);
      }
    } catch (error) {
      console.error('Error loading modules:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('title', newModule.title);
      formData.append('description', newModule.description);
      
      newModule.files.forEach((file) => {
        formData.append('files', file);
      });

      await moduleAPI.createModule(formData);
      setShowCreateModal(false);
      setNewModule({ title: '', description: '', files: [] });
      await loadModules();
    } catch (error) {
      console.error('Error creating module:', error);
    }
  };

  const handleEditModule = (module: Module) => {
    setEditingModule(module);
    setEditModule({
      title: module.title,
      description: module.description,
      files: []
    });
    setShowEditModal(true);
  };

  const handleUpdateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingModule) return;
    
    try {
      const formData = new FormData();
      formData.append('title', editModule.title);
      formData.append('description', editModule.description);
      
      editModule.files.forEach((file) => {
        formData.append('files', file);
      });

      await moduleAPI.updateModule(editingModule._id, formData);
      setShowEditModal(false);
      setEditingModule(null);
      setEditModule({ title: '', description: '', files: [] });
      await loadModules();
    } catch (error) {
      console.error('Error updating module:', error);
    }
  };

  const handleDeleteModule = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this module?')) {
      try {
        await moduleAPI.deleteModule(id);
        await loadModules();
      } catch (error) {
        console.error('Error deleting module:', error);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setNewModule({
        ...newModule,
        files: Array.from(e.target.files)
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Remove filtered modules logic since we're using server-side search

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading modules...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Module Management</h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Create and manage learning modules with file attachments
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Module
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 sm:px-0 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search modules..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Modules Grid */}
        <div className="px-4 sm:px-0">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map((module) => (
              <div key={module._id} className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <BookOpen className="h-8 w-8 text-indigo-600" />
                      <div className="ml-3">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">{module.title}</h3>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => handleEditModule(module)}
                        className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      <button 
                        onClick={() => handleDeleteModule(module._id)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <p className="text-sm text-gray-600 dark:text-gray-300">{module.description}</p>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                      <Users className="h-4 w-4 mr-1" />
                      Created by {module.createdBy.firstName} {module.createdBy.lastName}
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {new Date(module.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  {module.files.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                        Files ({module.files.length})
                      </h4>
                      <div className="space-y-2">
                        {module.files.map((file) => (
                          <div key={file._id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                            <div className="flex items-center">
                              <Upload className="h-4 w-4 text-gray-400 mr-2" />
                              <div>
                                <p className="text-sm text-gray-900 dark:text-white">{file.originalName}</p>
                                <p className="text-xs text-gray-500">{formatFileSize(file.fileSize)}</p>
                              </div>
                            </div>
                            <button className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400">
                              <Download className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {modules.length === 0 && (
            <div className="text-center py-12">
              <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No modules found</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Get started by creating a new module.
              </p>
              <div className="mt-6">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Module
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Module Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Create New Module</h3>
              <form onSubmit={handleCreateModule}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Title
                    </label>
                    <input
                      type="text"
                      required
                      value={newModule.title}
                      onChange={(e) => setNewModule({...newModule, title: e.target.value})}
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-indigo-500 focus:ring-indigo-500"
                      placeholder="Enter module title"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Description
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={newModule.description}
                      onChange={(e) => setNewModule({...newModule, description: e.target.value})}
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-indigo-500 focus:ring-indigo-500"
                      placeholder="Enter module description"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Files
                    </label>
                    <input
                      type="file"
                      multiple
                      onChange={handleFileChange}
                      className="mt-1 block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.xls,.xlsx,.mp4,.mp3"
                    />
                    {newModule.files.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm text-gray-600 dark:text-gray-400">Selected files:</p>
                        <ul className="text-sm text-gray-500 dark:text-gray-400">
                          {newModule.files.map((file, index) => (
                            <li key={index}>• {file.name}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500 rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md"
                  >
                    Create Module
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingModule && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Edit Module
              </h3>
              <form onSubmit={handleUpdateModule}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Title
                    </label>
                    <input
                      type="text"
                      required
                      value={editModule.title}
                      onChange={(e) => setEditModule({...editModule, title: e.target.value})}
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-indigo-500 focus:ring-indigo-500"
                      placeholder="Enter module title"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Description
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={editModule.description}
                      onChange={(e) => setEditModule({...editModule, description: e.target.value})}
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-indigo-500 focus:ring-indigo-500"
                      placeholder="Enter module description"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Add New Files (Optional)
                    </label>
                    <input
                      type="file"
                      multiple
                      onChange={(e) => {
                        if (e.target.files) {
                          setEditModule({
                            ...editModule,
                            files: Array.from(e.target.files)
                          });
                        }
                      }}
                      className="mt-1 block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.xls,.xlsx,.mp4,.mp3"
                    />
                    {editModule.files.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm text-gray-600 dark:text-gray-400">New files to upload:</p>
                        <ul className="text-xs text-gray-500 dark:text-gray-400">
                          {editModule.files.map((file, index) => (
                            <li key={index}>
                              {file.name} ({formatFileSize(file.size)})
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingModule(null);
                      setEditModule({ title: '', description: '', files: [] });
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500 rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md"
                  >
                    Update Module
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModuleManagement;
