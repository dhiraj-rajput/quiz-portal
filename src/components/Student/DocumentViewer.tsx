import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  FileText, 
  Download, 
  ArrowLeft, 
  Eye,
  AlertCircle,
  File,
  Image,
  Video,
  FileImage
} from 'lucide-react';
import { studentAPI } from '../../utils/api';
import { API_BASE_URL } from '../../utils/config';

interface ModuleFile {
  _id: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
}

interface Module {
  _id: string;
  title: string;
  description: string;
  files: ModuleFile[];
  createdAt: string;
}

const DocumentViewer: React.FC = () => {
  const { moduleId } = useParams<{ moduleId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [module, setModule] = useState<Module | null>(null);
  const [selectedFile, setSelectedFile] = useState<ModuleFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Only load module details if authentication is complete and user is authenticated
    if (!authLoading && user && moduleId) {
      // Add a small delay to ensure auth context is fully initialized
      const timeoutId = setTimeout(() => {
        loadModuleDetails();
      }, 100);
      return () => clearTimeout(timeoutId);
    } else if (!authLoading && !user) {
      setError('Authentication required. Please log in again.');
      setLoading(false);
    } else if (!moduleId) {
      setError('Module ID is required');
      setLoading(false);
    }
  }, [moduleId, user, authLoading]);

  const loadModuleDetails = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Get assigned modules and find the specific one
      const response = await studentAPI.getAssignedModules(1, 100);
      
      if (response.success && response.data) {
        const assignment = response.data.modules?.find((a: any) => a.moduleId?._id === moduleId);
        
        if (assignment && assignment.moduleId) {
          setModule(assignment.moduleId);
          // Auto-select first file if available
          if (assignment.moduleId.files && assignment.moduleId.files.length > 0) {
            setSelectedFile(assignment.moduleId.files[0]);
          }
        } else {
          setError('Module not found or not assigned to you');
        }
      } else {
        setError(`Failed to load module details: ${response.message || 'Unknown error'}`);
      }
    } catch (err: any) {
      
      // Check if it's an authentication error
      if (err.status === 401 || err.message?.includes('Authentication')) {
        setError('Session expired. Please log in again.');
        // Optionally redirect to login
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      } else {
        setError(`Failed to load module details: ${err.message || 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const getFileIcon = (file: any) => {
    // Try to get mimeType or fileType, with fallbacks
    const mimeType = file?.mimeType || file?.fileType || '';
    const fileName = file?.originalName || file?.fileName || '';
    
    if (!mimeType && fileName) {
      // Fallback: determine type from file extension
      const extension = fileName.toLowerCase().split('.').pop();
      switch (extension) {
        case 'pdf':
          return <FileText className="h-5 w-5" />;
        case 'jpg':
        case 'jpeg':
        case 'png':
        case 'gif':
        case 'webp':
          return <Image className="h-5 w-5" />;
        case 'mp4':
        case 'avi':
        case 'mov':
        case 'wmv':
          return <Video className="h-5 w-5" />;
        case 'doc':
        case 'docx':
          return <FileText className="h-5 w-5" />;
        case 'ppt':
        case 'pptx':
          return <FileImage className="h-5 w-5" />;
        default:
          return <File className="h-5 w-5" />;
      }
    }
    
    if (!mimeType) return <File className="h-5 w-5" />;
    if (mimeType.startsWith('image/')) return <Image className="h-5 w-5" />;
    if (mimeType.startsWith('video/')) return <Video className="h-5 w-5" />;
    if (mimeType.includes('pdf')) return <FileText className="h-5 w-5" />;
    if (mimeType.includes('document') || mimeType.includes('word') || mimeType.includes('msword')) return <FileText className="h-5 w-5" />;
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return <FileImage className="h-5 w-5" />;
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return <FileText className="h-5 w-5" />;
    return <File className="h-5 w-5" />;
  };

  const getFileUrl = (moduleId: string, fileName: string) => {
    // Remove /api if it's already in the baseUrl to avoid duplication
    const cleanBaseUrl = API_BASE_URL.endsWith('/api') ? API_BASE_URL : `${API_BASE_URL}/api`;
    
    // Add token as query parameter for iframe access
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
    const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';
    
    return `${cleanBaseUrl}/files/modules/${moduleId}/${encodeURIComponent(fileName)}${tokenParam}`;
  };

  const getDownloadUrl = (moduleId: string, fileName: string) => {
    const cleanBaseUrl = API_BASE_URL.endsWith('/api') ? API_BASE_URL : `${API_BASE_URL}/api`;
    
    // Add token as query parameter for direct download access
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
    const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';
    
    return `${cleanBaseUrl}/files/modules/${moduleId}/${encodeURIComponent(fileName)}/download${tokenParam}`;
  };

  const handleFileSelect = (file: ModuleFile) => {
    setSelectedFile(file);
  };

  const handleDownload = (file: ModuleFile) => {
    if (!module) return;
    
    const downloadUrl = getDownloadUrl(module._id, file.fileName);
    
    // Open in new tab instead of forcing download
    window.open(downloadUrl, '_blank');
  };

  const renderFileViewer = () => {
    if (!selectedFile || !module) return null;

    const fileUrl = getFileUrl(module._id, selectedFile.fileName);
    
    // Get file type with fallbacks (same logic as getFileIcon)
    const mimeType = selectedFile.mimeType || (selectedFile as any).fileType || '';
    const fileName = selectedFile.originalName || selectedFile.fileName || '';
    
    // Determine file type from extension if mimeType/fileType is not available
    const getFileTypeFromExtension = (filename: string) => {
      const extension = filename.toLowerCase().split('.').pop();
      switch (extension) {
        case 'pdf': return 'application/pdf';
        case 'jpg':
        case 'jpeg':
        case 'png':
        case 'gif':
        case 'webp': return 'image/*';
        case 'mp4':
        case 'avi':
        case 'mov':
        case 'wmv': return 'video/*';
        case 'doc': return 'application/msword';
        case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        case 'ppt': return 'application/vnd.ms-powerpoint';
        case 'pptx': return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
        case 'xls': return 'application/vnd.ms-excel';
        case 'xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        case 'txt': return 'text/plain';
        default: return 'application/octet-stream';
      }
    };
    
    const effectiveType = mimeType || getFileTypeFromExtension(fileName);
    
    
    // For PDFs
    if (effectiveType === 'application/pdf' || effectiveType === 'pdf') {
      return (
        <div className="h-full w-full">
          <div className="h-full w-full flex flex-col">
            {/* PDF Viewer with object tag (better browser support) */}
            <div className="flex-1 relative">
              <object
                data={fileUrl}
                type="application/pdf"
                className="w-full h-full"
                title={selectedFile.originalName}
              >
                {/* Fallback content if object tag fails */}
                <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-800">
                  <div className="text-center">
                    <File className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      PDF Preview Not Available
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      Your browser doesn't support inline PDF viewing.
                    </p>
                    <button
                      onClick={() => window.open(fileUrl, '_blank')}
                      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
                    >
                      Open PDF
                    </button>
                  </div>
                </div>
              </object>
            </div>
          </div>
        </div>
      );
    }

    // For images
    if (effectiveType.startsWith('image/') || effectiveType === 'image/*') {
      return (
        <div className="h-full w-full flex items-center justify-center bg-gray-50 dark:bg-gray-800">
          <img
            src={fileUrl}
            alt={selectedFile.originalName}
            className="max-w-full max-h-full object-contain"
          />
        </div>
      );
    }

    // For videos
    if (effectiveType.startsWith('video/') || effectiveType === 'video/*') {
      return (
        <div className="h-full w-full flex items-center justify-center bg-gray-50 dark:bg-gray-800">
          <video
            src={fileUrl}
            controls
            className="max-w-full max-h-full"
          >
            Your browser does not support the video tag.
          </video>
        </div>
      );
    }

    // For Office documents, use Google Docs Viewer
    if (
      effectiveType.includes('document') ||
      effectiveType.includes('word') ||
      effectiveType.includes('presentation') ||
      effectiveType.includes('powerpoint') ||
      effectiveType.includes('sheet') ||
      effectiveType.includes('excel') ||
      effectiveType === 'application/msword' ||
      effectiveType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      effectiveType === 'application/vnd.ms-powerpoint' ||
      effectiveType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
      effectiveType === 'application/vnd.ms-excel' ||
      effectiveType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      effectiveType === 'application/document' ||
      effectiveType === 'application/presentation'
    ) {
      const googleViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`;
      return (
        <div className="h-full w-full">
          <iframe
            src={googleViewerUrl}
            className="w-full h-full border-0"
            title={selectedFile.originalName}
            onError={() => {
              // Handle Google Docs Viewer error silently
            }}
          />
          {/* Fallback message for Office documents */}
          <div className="absolute bottom-4 right-4">
            <div className="bg-blue-600 text-white px-3 py-1 rounded text-xs">
              Office Document
            </div>
          </div>
        </div>
      );
    }

    // For text files
    if (effectiveType.startsWith('text/')) {
      return (
        <div className="h-full w-full p-4 bg-white dark:bg-gray-800 overflow-auto">
          <iframe
            src={fileUrl}
            className="w-full h-full border-0"
            title={selectedFile.originalName}
          />
        </div>
      );
    }

    // Fallback for unsupported files
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-50 dark:bg-gray-800">
        <div className="text-center">
          <File className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Preview not available
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            This file type cannot be previewed in the browser.
          </p>
          <button
            onClick={() => handleDownload(selectedFile)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Download className="h-4 w-4 mr-2" />
            Download to view
          </button>
        </div>
      </div>
    );
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading module...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Error</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <div className="space-x-3">
            <button
              onClick={() => {
                setError('');
                setLoading(true);
                loadModuleDetails();
              }}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              Retry
            </button>
            <button
              onClick={() => navigate('/student/modules')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Back to Modules
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!module) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Module not found</h2>
          <button
            onClick={() => navigate('/student/modules')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Back to Modules
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-full px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/student/modules')}
                className="flex items-center px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Modules
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {module.title}
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {module.files?.length || 0} file(s) available
                </p>
              </div>
            </div>
            
            {selectedFile && (
              <button
                onClick={() => handleDownload(selectedFile)}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Sidebar - File List */}
        <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
          <div className="p-3">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
              Files
            </h2>
            
            {module.description && (
              <div className="mb-4 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs text-blue-800 dark:text-blue-300">
                {module.description}
              </div>
            )}

            <div className="space-y-1">
              {module.files && module.files.length > 0 ? (
                module.files.map((file) => (
                  <button
                    key={file._id}
                    onClick={() => handleFileSelect(file)}
                    className={`w-full p-2 rounded border text-left transition ${
                      selectedFile?._id === file._id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    <div className="flex items-start space-x-2">
                      <div className="flex-shrink-0 pt-0.5">
                        {getFileIcon(file)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                          {file.originalName}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">No files available</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content - File Viewer */}
        <div className="flex-1 bg-gray-100 dark:bg-gray-900">
          {selectedFile ? (
            <div className="h-full">
              {/* File Header */}
              <div className="bg-white dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getFileIcon(selectedFile.mimeType)}
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                        {selectedFile.originalName}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatFileSize(selectedFile.size)} • {selectedFile.mimeType}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* File Content */}
              <div className="h-[calc(100%-60px)]">
                {renderFileViewer()}
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Eye className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Select a file to preview
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Choose a file from the sidebar to view its contents
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentViewer;
