// Security Validation Status Module

// API configuration
const API_BASE_URL = '/security-dashboard';
const VALIDATION_STATUS_URL = `${API_BASE_URL}/api/validation-status`;
const RUN_VALIDATION_URL = `${API_BASE_URL}/api/run-validation`;
const API_HEADERS = {
    'Content-Type': 'application/json',
    'X-API-Key': localStorage.getItem('security_dashboard_api_key') || ''
};

// DOM Elements
let validationStatusCard;
let validationStatusIcon;
let validationStatusText;
let validationLastChecked;
let validationErrorsList;
let validationWarningsList;
let runValidationBtn;
let validationSpinner;

// Initialize the validation component
function initValidationStatus() {
    // Get DOM elements
    validationStatusCard = document.getElementById('validation-status-card');
    validationStatusIcon = document.getElementById('validation-status-icon');
    validationStatusText = document.getElementById('validation-status-text');
    validationLastChecked = document.getElementById('validation-last-checked');
    validationErrorsList = document.getElementById('validation-errors-list');
    validationWarningsList = document.getElementById('validation-warnings-list');
    runValidationBtn = document.getElementById('run-validation-btn');
    validationSpinner = document.getElementById('validation-spinner');
    
    if (!validationStatusCard) {
        console.error('Validation status card not found in DOM');
        return;
    }
    
    // Set up event listeners
    if (runValidationBtn) {
        runValidationBtn.addEventListener('click', runManualValidation);
    }
    
    // Load initial validation status
    fetchValidationStatus();
    
    // Set up periodic refresh (every 10 minutes)
    setInterval(fetchValidationStatus, 10 * 60 * 1000);
}

// Fetch validation status from API
async function fetchValidationStatus() {
    try {
        if (validationSpinner) {
            validationSpinner.style.display = 'inline-block';
        }
        
        const response = await fetch(VALIDATION_STATUS_URL, { 
            headers: API_HEADERS 
        });
        
        if (!response.ok) {
            throw new Error(`API returned ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            updateValidationStatusUI(data.data);
        } else {
            showValidationError(data.error || 'Unknown error fetching validation status');
        }
    } catch (error) {
        console.error('Error fetching validation status:', error);
        showValidationError(error.message);
    } finally {
        if (validationSpinner) {
            validationSpinner.style.display = 'none';
        }
    }
}

// Run manual validation
async function runManualValidation() {
    try {
        if (runValidationBtn) {
            runValidationBtn.disabled = true;
        }
        
        if (validationSpinner) {
            validationSpinner.style.display = 'inline-block';
        }
        
        const response = await fetch(RUN_VALIDATION_URL, { 
            method: 'POST',
            headers: API_HEADERS 
        });
        
        if (!response.ok) {
            throw new Error(`API returned ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            updateValidationStatusUI(data.data);
        } else {
            showValidationError(data.error || 'Unknown error running validation');
        }
    } catch (error) {
        console.error('Error running validation:', error);
        showValidationError(error.message);
    } finally {
        if (runValidationBtn) {
            runValidationBtn.disabled = false;
        }
        
        if (validationSpinner) {
            validationSpinner.style.display = 'none';
        }
    }
}

// Update the UI with validation status data
function updateValidationStatusUI(data) {
    // Update status icon and text
    if (validationStatusIcon && validationStatusText) {
        if (data.status === 'valid') {
            validationStatusIcon.className = 'fas fa-check-circle text-success';
            validationStatusText.textContent = 'Valid';
            validationStatusText.className = 'text-success';
            validationStatusCard.classList.remove('border-warning', 'border-danger');
            validationStatusCard.classList.add('border-success');
        } else {
            if (data.errors && data.errors.length > 0) {
                validationStatusIcon.className = 'fas fa-exclamation-circle text-danger';
                validationStatusText.textContent = 'Invalid';
                validationStatusText.className = 'text-danger';
                validationStatusCard.classList.remove('border-warning', 'border-success');
                validationStatusCard.classList.add('border-danger');
            } else if (data.warnings && data.warnings.length > 0) {
                validationStatusIcon.className = 'fas fa-exclamation-triangle text-warning';
                validationStatusText.textContent = 'Warning';
                validationStatusText.className = 'text-warning';
                validationStatusCard.classList.remove('border-success', 'border-danger');
                validationStatusCard.classList.add('border-warning');
            }
        }
    }
    
    // Update last checked time
    if (validationLastChecked && data.lastChecked) {
        const date = new Date(data.lastChecked);
        validationLastChecked.textContent = date.toLocaleString();
    }
    
    // Update errors list
    if (validationErrorsList) {
        validationErrorsList.innerHTML = '';
        
        if (data.errors && data.errors.length > 0) {
            validationErrorsList.parentElement.style.display = 'block';
            
            data.errors.forEach(error => {
                const li = document.createElement('li');
                li.className = 'list-group-item text-danger';
                li.innerHTML = `<i class="fas fa-times-circle mr-2"></i> ${error}`;
                validationErrorsList.appendChild(li);
            });
        } else {
            const li = document.createElement('li');
            li.className = 'list-group-item text-success';
            li.innerHTML = '<i class="fas fa-check-circle mr-2"></i> No errors detected';
            validationErrorsList.appendChild(li);
        }
    }
    
    // Update warnings list
    if (validationWarningsList) {
        validationWarningsList.innerHTML = '';
        
        if (data.warnings && data.warnings.length > 0) {
            validationWarningsList.parentElement.style.display = 'block';
            
            data.warnings.forEach(warning => {
                const li = document.createElement('li');
                li.className = 'list-group-item text-warning';
                li.innerHTML = `<i class="fas fa-exclamation-triangle mr-2"></i> ${warning}`;
                validationWarningsList.appendChild(li);
            });
        } else {
            const li = document.createElement('li');
            li.className = 'list-group-item text-success';
            li.innerHTML = '<i class="fas fa-check-circle mr-2"></i> No warnings detected';
            validationWarningsList.appendChild(li);
        }
    }
}

// Show error in the validation card
function showValidationError(message) {
    if (validationStatusIcon && validationStatusText) {
        validationStatusIcon.className = 'fas fa-times-circle text-danger';
        validationStatusText.textContent = 'Error';
        validationStatusText.className = 'text-danger';
    }
    
    if (validationErrorsList) {
        validationErrorsList.innerHTML = '';
        const li = document.createElement('li');
        li.className = 'list-group-item text-danger';
        li.innerHTML = `<i class="fas fa-times-circle mr-2"></i> ${message}`;
        validationErrorsList.appendChild(li);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the right page first
    if (document.getElementById('validation-status-card')) {
        initValidationStatus();
    }
}); 