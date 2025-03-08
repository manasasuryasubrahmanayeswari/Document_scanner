// dashboard.js - Enhanced with loading states and UI improvements
document.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('user'));

    if (!user) {
        window.location.href = 'index.html';
        return;
    }

    // Show skeleton loaders
    toggleSkeletons(true);

    // Initialize dashboard
    document.getElementById('dashboardUsername').innerText = user.username;
    
    // Initialize all data
    Promise.all([
        updateCredits(),
        updateDocumentsList(),
        loadActivityLog()
    ]).then(() => {
        // Hide skeleton loaders and show content when all data is loaded
        toggleSkeletons(false);
    }).catch(error => {
        console.error('Failed to initialize dashboard:', error);
        showToast('Failed to load dashboard data. Please refresh.', 'error');
        toggleSkeletons(false);
    });
    
    // Set up event listeners
    setupEventListeners();
});

function toggleSkeletons(show) {
    // Toggle all skeleton loaders
    const skeletons = [
        'userProfileSkeleton', 'creditFormSkeleton', 'activityLogSkeleton', 
        'uploadSectionSkeleton', 'documentsListSkeleton'
    ];
    
    const contents = [
        'userProfileContent', 'creditFormContent', 'activityLogContent', 
        'uploadSectionContent', 'documentsListContent'
    ];
    
    skeletons.forEach(id => {
        document.getElementById(id).classList.toggle('hidden', !show);
    });
    
    contents.forEach(id => {
        document.getElementById(id).classList.toggle('hidden', show);
    });
}

function setupEventListeners() {
    // Credit Request Form
    document.getElementById('creditRequestForm').addEventListener('submit', handleCreditRequest);
    
    // Document Upload Form
    document.getElementById('uploadForm').addEventListener('submit', handleDocumentUpload);
    
    // Export Activity Log
    document.getElementById('exportActivityBtn').addEventListener('click', exportActivityLog);
    
    // Logout Button
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    
    // File input change event for visual feedback
    document.getElementById('documentFile').addEventListener('change', () => {
        const fileName = document.getElementById('documentFile').value;
        if (fileName) {
            document.getElementById('uploadError').classList.add('hidden');
        }
    });
}

// Toast Notification System
function showToast(message, type = 'info', duration = 4000) {
    const toastContainer = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    
    // Toast style based on type
    let bgColor, iconPath;
    switch(type) {
        case 'success':
            bgColor = 'bg-green-500';
            iconPath = '<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />';
            break;
        case 'error':
            bgColor = 'bg-red-500';
            iconPath = '<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />';
            break;
        case 'warning':
            bgColor = 'bg-yellow-500';
            iconPath = '<path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />';
            break;
        default:
            bgColor = 'bg-blue-500';
            iconPath = '<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />';
    }
    
    toast.className = `${bgColor} text-white p-4 rounded-lg shadow-lg mb-3 flex items-start transform translate-x-full transition-transform duration-300 ease-out`;
    toast.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
            ${iconPath}
        </svg>
        <div class="flex-grow">${message}</div>
        <button class="ml-2 text-white focus:outline-none">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
        </button>
    `;
    
    // Add to container
    toastContainer.appendChild(toast);
    
    // Animation
    setTimeout(() => {
        toast.classList.remove('translate-x-full');
    }, 10);
    
    // Close button functionality
    const closeBtn = toast.querySelector('button');
    closeBtn.addEventListener('click', () => {
        toast.classList.add('translate-x-full');
        setTimeout(() => {
            toastContainer.removeChild(toast);
        }, 300);
    });
    
    // Auto-remove
    setTimeout(() => {
        if (toastContainer.contains(toast)) {
            toast.classList.add('translate-x-full');
            setTimeout(() => {
                if (toastContainer.contains(toast)) {
                    toastContainer.removeChild(toast);
                }
            }, 300);
        }
    }, duration);
}

// Credit Management
async function updateCredits() {
    try {
        const response = await fetch('http://localhost:5000/credits', {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch credits');
        }
        
        const data = await response.json();
        document.getElementById('userCredits').textContent = data.credits;
        return data;
    } catch (error) {
        console.error('Failed to fetch credits:', error);
        showToast('Failed to fetch credits', 'error');
        throw error;
    }
}

async function handleCreditRequest(e) {
    e.preventDefault();
    const amount = document.getElementById('creditAmount').value;
    const submitBtn = document.getElementById('creditSubmitBtn');
    const spinner = document.getElementById('creditRequestSpinner');
    const successMsg = document.getElementById('creditRequestSuccess');
    
    // Show loading state
    submitBtn.disabled = true;
    spinner.classList.remove('hidden');
    successMsg.classList.add('hidden');
    
    try {
        const response = await fetch('http://localhost:5000/credits/request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ amount: parseInt(amount) })
        });

        const data = await response.json();
        if (response.ok) {
            document.getElementById('creditAmount').value = '';
            successMsg.classList.remove('hidden');
            showToast('Credit request submitted successfully!', 'success');
            loadActivityLog(); // Refresh activity log
            updateCredits(); // Refresh credits
            
            // Hide success message after 3 seconds
            setTimeout(() => {
                successMsg.classList.add('hidden');
            }, 3000);
        } else {
            showToast(data.error || 'Failed to submit credit request', 'error');
        }
    } catch (error) {
        console.error('Failed to request credits:', error);
        showToast('Failed to submit credit request', 'error');
    } finally {
        // Reset UI
        submitBtn.disabled = false;
        spinner.classList.add('hidden');
    }
}

// Document Management
async function handleDocumentUpload(e) {
    e.preventDefault();
    const fileInput = document.getElementById('documentFile');
    const errorElement = document.getElementById('uploadError');
    const similarDocumentsSection = document.getElementById('similarDocumentsSection');
    const uploadButton = document.getElementById('uploadBtn');
    const uploadSpinner = document.getElementById('uploadSpinner');
    
    if (!fileInput.files[0]) {
        errorElement.textContent = 'Please select a file';
        errorElement.classList.remove('hidden');
        return;
    }

    // Show loading state
    uploadButton.disabled = true;
    uploadSpinner.classList.remove('hidden');
    errorElement.classList.add('hidden');

    const formData = new FormData();
    formData.append('document', fileInput.files[0]);

    try {
        const response = await fetch('http://localhost:5000/upload', {
            method: 'POST',
            credentials: 'include',
            body: formData
        });

        const data = await response.json();
        
        if (response.ok) {
            fileInput.value = '';
            showToast('Document uploaded successfully!', 'success');
            
            // Handle similar documents
            if (data.similarDocuments && data.similarDocuments.length > 0) {
                const similarDocumentsList = document.getElementById('similarDocumentsList');
                similarDocumentsList.innerHTML = data.similarDocuments
                    .map(doc => `
                        <div class="flex justify-between items-center p-3 bg-gray-50 rounded-md mb-2 hover:bg-gray-100 transition">
                            <div>
                                <span class="font-medium">${doc.filename}</span>
                                <span class="text-sm text-blue-500 ml-2">
                                    ${doc.similarity}% similar
                                </span>
                            </div>
                            <button 
                                onclick="viewDocument(${doc.id})"
                                class="text-blue-500 hover:text-blue-700 px-3 py-1 border border-blue-500 rounded transition"
                            >
                                View
                            </button>
                        </div>
                    `)
                    .join('');
                
                similarDocumentsSection.classList.remove('hidden');
            } else {
                similarDocumentsSection.classList.add('hidden');
            }

            // Update other sections
            updateDocumentsList();
            updateCredits();
            loadActivityLog();
        } else {
            errorElement.textContent = data.error;
            errorElement.classList.remove('hidden');
            showToast(data.error || 'Upload failed', 'error');
        }
    } catch (error) {
        errorElement.textContent = 'Upload failed. Please try again.';
        errorElement.classList.remove('hidden');
        console.error('Upload error:', error);
        showToast('Upload failed. Please try again.', 'error');
    } finally {
        // Reset UI
        uploadButton.disabled = false;
        uploadSpinner.classList.add('hidden');
    }
}

async function updateDocumentsList() {
    // Show skeleton loader
    document.getElementById('documentsListContent').classList.add('hidden');
    document.getElementById('documentsListSkeleton').classList.remove('hidden');
    
    try {
        const response = await fetch('http://localhost:5000/documents', {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch documents');
        }
        
        const data = await response.json();
        const documentsList = document.getElementById('documentsList');
        
        if (data.documents.length === 0) {
            documentsList.innerHTML = '<p class="text-gray-500 p-4">No documents uploaded yet.</p>';
        } else {
            documentsList.innerHTML = data.documents.map(doc => `
                <div class="flex justify-between items-center p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition mb-2">
                    <div class="flex items-center">
                        <div class="bg-blue-100 p-2 rounded-md mr-3">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd" />
                            </svg>
                        </div>
                        <div>
                            <span class="font-medium">${doc.filename}</span>
                            <div class="text-sm text-gray-500">
                                <span>${new Date(doc.upload_date).toLocaleDateString()}</span>
                                ${doc.size ? `<span class="ml-2">${formatFileSize(doc.size)}</span>` : ''}
                            </div>
                        </div>
                    </div>
                    <div class="flex">
                        <button 
                            onclick="viewDocument(${doc.id})"
                            class="text-blue-500 hover:text-blue-700 mr-3"
                            title="View Document"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd" />
                            </svg>
                        </button>
                        <button 
                            onclick="downloadDocument(${doc.id})"
                            class="text-green-500 hover:text-green-700"
                            title="Download Document"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd" />
                            </svg>
                        </button>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Failed to fetch documents:', error);
        document.getElementById('documentsList').innerHTML = 
            '<p class="text-red-500 p-4">Failed to load documents. Please try again.</p>';
        showToast('Failed to load documents list', 'error');
    } finally {
        // Hide skeleton loader and show content
        document.getElementById('documentsListContent').classList.remove('hidden');
        document.getElementById('documentsListSkeleton').classList.add('hidden');
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function viewDocument(documentId) {
    try {
        window.open(`view.html?id=${documentId}`, '_blank');
    } catch (error) {
        console.error('Failed to view document:', error);
        showToast('Failed to view document', 'error');
    }
}

async function downloadDocument(documentId) {
    try {
        showToast('Downloading document...', 'info');
        window.location.href = `http://localhost:5000/documents/${documentId}/download`;
    } catch (error) {
        console.error('Failed to download document:', error);
        showToast('Failed to download document', 'error');
    }
}

// Activity Log Management
async function loadActivityLog() {
    // Show skeleton loader
    document.getElementById('activityLogContent').classList.add('hidden');
    document.getElementById('activityLogSkeleton').classList.remove('hidden');
    
    try {
        const response = await fetch('http://localhost:5000/user/activity', {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch activity logs');
        }
        
        const data = await response.json();
        const activityLog = document.getElementById('activityLog');
        
        if (data.logs.length === 0) {
            activityLog.innerHTML = '<p class="text-gray-500 p-4">No activity recorded yet.</p>';
        } else {
            activityLog.innerHTML = data.logs.map(log => {
                // Determine icon based on action_type
                let iconPath = '';
                let bgColor = 'bg-gray-100';
                
                if (log.action_type.includes('upload')) {
                    iconPath = '<path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clip-rule="evenodd" />';
                    bgColor = 'bg-blue-100';
                } else if (log.action_type.includes('download')) {
                    iconPath = '<path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd" />';
                    bgColor = 'bg-green-100';
                } else if (log.action_type.includes('credit')) {
                    iconPath = '<path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" /><path fill-rule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clip-rule="evenodd" />';
                    bgColor = 'bg-yellow-100';
                } else if (log.action_type.includes('login') || log.action_type.includes('logout')) {
                    iconPath = '<path fill-rule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v-1l1-1 1-1 .757-.757A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z" clip-rule="evenodd" />';
                    bgColor = 'bg-purple-100';
                }
                
                return `
                    <div class="p-3 border-b last:border-b-0 flex items-start">
                        <div class="${bgColor} p-2 rounded-full mr-3">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                                ${iconPath || '<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />'}
                            </svg>
                        </div>
                        <div class="flex-grow">
                            <p class="text-sm font-medium">${log.action_type}</p>
                            <p class="text-xs text-gray-600">${log.details}</p>
                            <p class="text-xs text-gray-400 mt-1">${new Date(log.timestamp).toLocaleString()}</p>
                        </div>
                    </div>
                `;
            }).join('');
        }
    } catch (error) {
        console.error('Failed to load activity log:', error);
        document.getElementById('activityLog').innerHTML = 
            '<p class="text-red-500 p-4">Failed to load activity log. Please try again.</p>';
        showToast('Failed to load activity log', 'error');
    } finally {
        // Hide skeleton loader and show content
        document.getElementById('activityLogContent').classList.remove('hidden');
        document.getElementById('activityLogSkeleton').classList.add('hidden');
    }
}

async function exportActivityLog() {
    const exportBtn = document.getElementById('exportActivityBtn');
    const exportSpinner = document.getElementById('exportSpinner');
    
    // Show loading state
    exportBtn.disabled = true;
    if (exportSpinner) {
        exportSpinner.classList.remove('hidden');
    }
    
    try {
        showToast('Preparing activity log export...', 'info');
        window.location.href = 'http://localhost:5000/user/activity/export';
    } catch (error) {
        console.error('Failed to export activity log:', error);
        showToast('Failed to export activity log', 'error');
    } finally {
        // Reset UI after a delay (since we're navigating away)
        setTimeout(() => {
            exportBtn.disabled = false;
            if (exportSpinner) {
                exportSpinner.classList.add('hidden');
            }
        }, 1000);
    }
}

// Session Management
async function handleLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    
    // Check if spinner exists, if not, we'll handle differently
    const logoutSpinner = document.getElementById('logoutSpinner');
    
    // Show loading state
    logoutBtn.disabled = true;
    
    // Only manipulate spinner if it exists
    if (logoutSpinner) {
        logoutSpinner.classList.remove('hidden');
    } else {
        // As a fallback, change button text to indicate loading
        logoutBtn.innerHTML = '<svg class="animate-spin h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Logging out...';
    }
    
    try {
        const response = await fetch('http://localhost:5000/logout', {
            method: 'POST',
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Logout failed');
        }
        
        localStorage.removeItem('user');
        showToast('Logging out...', 'info');
        
        // Small delay for UI feedback
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 500);
    } catch (error) {
        console.error('Failed to logout:', error);
        showToast('Failed to logout. Please try again.', 'error');
        
        // Reset UI
        logoutBtn.disabled = false;
        if (logoutSpinner) {
            logoutSpinner.classList.add('hidden');
        } else {
            // Reset button text if we used the fallback
            logoutBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V9.5a1 1 0 10-2 0V15H4V5h10.5a1 1 0 100-2H3z" clip-rule="evenodd" /><path d="M19 10a1 1 0 00-1-1h-6.5a1 1 0 100 2H16v2.5a1 1 0 102 0V10z" /></svg> Logout';
        }
    }
}