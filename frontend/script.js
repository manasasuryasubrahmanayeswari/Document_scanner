document.addEventListener("DOMContentLoaded", () => {
    const user = JSON.parse(localStorage.getItem("user"));

    // Redirect if user is not logged in
    if (window.location.pathname.includes("dashboard.html")) {
        if (!user) {
            window.location.href = "index.html";
        } else {
            document.getElementById("dashboardUsername").innerText = user.username;
        }
    }
});

// Handle Login
document.getElementById("loginForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("loginUsername").value;
    const password = document.getElementById("loginPassword").value;

    const response = await fetch("http://localhost:5000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password })
    });

    const data = await response.json();
    if (response.ok) {
        localStorage.setItem("user", JSON.stringify(data.user));
        // Redirect based on role
        if (data.user.role === "admin") {
            window.location.href = "admindashboard.html";
        } else {
            window.location.href = "dashboard.html";
        }
    } else {
        document.getElementById("loginError").textContent = data.error;
        document.getElementById("loginError").classList.remove("hidden");
    }
});

// Handle Registration
document.getElementById("registerForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("registerUsername").value;
    const email = document.getElementById("registerEmail").value;
    const password = document.getElementById("registerPassword").value;

    const response = await fetch("http://localhost:5000/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password })
    });

    const data = await response.json();
    if (response.ok) {
        alert("Registration successful! Redirecting to login...");
        window.location.href = "index.html";
    } else {
        document.getElementById("registerError").textContent = data.error;
        document.getElementById("registerError").classList.remove("hidden");
    }
});

// Handle Logout
document.getElementById("logoutBtn")?.addEventListener("click", async () => {
    await fetch("http://localhost:5000/logout", { method: "POST", credentials: "include" });
    localStorage.removeItem("user");
    window.location.href = "index.html";
});

// Fetch and display user credits
async function updateCredits() {
    try {
        const response = await fetch('http://localhost:5000/credits', {
            credentials: 'include'
        });
        const data = await response.json();
        document.getElementById('userCredits').textContent = data.credits;
    } catch (error) {
        console.error('Failed to fetch credits:', error);
    }
}

// Fetch and display user's documents
async function updateDocumentsList() {
    try {
        const response = await fetch('http://localhost:5000/documents', {
            credentials: 'include'
        });
        const data = await response.json();
        const documentsList = document.getElementById('documentsList');
        
        if (data.documents.length === 0) {
            documentsList.innerHTML = '<p class="text-gray-500">No documents uploaded yet.</p>';
            return;
        }

        documentsList.innerHTML = data.documents.map(doc => `
            <div class="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                <div>
                    <span class="font-medium">${doc.filename}</span>
                    <span class="text-sm text-gray-500 ml-2">
                        ${new Date(doc.upload_date).toLocaleDateString()}
                    </span>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Failed to fetch documents:', error);
    }
}

// Handle document upload
document.getElementById('uploadForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fileInput = document.getElementById('documentFile');
    const errorElement = document.getElementById('uploadError');
    const uploadButton = e.target.querySelector('button[type="submit"]');
    const originalButtonText = uploadButton.innerHTML;
    
    if (!fileInput.files[0]) {
        errorElement.textContent = 'Please select a file';
        errorElement.classList.remove('hidden');
        return;
    }

    // Show loading state
    uploadButton.disabled = true;
    uploadButton.innerHTML = `
        <svg class="animate-spin h-5 w-5 mr-2 inline" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Processing...
    `;

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
            // Clear file input and error
            fileInput.value = '';
            errorElement.classList.add('hidden');
            
            // Show success message
            const successMessage = document.createElement('div');
            successMessage.className = 'bg-green-100 text-green-700 p-3 rounded-md mb-4';
            successMessage.textContent = 'Document uploaded successfully!';
            fileInput.parentElement.insertBefore(successMessage, fileInput);
            
            // Display similar documents if any
            if (data.similarDocuments) {
                displaySimilarDocuments(data.similarDocuments);
            }
            
            // Update document list and credits
            updateDocumentsList();
            updateCredits();
            
            // Remove success message after 3 seconds
            setTimeout(() => successMessage.remove(), 3000);
        } else {
            errorElement.textContent = data.error;
            errorElement.classList.remove('hidden');
        }
    } catch (error) {
        errorElement.textContent = 'Upload failed. Please try again.';
        errorElement.classList.remove('hidden');
    } finally {
        // Reset button state
        uploadButton.disabled = false;
        uploadButton.innerHTML = originalButtonText;
    }
});

// Add these function calls to the DOMContentLoaded event listener
document.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('user'));

    if (window.location.pathname.includes('dashboard.html')) {
        if (!user) {
            window.location.href = 'index.html';
        } else {
            document.getElementById('dashboardUsername').innerText = user.username;
            updateCredits();
            updateDocumentsList();
        }
    }
});


// Add this function to display similar documents
function displaySimilarDocuments(similarDocs) {
    const similarDocsContainer = document.getElementById('similarDocuments');
    
    if (!similarDocs || similarDocs.length === 0) {
        similarDocsContainer.innerHTML = '<p class="text-gray-500">No similar documents found.</p>';
        return;
    }

    similarDocsContainer.innerHTML = `
        <h4 class="text-lg font-semibold mb-3">Similar Documents Found:</h4>
        <div class="space-y-3">
            ${similarDocs.map(doc => `
                <div class="p-3 bg-blue-50 rounded-md border border-blue-200">
                    <div class="flex justify-between items-center">
                        <span class="font-medium">${doc.filename}</span>
                        <span class="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            ${doc.similarity}% similar
                        </span>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}