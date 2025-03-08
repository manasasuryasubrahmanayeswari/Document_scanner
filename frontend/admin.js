// admin.js
document.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (!user || user.role !== 'admin') {
        window.location.href = 'index.html';
        return;
    }

    loadAnalytics();
    loadCreditRequests();
    loadUsers();
    setInterval(loadCreditRequests, 30000); // Refresh every 30 seconds

    // Set up event listeners
    document.getElementById('promoteForm')?.addEventListener('submit', handlePromote);
});

async function loadAnalytics() {
    try {
        const response = await fetch('http://localhost:5000/admin/analytics', {
            credentials: 'include'
        });
        const data = await response.json();
        
        document.getElementById('totalUsers').textContent = data.analytics.totalUsers;
        document.getElementById('totalDocuments').textContent = data.analytics.totalDocuments;
        document.getElementById('todayActivities').textContent = data.analytics.todayActivities;
        document.getElementById('pendingRequests').textContent = data.analytics.pendingRequests;
    } catch (error) {
        console.error('Failed to load analytics:', error);
    }
}

async function loadCreditRequests() {
    try {
        const response = await fetch('http://localhost:5000/admin/credit-requests', {
            credentials: 'include'
        });
        const data = await response.json();
        
        const requestsContainer = document.getElementById('creditRequests');
        if (data.requests.length === 0) {
            requestsContainer.innerHTML = '<p class="text-gray-500">No pending requests</p>';
            return;
        }

        requestsContainer.innerHTML = data.requests.map(request => `
            <div class="bg-white p-4 rounded-lg shadow">
                <div class="flex justify-between items-start">
                    <div>
                        <p class="font-semibold">${request.username}</p>
                        <p class="text-sm text-gray-600">${request.email}</p>
                        <p class="text-sm">Requested: ${request.requested_amount} credits</p>
                        <p class="text-xs text-gray-500">
                            ${new Date(request.request_date).toLocaleString()}
                        </p>
                    </div>
                    <div class="space-x-2">
                        <button 
                            onclick="handleRequest(${request.id}, 'approved', ${request.requested_amount})"
                            class="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                        >
                            Approve
                        </button>
                        <button 
                            onclick="handleRequest(${request.id}, 'denied', 0)"
                            class="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                        >
                            Deny
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Failed to load credit requests:', error);
    }
}

async function handleRequest(requestId, status, amount) {
    try {
        const response = await fetch(`http://localhost:5000/admin/credit-requests/${requestId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ status, amount })
        });

        if (response.ok) {
            loadCreditRequests();
            loadAnalytics();
        }
    } catch (error) {
        console.error('Failed to handle request:', error);
    }
}

function switchTab(tabName) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.add('hidden');
    });
    
    // Remove active state from all tab buttons
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('border-blue-500', 'text-blue-600');
        button.classList.add('border-transparent', 'text-gray-500');
    });
    
    // Show selected tab content
    const selectedTab = document.getElementById(`${tabName}Tab`);
    selectedTab.classList.remove('hidden');
    
    // Update tab button state
    const selectedButton = document.querySelector(`button[onclick="switchTab('${tabName}')"]`);
    selectedButton.classList.remove('border-transparent', 'text-gray-500');
    selectedButton.classList.add('border-blue-500', 'text-blue-600');
}

async function loadUsers() {
    try {
        const response = await fetch('http://localhost:5000/users', {
            credentials: 'include'
        });
        const data = await response.json();
        
        const usersList = document.getElementById('usersList');
        usersList.innerHTML = data.users.map(user => `
            <tr>
                <td class="px-6 py-4 border-b">${user.username}</td>
                <td class="px-6 py-4 border-b">${user.email}</td>
                <td class="px-6 py-4 border-b">
                    <span class="px-2 py-1 rounded-full text-sm ${
                        user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                    }">
                        ${user.role}
                    </span>
                </td>
                <td class="px-6 py-4 border-b">${user.credits}</td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Failed to load users:', error);
    }
}

async function handlePromote(e) {
    e.preventDefault();
    const email = document.getElementById('promoteEmail').value;
    const adminPassword = document.getElementById('adminPassword').value;
    const errorElement = document.getElementById('promoteError');

    try {
        const response = await fetch('http://localhost:5000/promote-to-admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ email, adminPassword })
        });

        const data = await response.json();
        
        if (response.ok) {
            alert('User promoted to admin successfully!');
            document.getElementById('promoteEmail').value = '';
            document.getElementById('adminPassword').value = '';
            errorElement.classList.add('hidden');
            loadUsers(); // Refresh user list
        } else {
            errorElement.textContent = data.error;
            errorElement.classList.remove('hidden');
        }
    } catch (error) {
        errorElement.textContent = 'Failed to promote user. Please try again.';
        errorElement.classList.remove('hidden');
    }
}