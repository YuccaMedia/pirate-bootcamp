document.addEventListener('DOMContentLoaded', function() {
    // Initialize security score animation
    animateSecurityScore();
    
    // Initialize charts
    initAlertTrendChart();
    initThreatSourceChart();
    
    // Initialize IPFS Activity Chart
    initIPFSActivityChart();
    
    // Populate IPFS metrics
    populateIPFSMetrics();
    
    // Populate recent IPFS uploads table
    populateRecentUploads();
    
    // Event listeners for audit modal
    document.getElementById('audit-ipfs-content').addEventListener('click', function() {
        const modal = new bootstrap.Modal(document.getElementById('ipfs-audit-modal'));
        modal.show();
        simulateAuditScan();
    });
});

function animateSecurityScore() {
    const scoreValue = document.querySelector('.score-value');
    let count = 0;
    const target = parseInt(scoreValue.getAttribute('data-score'));
    const duration = 1500;
    const interval = 10;
    const step = target / (duration / interval);
    
    const timer = setInterval(() => {
        count += step;
        if (count >= target) {
            clearInterval(timer);
            count = target;
        }
        scoreValue.textContent = Math.floor(count);
    }, interval);
}

function initAlertTrendChart() {
    const ctx = document.getElementById('alert-trend-chart').getContext('2d');
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
                label: 'Critical',
                data: [3, 5, 2, 1, 0, 1],
                borderColor: '#dc3545',
                backgroundColor: 'rgba(220, 53, 69, 0.1)',
                tension: 0.4,
                fill: true
            }, {
                label: 'High',
                data: [8, 10, 7, 5, 6, 4],
                borderColor: '#fd7e14',
                backgroundColor: 'rgba(253, 126, 20, 0.1)',
                tension: 0.4,
                fill: true
            }, {
                label: 'Medium',
                data: [15, 13, 12, 8, 10, 7],
                borderColor: '#ffc107',
                backgroundColor: 'rgba(255, 193, 7, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: false
                },
                legend: {
                    position: 'bottom',
                    labels: {
                        boxWidth: 12
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        drawBorder: false
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

function initThreatSourceChart() {
    const ctx = document.getElementById('threat-source-chart').getContext('2d');
    
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['External', 'Internal', 'Third-party', 'Unknown'],
            datasets: [{
                data: [45, 25, 20, 10],
                backgroundColor: [
                    '#0d6efd',
                    '#6f42c1',
                    '#20c997',
                    '#adb5bd'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        boxWidth: 12
                    }
                }
            },
            cutout: '70%'
        }
    });
}

// New Function for IPFS Activity Chart
function initIPFSActivityChart() {
    const ctx = document.getElementById('ipfs-activity-chart').getContext('2d');
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'JSON Pins',
                data: [12, 19, 8, 15, 20, 14, 11],
                backgroundColor: 'rgba(13, 110, 253, 0.7)',
                borderWidth: 0
            }, {
                label: 'File Pins',
                data: [5, 7, 11, 8, 9, 4, 6],
                backgroundColor: 'rgba(111, 66, 193, 0.7)',
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: false
                },
                legend: {
                    position: 'bottom',
                    labels: {
                        boxWidth: 12
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Pins'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Day of Week'
                    }
                }
            }
        }
    });
}

// Function to populate IPFS metrics with sample data
function populateIPFSMetrics() {
    document.getElementById('pinned-content-count').textContent = '1,247';
    document.getElementById('storage-used').textContent = '14.8 GB';
    document.getElementById('upload-health').textContent = '98.5%';
}

// Function to populate recent IPFS uploads table with sample data
function populateRecentUploads() {
    const tableBody = document.getElementById('recent-uploads-table').querySelector('tbody');
    
    const uploads = [
        {
            timestamp: '2023-07-15 14:32:45',
            type: 'JSON',
            size: '12.4 KB',
            hash: 'QmZ4tDuvesekSs4qM5ZBKpXiZGun7S2CYtEZRB3DYXkjGx',
            user: 'system@example.com',
            status: 'Verified'
        },
        {
            timestamp: '2023-07-15 13:21:18',
            type: 'File',
            size: '5.7 MB',
            hash: 'QmUNLLsPACCz1vLxQVkXqqLX5R1X345qqfHbsf67hvA3Nn',
            user: 'admin@example.com',
            status: 'Pending Verification'
        },
        {
            timestamp: '2023-07-14 22:15:33',
            type: 'JSON',
            size: '8.9 KB',
            hash: 'QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR',
            user: 'user@example.com',
            status: 'Verified'
        },
        {
            timestamp: '2023-07-14 15:47:22',
            type: 'File',
            size: '128.3 MB',
            hash: 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
            user: 'admin@example.com',
            status: 'Verification Failed'
        },
        {
            timestamp: '2023-07-13 09:35:17',
            type: 'JSON',
            size: '15.2 KB',
            hash: 'QmdmQXB2mzChmMeKY47C43LxUdg1NDJ5MWcKMKxDu7RgQm',
            user: 'system@example.com',
            status: 'Verified'
        }
    ];
    
    tableBody.innerHTML = '';
    
    uploads.forEach(upload => {
        const row = document.createElement('tr');
        
        const statusClass = upload.status === 'Verified' ? 'text-success' : 
                         upload.status === 'Verification Failed' ? 'text-danger' : 'text-warning';
        
        row.innerHTML = `
            <td>${upload.timestamp}</td>
            <td>${upload.type}</td>
            <td>${upload.size}</td>
            <td><span class="ipfs-hash">${upload.hash.substring(0, 10)}...</span></td>
            <td>${upload.user}</td>
            <td class="${statusClass}">${upload.status}</td>
        `;
        
        tableBody.appendChild(row);
    });
}

// Function to simulate the audit scan process
function simulateAuditScan() {
    const progressBar = document.getElementById('audit-progress');
    const statusText = document.getElementById('audit-status');
    const resultsList = document.getElementById('audit-results');
    const scanButton = document.getElementById('start-audit-scan');
    
    scanButton.disabled = true;
    resultsList.innerHTML = '';
    progressBar.style.width = '0%';
    progressBar.setAttribute('aria-valuenow', 0);
    statusText.textContent = 'Starting scan...';
    
    let progress = 0;
    const interval = setInterval(() => {
        progress += 5;
        progressBar.style.width = `${progress}%`;
        progressBar.setAttribute('aria-valuenow', progress);
        
        if (progress <= 20) {
            statusText.textContent = 'Analyzing metadata structure...';
        } else if (progress <= 40) {
            statusText.textContent = 'Checking data integrity...';
        } else if (progress <= 60) {
            statusText.textContent = 'Scanning for sensitive information...';
        } else if (progress <= 80) {
            statusText.textContent = 'Verifying access permissions...';
        } else if (progress < 100) {
            statusText.textContent = 'Finalizing security report...';
        }
        
        if (progress >= 100) {
            clearInterval(interval);
            statusText.textContent = 'Scan completed';
            displayAuditResults();
            scanButton.disabled = false;
        }
    }, 100);
}

function displayAuditResults() {
    const resultsList = document.getElementById('audit-results');
    
    const results = [
        { status: 'pass', message: 'No sensitive personal data found in content' },
        { status: 'pass', message: 'Content hash verification successful' },
        { status: 'warning', message: 'Access permissions broader than recommended' },
        { status: 'pass', message: 'No malicious code detected in content' },
        { status: 'warning', message: 'Large file sizes may impact performance' }
    ];
    
    results.forEach(result => {
        const item = document.createElement('li');
        item.classList.add('list-group-item', 'd-flex', 'align-items-center');
        
        if (result.status === 'pass') {
            item.innerHTML = `<i class="bi bi-check-circle text-success"></i> ${result.message}`;
        } else if (result.status === 'warning') {
            item.innerHTML = `<i class="bi bi-exclamation-triangle text-warning"></i> ${result.message}`;
        } else {
            item.innerHTML = `<i class="bi bi-x-circle text-danger"></i> ${result.message}`;
        }
        
        resultsList.appendChild(item);
    });
} 