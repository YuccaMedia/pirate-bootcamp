// Security Dashboard JavaScript

// API configuration
const API_BASE_URL = '/security-dashboard';
const API_KEY = localStorage.getItem('security_dashboard_api_key') || '';
const API_HEADERS = {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY
};

// IPFS Metrics configuration
const IPFS_METRICS_URL = `${API_BASE_URL}/api/ipfs-metrics`;
const SECURITY_METRICS_URL = `${API_BASE_URL}/api/metrics`;
const INCIDENTS_URL = `${API_BASE_URL}/api/incidents`;
const BLOCKED_IPS_URL = `${API_BASE_URL}/api/blocked-ips`;
const SECURITY_CONFIG_URL = `${API_BASE_URL}/api/security-config`;

// Dashboard state
let dashboardData = {
    metrics: {},
    incidents: [],
    blockedIPs: [],
    securityScore: 85,
    alertCounts: {
        critical: 0,
        high: 1,
        medium: 3,
        low: 7
    },
    systemStatus: {
        firewall: {
            status: 'active',
            details: 'Active (24 rules)'
        },
        ddos: {
            status: 'active',
            details: 'Active'
        },
        ids: {
            status: 'active',
            details: 'Normal (2 alerts)'
        },
        encryption: {
            status: 'active',
            details: 'AES-256-GCM'
        }
    },
    complianceStatus: {
        gdpr: {
            score: 91,
            items: 2,
            status: 'passed'
        },
        pci: {
            score: 86,
            items: 3,
            status: 'warning'
        },
        iso27001: {
            score: 94,
            items: 1,
            status: 'passed'
        },
        soc2: {
            score: 82,
            items: 4,
            status: 'warning'
        }
    },
    ipfsMetrics: {
        totalPinned: 0,
        totalSize: 0,
        uploadSuccess: 0,
        uploadFailures: 0,
        recentUploads: []
    }
};

// Charts
let eventsChart;
let distributionChart;
let ipfsActivityChart;

// DOM Elements
const refreshButton = document.getElementById('refresh-btn');
const lastUpdatedEl = document.getElementById('last-updated');
const securityScoreEl = document.getElementById('security-score-value');
const criticalCountEl = document.getElementById('critical-count');
const highCountEl = document.getElementById('high-count');
const mediumCountEl = document.getElementById('medium-count');
const lowCountEl = document.getElementById('low-count');
const incidentsTableBody = document.querySelector('#incidents-table tbody');
const blockedIPsTableBody = document.querySelector('#blocked-ips-table tbody');
const timeSelectors = document.querySelectorAll('.time-selector');
const addBlockBtn = document.getElementById('add-block-btn');
const submitBlockBtn = document.getElementById('submit-block');

// Modal elements
const blockIPModal = new bootstrap.Modal(document.getElementById('block-ip-modal'));
const incidentDetailModal = new bootstrap.Modal(document.getElementById('incident-detail-modal'));

// Initialize the dashboard
async function initDashboard() {
    // Set up event listeners
    refreshButton.addEventListener('click', loadDashboardData);
    addBlockBtn.addEventListener('click', () => blockIPModal.show());
    submitBlockBtn.addEventListener('click', handleBlockIP);
    
    timeSelectors.forEach(selector => {
        selector.addEventListener('click', (e) => {
            timeSelectors.forEach(sel => sel.classList.remove('active'));
            e.target.classList.add('active');
            updateEventsChart(e.target.dataset.time);
        });
    });

    // Load initial data
    await loadDashboardData();
    
    // Initialize charts
    initCharts();
    
    // Update the dashboard
    updateDashboard();

    // Set up periodic refresh (every 5 minutes)
    setInterval(loadDashboardData, 5 * 60 * 1000);
}

// Load data from API
async function loadDashboardData() {
    try {
        refreshButton.disabled = true;
        
        // Fetch real data from API endpoints
        const [metricsResponse, ipfsMetricsResponse, incidentsResponse, blockedIPsResponse] = await Promise.all([
            fetch(SECURITY_METRICS_URL, { headers: API_HEADERS }).then(res => res.json()),
            fetch(IPFS_METRICS_URL, { headers: API_HEADERS }).then(res => res.json()),
            fetch(INCIDENTS_URL, { headers: API_HEADERS }).then(res => res.json()),
            fetch(BLOCKED_IPS_URL, { headers: API_HEADERS }).then(res => res.json())
        ]);
        
        // Update dashboard data with real metrics
        if (metricsResponse.success) {
            dashboardData.securityScore = metricsResponse.data.securityScore;
            
            // Update system status based on real data
            if (metricsResponse.data.metrics.network) {
                dashboardData.systemStatus.ddos.status = 
                    metricsResponse.data.metrics.network.ddosProtection === 'enabled' ? 'active' : 'warning';
                dashboardData.systemStatus.ddos.details = 
                    metricsResponse.data.metrics.network.ddosProtection === 'enabled' ? 'Active' : 'Disabled';
                
                dashboardData.systemStatus.firewall.details = 
                    `Active (${metricsResponse.data.metrics.network.firewallRules} rules)`;
            }
            
            // Update compliance status from real data
            if (metricsResponse.data.metrics.compliance && metricsResponse.data.metrics.compliance.frameworks) {
                const frameworks = metricsResponse.data.metrics.compliance.frameworks;
                
                Object.keys(frameworks).forEach(key => {
                    if (dashboardData.complianceStatus[key]) {
                        dashboardData.complianceStatus[key] = frameworks[key];
                    }
                });
            }
        }
        
        // Update IPFS metrics with real data
        if (ipfsMetricsResponse.success && ipfsMetricsResponse.data.ipfsMetrics) {
            dashboardData.ipfsMetrics = ipfsMetricsResponse.data.ipfsMetrics;
        }
        
        // Update incidents with real data
        if (incidentsResponse.success && incidentsResponse.data.incidents) {
            dashboardData.incidents = incidentsResponse.data.incidents;
        }
        
        // Update blocked IPs with real data
        if (blockedIPsResponse.success && blockedIPsResponse.data.blockedIPs) {
            dashboardData.blockedIPs = blockedIPsResponse.data.blockedIPs;
        }
        
        // Update alert counts based on incidents
        const counts = { critical: 0, high: 0, medium: 0, low: 0 };
        dashboardData.incidents.forEach(incident => {
            counts[incident.severity] = (counts[incident.severity] || 0) + 1;
        });
        dashboardData.alertCounts = counts;
        
        // Update last updated time
        lastUpdatedEl.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
        
        // Update the dashboard
        updateDashboard();
        
        // Update the IPFS activity chart if it exists
        if (ipfsActivityChart && dashboardData.ipfsMetrics.dailyActivity) {
            updateIPFSActivityChart();
        }
        
        refreshButton.disabled = false;
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        refreshButton.disabled = false;
    }
}

// Update security score based on incidents and compliance
function updateSecurityScore() {
    // In a real implementation, this would be calculated based on various security factors
    // This is a simplified implementation
    
    // Factors that affect the score:
    // 1. Number of critical incidents (each reduces score by 10)
    // 2. Number of high incidents (each reduces score by 5)
    // 3. Average compliance score
    
    let score = 100;
    score -= dashboardData.alertCounts.critical * 10;
    score -= dashboardData.alertCounts.high * 5;
    
    // Average compliance score
    const complianceScores = [
        dashboardData.complianceStatus.gdpr.score,
        dashboardData.complianceStatus.pci.score,
        dashboardData.complianceStatus.iso27001.score,
        dashboardData.complianceStatus.soc2.score
    ];
    const avgCompliance = complianceScores.reduce((a, b) => a + b, 0) / complianceScores.length;
    
    // Weight compliance as 20% of the score
    score = score * 0.8 + avgCompliance * 0.2;
    
    // Ensure score is between 0 and 100
    score = Math.max(0, Math.min(100, Math.round(score)));
    
    dashboardData.securityScore = score;
}

// Initialize charts
function initCharts() {
    // Security Events Trend Chart
    const eventsCtx = document.getElementById('events-chart').getContext('2d');
    eventsChart = new Chart(eventsCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Critical',
                    borderColor: '#e74c3c',
                    backgroundColor: 'rgba(231, 76, 60, 0.1)',
                    data: [],
                    tension: 0.3,
                    fill: true
                },
                {
                    label: 'High',
                    borderColor: '#f39c12',
                    backgroundColor: 'rgba(243, 156, 18, 0.1)',
                    data: [],
                    tension: 0.3,
                    fill: true
                },
                {
                    label: 'Medium',
                    borderColor: '#f1c40f',
                    backgroundColor: 'rgba(241, 196, 15, 0.1)',
                    data: [],
                    tension: 0.3,
                    fill: true
                },
                {
                    label: 'Low',
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    data: [],
                    tension: 0.3,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Time'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Events'
                    },
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            }
        }
    });
    
    // Event Distribution Chart
    const distributionCtx = document.getElementById('events-distribution-chart').getContext('2d');
    distributionChart = new Chart(distributionCtx, {
        type: 'doughnut',
        data: {
            labels: ['Unauthorized Access', 'DDoS', 'Data Breach', 'Malware', 'Other'],
            datasets: [{
                data: [35, 20, 15, 10, 20],
                backgroundColor: [
                    '#3498db',
                    '#e74c3c',
                    '#f39c12',
                    '#2ecc71',
                    '#95a5a6'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'right',
                }
            }
        }
    });
    
    // IPFS Activity Chart (if element exists)
    const ipfsActivityEl = document.getElementById('ipfs-activity-chart');
    if (ipfsActivityEl) {
        const ipfsCtx = ipfsActivityEl.getContext('2d');
        ipfsActivityChart = new Chart(ipfsCtx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Successful Uploads',
                        backgroundColor: '#2ecc71',
                        data: []
                    },
                    {
                        label: 'Failed Uploads',
                        backgroundColor: '#e74c3c',
                        data: []
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                    }
                },
                scales: {
                    x: {
                        stacked: true,
                        title: {
                            display: true,
                            text: 'Date'
                        }
                    },
                    y: {
                        stacked: true,
                        title: {
                            display: true,
                            text: 'Count'
                        },
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        }
                    }
                }
            }
        });
        
        // Initial update
        updateIPFSActivityChart();
    }
    
    // Update charts with initial data
    updateEventsChart('day');
}

// Update the events chart based on time selection
function updateEventsChart(timeFrame) {
    // Generate mock data based on time frame
    const labels = [];
    const datasets = eventsChart.data.datasets;
    
    // Clear previous data
    datasets.forEach(dataset => dataset.data = []);
    
    // Generate time labels and random data
    let points;
    let format;
    
    switch(timeFrame) {
        case 'month':
            points = 30;
            format = 'MMM D';
            break;
        case 'week':
            points = 7;
            format = 'ddd';
            break;
        case 'day':
        default:
            points = 24;
            format = 'h:mm a';
    }
    
    // Generate labels
    for (let i = 0; i < points; i++) {
        const date = new Date();
        
        if (timeFrame === 'month') {
            date.setDate(date.getDate() - (points - 1 - i));
        } else if (timeFrame === 'week') {
            date.setDate(date.getDate() - (points - 1 - i));
        } else {
            date.setHours(date.getHours() - (points - 1 - i));
        }
        
        labels.push(date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}));
    }
    
    // Update chart labels
    eventsChart.data.labels = labels;
    
    // Generate random data
    datasets.forEach(dataset => {
        for (let i = 0; i < points; i++) {
            if (dataset.label === 'Critical') {
                dataset.data.push(Math.floor(Math.random() * 3)); // 0-2
            } else if (dataset.label === 'High') {
                dataset.data.push(Math.floor(Math.random() * 5)); // 0-4
            } else if (dataset.label === 'Medium') {
                dataset.data.push(Math.floor(Math.random() * 8)); // 0-7
            } else {
                dataset.data.push(Math.floor(Math.random() * 10)); // 0-9
            }
        }
    });
    
    // Update chart
    eventsChart.update();
}

// Update IPFS Activity Chart
function updateIPFSActivityChart() {
    if (!ipfsActivityChart) return;
    
    const activityData = dashboardData.ipfsMetrics.dailyActivity || [];
    
    ipfsActivityChart.data.labels = activityData.map(item => item.date);
    ipfsActivityChart.data.datasets[0].data = activityData.map(item => item.uploads - item.failures);
    ipfsActivityChart.data.datasets[1].data = activityData.map(item => item.failures);
    
    ipfsActivityChart.update();
}

// Update the dashboard with current data
function updateDashboard() {
    // Update security score
    securityScoreEl.textContent = dashboardData.securityScore;
    
    // Update security score gradient based on the value
    const scoreElement = document.getElementById('security-score');
    if (dashboardData.securityScore >= 90) {
        scoreElement.style.background = `conic-gradient(#2ecc71 0% ${dashboardData.securityScore}%, #e5e5e5 ${dashboardData.securityScore}% 100%)`;
    } else if (dashboardData.securityScore >= 70) {
        scoreElement.style.background = `conic-gradient(#f39c12 0% ${dashboardData.securityScore}%, #e5e5e5 ${dashboardData.securityScore}% 100%)`;
    } else {
        scoreElement.style.background = `conic-gradient(#e74c3c 0% ${dashboardData.securityScore}%, #e5e5e5 ${dashboardData.securityScore}% 100%)`;
    }
    
    // Update alert counts
    criticalCountEl.textContent = dashboardData.alertCounts.critical || 0;
    highCountEl.textContent = dashboardData.alertCounts.high || 0;
    mediumCountEl.textContent = dashboardData.alertCounts.medium || 0;
    lowCountEl.textContent = dashboardData.alertCounts.low || 0;
    
    // Update system status indicators
    Object.keys(dashboardData.systemStatus).forEach(key => {
        const statusEl = document.getElementById(`${key}-status`);
        const detailEl = document.getElementById(`${key}-detail`);
        
        if (statusEl) {
            statusEl.className = `status-indicator ${dashboardData.systemStatus[key].status}`;
        }
        
        if (detailEl) {
            detailEl.textContent = dashboardData.systemStatus[key].details;
        }
    });
    
    // Update incidents table
    incidentsTableBody.innerHTML = '';
    dashboardData.incidents.slice(0, 5).forEach(incident => {
        const tr = document.createElement('tr');
        tr.dataset.id = incident.id;
        
        // Format the date
        const date = new Date(incident.timestamp);
        const formattedDate = date.toLocaleString();
        
        tr.innerHTML = `
            <td><a href="#" class="incident-link">${incident.id}</a></td>
            <td>${formatIncidentType(incident.type)}</td>
            <td><span class="badge ${getSeverityClass(incident.severity)}">${incident.severity}</span></td>
            <td><span class="badge ${getStatusClass(incident.status)}">${incident.status}</span></td>
            <td>${formattedDate}</td>
        `;
        
        // Add click event to show incident details
        const incidentLink = tr.querySelector('.incident-link');
        incidentLink.addEventListener('click', (e) => {
            e.preventDefault();
            showIncidentDetails(incident);
        });
        
        incidentsTableBody.appendChild(tr);
    });
    
    // Update blocked IPs table
    blockedIPsTableBody.innerHTML = '';
    dashboardData.blockedIPs.forEach(block => {
        const tr = document.createElement('tr');
        
        // Format the dates
        const blockDate = new Date(block.timestamp);
        const formattedBlockDate = blockDate.toLocaleString();
        
        let expiryText = 'Permanent';
        if (block.expiry) {
            const expiryDate = new Date(block.expiry);
            expiryText = expiryDate.toLocaleString();
        }
        
        tr.innerHTML = `
            <td>${block.ip}</td>
            <td>${block.reason}</td>
            <td>${formattedBlockDate}</td>
            <td>${expiryText}</td>
            <td>
                <button class="btn btn-sm btn-outline-danger unblock-btn" data-ip="${block.ip}">Unblock</button>
            </td>
        `;
        
        // Add click event to unblock button
        const unblockBtn = tr.querySelector('.unblock-btn');
        unblockBtn.addEventListener('click', () => handleUnblockIP(block.ip));
        
        blockedIPsTableBody.appendChild(tr);
    });
    
    // Update IPFS metrics (if elements exist)
    const totalPinnedEl = document.getElementById('ipfs-total-pinned');
    const totalSizeEl = document.getElementById('ipfs-total-size');
    const successRateEl = document.getElementById('ipfs-success-rate');
    const recentUploadsTableBody = document.querySelector('#recent-uploads-table tbody');
    
    if (totalPinnedEl) {
        totalPinnedEl.textContent = dashboardData.ipfsMetrics.totalPinned;
    }
    
    if (totalSizeEl) {
        totalSizeEl.textContent = `${dashboardData.ipfsMetrics.totalSize} MB`;
    }
    
    if (successRateEl) {
        successRateEl.textContent = `${dashboardData.ipfsMetrics.successRate}%`;
        
        // Update color based on success rate
        if (dashboardData.ipfsMetrics.successRate >= 95) {
            successRateEl.classList.remove('text-warning', 'text-danger');
            successRateEl.classList.add('text-success');
        } else if (dashboardData.ipfsMetrics.successRate >= 90) {
            successRateEl.classList.remove('text-success', 'text-danger');
            successRateEl.classList.add('text-warning');
        } else {
            successRateEl.classList.remove('text-success', 'text-warning');
            successRateEl.classList.add('text-danger');
        }
    }
    
    // Update recent uploads table
    if (recentUploadsTableBody) {
        recentUploadsTableBody.innerHTML = '';
        
        dashboardData.ipfsMetrics.recentUploads.forEach(upload => {
            const tr = document.createElement('tr');
            
            // Format the date
            const date = new Date(upload.timestamp);
            const formattedDate = date.toLocaleString();
            
            tr.innerHTML = `
                <td><a href="#" class="ipfs-link" data-hash="${upload.hash}">${upload.hash.substring(0, 10)}...</a></td>
                <td>${upload.name}</td>
                <td>${upload.size} MB</td>
                <td>${formattedDate}</td>
            `;
            
            recentUploadsTableBody.appendChild(tr);
        });
    }
}

// Show incident details in modal
function showIncidentDetails(incident) {
    const modal = document.getElementById('incident-detail-modal');
    const modalTitle = document.getElementById('incident-title');
    const modalBody = document.getElementById('incident-details');
    
    modalTitle.textContent = `Incident: ${incident.id} - ${formatIncidentType(incident.type)}`;
    
    // Format incident details
    const date = new Date(incident.timestamp);
    const formattedDate = date.toLocaleString();
    
    let detailsHtml = `
        <div class="incident-header">
            <div class="row mb-3">
                <div class="col-md-6">
                    <span class="badge ${getSeverityClass(incident.severity)} mb-2">${incident.severity}</span>
                    <span class="badge ${getStatusClass(incident.status)} mb-2">${incident.status}</span>
                    <p><strong>Time:</strong> ${formattedDate}</p>
                </div>
                <div class="col-md-6">
                    <p><strong>Type:</strong> ${formatIncidentType(incident.type)}</p>
                </div>
            </div>
        </div>
        <hr>
        <h5>Details</h5>
        <pre class="bg-light p-3 mb-3" style="border-radius: 5px;">${JSON.stringify(incident.details, null, 2)}</pre>
    `;
    
    // Add recommended actions based on incident type
    detailsHtml += `
        <h5>Recommended Actions</h5>
        <ul class="list-group mb-3">
    `;
    
    switch(incident.type) {
        case 'unauthorized-access':
            detailsHtml += `
                <li class="list-group-item">Block source IP address</li>
                <li class="list-group-item">Force password reset for affected users</li>
                <li class="list-group-item">Review authentication logs</li>
            `;
            break;
        case 'ddos':
            detailsHtml += `
                <li class="list-group-item">Enable DDoS protection</li>
                <li class="list-group-item">Contact upstream provider</li>
                <li class="list-group-item">Update firewall rules</li>
            `;
            break;
        case 'data-breach':
            detailsHtml += `
                <li class="list-group-item">Isolate affected systems</li>
                <li class="list-group-item">Notify affected users</li>
                <li class="list-group-item">Assess data exposure and compliance impact</li>
            `;
            break;
        default:
            detailsHtml += `
                <li class="list-group-item">Investigate the incident</li>
                <li class="list-group-item">Document findings</li>
                <li class="list-group-item">Update security measures</li>
            `;
    }
    
    detailsHtml += `</ul>`;
    
    modalBody.innerHTML = detailsHtml;
    
    // Show the modal
    incidentDetailModal.show();
}

// Handle blocking an IP
async function handleBlockIP() {
    const ipAddress = document.getElementById('ip-address').value;
    const reason = document.getElementById('block-reason').value;
    const isPermanent = document.getElementById('duration-perm').checked;
    
    if (!ipAddress || !reason) {
        alert('IP Address and Reason are required');
        return;
    }
    
    try {
        // In a real implementation, this would make an API call
        // const response = await fetch(`${API_BASE_URL}/block-ip`, {
        //     method: 'POST',
        //     headers: API_HEADERS,
        //     body: JSON.stringify({
        //         ip: ipAddress,
        //         reason,
        //         duration: isPermanent ? null : 24 * 60 * 60 * 1000 // 24 hours in ms
        //     })
        // });
        
        // Mock response
        const now = new Date();
        const expiry = isPermanent ? null : new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
        
        // Add to blocked IPs list
        dashboardData.blockedIPs.push({
            ip: ipAddress,
            reason,
            timestamp: now.toISOString(),
            expiry
        });
        
        // Update the dashboard
        updateDashboard();
        
        // Hide the modal
        blockIPModal.hide();
        
        // Reset the form
        document.getElementById('block-ip-form').reset();
        
    } catch (error) {
        console.error('Error blocking IP:', error);
        alert('Failed to block IP. Please try again.');
    }
}

// Handle unblocking an IP
async function handleUnblockIP(ip) {
    if (!confirm(`Are you sure you want to unblock IP ${ip}?`)) {
        return;
    }
    
    try {
        // In a real implementation, this would make an API call
        // const response = await fetch(`${API_BASE_URL}/unblock-ip`, {
        //     method: 'POST',
        //     headers: API_HEADERS,
        //     body: JSON.stringify({ ip })
        // });
        
        // Remove from blocked IPs list
        dashboardData.blockedIPs = dashboardData.blockedIPs.filter(block => block.ip !== ip);
        
        // Update the dashboard
        updateDashboard();
        
    } catch (error) {
        console.error('Error unblocking IP:', error);
        alert('Failed to unblock IP. Please try again.');
    }
}

// Helper functions
function formatIncidentType(type) {
    return type.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

function getSeverityClass(severity) {
    switch(severity) {
        case 'critical':
            return 'bg-danger';
        case 'high':
            return 'bg-warning text-dark';
        case 'medium':
            return 'bg-info text-dark';
        case 'low':
            return 'bg-primary';
        default:
            return 'bg-secondary';
    }
}

function getStatusClass(status) {
    switch(status) {
        case 'resolved':
            return 'bg-success';
        case 'mitigating':
            return 'bg-warning text-dark';
        case 'investigating':
            return 'bg-info text-dark';
        case 'detected':
            return 'bg-danger';
        default:
            return 'bg-secondary';
    }
}

// Initialize the dashboard when the DOM is loaded
document.addEventListener('DOMContentLoaded', initDashboard); 