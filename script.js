// Default data values (corrected based on actual Daily Rewards Full values)
const DEFAULT_DATA = {
    ape: { apy: 6.0 },
    bayc: { dailyRewardsFull: 17.52, apr: 63.35 },
    mayc: { dailyRewardsFull: 4.11, apr: 73.52 },
    bakc: { dailyRewardsFull: 1.45, apr: 61.67 },
    apePrice: 0.7463,
    usdCnyRate: 7.1889
};

// Default calculation inputs
const DEFAULT_INPUTS = {
    apeAmount: 0,
    baycCount: 0,
    maycCount: 0,
    bakcCount: 0
};

// Current data (will be loaded from localStorage or use defaults)
let currentData = { ...DEFAULT_DATA };
let currentInputs = { ...DEFAULT_INPUTS };

// APE staking amounts per NFT
const APE_PER_NFT = {
    bayc: 10094,
    mayc: 2042,
    bakc: 856
};

// Data management functions
function saveDataToLocalStorage(data) {
    try {
        localStorage.setItem('apeCalculatorData', JSON.stringify(data));
        return true;
    } catch (error) {
        console.error('Error saving data to localStorage:', error);
        return false;
    }
}

function loadDataFromLocalStorage() {
    try {
        const saved = localStorage.getItem('apeCalculatorData');
        if (saved) {
            const parsedData = JSON.parse(saved);
            // Validate the data structure
            if (parsedData.ape && parsedData.bayc && parsedData.mayc && parsedData.bakc && 
                typeof parsedData.apePrice === 'number' && typeof parsedData.usdCnyRate === 'number') {
                return parsedData;
            }
        }
    } catch (error) {
        console.error('Error loading data from localStorage:', error);
    }
    return null;
}

// Calculation inputs management functions
function saveInputsToLocalStorage(inputs) {
    try {
        localStorage.setItem('apeCalculatorInputs', JSON.stringify(inputs));
        return true;
    } catch (error) {
        console.error('Error saving inputs to localStorage:', error);
        return false;
    }
}

function loadInputsFromLocalStorage() {
    try {
        const saved = localStorage.getItem('apeCalculatorInputs');
        if (saved) {
            const parsedInputs = JSON.parse(saved);
            // Validate the input structure
            if (typeof parsedInputs.apeAmount === 'number' && 
                typeof parsedInputs.baycCount === 'number' && 
                typeof parsedInputs.maycCount === 'number' && 
                typeof parsedInputs.bakcCount === 'number') {
                return parsedInputs;
            }
        }
    } catch (error) {
        console.error('Error loading inputs from localStorage:', error);
    }
    return null;
}

function saveCurrentInputs() {
    const inputs = {
        apeAmount: parseFloat(document.getElementById('ape-input').value) || 0,
        baycCount: parseInt(document.getElementById('bayc-input').value) || 0,
        maycCount: parseInt(document.getElementById('mayc-input').value) || 0,
        bakcCount: parseInt(document.getElementById('bakc-input').value) || 0
    };
    
    currentInputs = inputs;
    return saveInputsToLocalStorage(inputs);
}

function loadSavedInputs() {
    const savedInputs = loadInputsFromLocalStorage();
    if (savedInputs) {
        currentInputs = savedInputs;
        updateCalculationInputs();
        return true;
    }
    return false;
}

function updateCalculationInputs() {
    document.getElementById('ape-input').value = currentInputs.apeAmount;
    document.getElementById('bayc-input').value = currentInputs.baycCount;
    document.getElementById('mayc-input').value = currentInputs.maycCount;
    document.getElementById('bakc-input').value = currentInputs.bakcCount;
}

// UI update functions
function updateAllDisplays() {
    // Update header stats
    document.getElementById('header-ape-apy').textContent = `${currentData.ape.apy}%`;
    document.getElementById('header-bayc-apr').textContent = `${currentData.bayc.apr}%`;
    document.getElementById('header-mayc-apr').textContent = `${currentData.mayc.apr}%`;
    document.getElementById('header-bakc-apr').textContent = `${currentData.bakc.apr}%`;
    document.getElementById('header-ape-price').textContent = `$${currentData.apePrice.toFixed(4)}`;
    document.getElementById('header-usd-cny').textContent = `${currentData.usdCnyRate.toFixed(4)}`;
    
    // Update pool stats
    document.getElementById('ape-apy').textContent = `${currentData.ape.apy}%`;
    document.getElementById('ape-daily-rate').textContent = `${(currentData.ape.apy / 365).toFixed(4)}%`;
    
    document.getElementById('bayc-daily-rewards').textContent = `${currentData.bayc.dailyRewardsFull} APE`;
    document.getElementById('bayc-apr').textContent = `${currentData.bayc.apr}%`;
    
    document.getElementById('mayc-daily-rewards').textContent = `${currentData.mayc.dailyRewardsFull} APE`;
    document.getElementById('mayc-apr').textContent = `${currentData.mayc.apr}%`;
    
    document.getElementById('bakc-daily-rewards').textContent = `${currentData.bakc.dailyRewardsFull} APE`;
    document.getElementById('bakc-apr').textContent = `${currentData.bakc.apr}%`;
    
    // Update result display prices
    document.getElementById('display-ape-price').textContent = `$${currentData.apePrice.toFixed(4)}`;
    document.getElementById('display-usd-cny').textContent = `${currentData.usdCnyRate.toFixed(4)}`;
}

function updateConfigInputs() {
    document.getElementById('config-ape-apy').value = currentData.ape.apy;
    document.getElementById('config-bayc-daily').value = currentData.bayc.dailyRewardsFull;
    document.getElementById('config-mayc-daily').value = currentData.mayc.dailyRewardsFull;
    document.getElementById('config-bakc-daily').value = currentData.bakc.dailyRewardsFull;
    document.getElementById('config-ape-price').value = currentData.apePrice;
    document.getElementById('config-usd-cny').value = currentData.usdCnyRate;
}

function updateDataStatus(source, timestamp) {
    document.getElementById('data-source-status').textContent = source;
    document.getElementById('last-updated-status').textContent = timestamp;
}

// Notification system
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-message">${message}</span>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;
    
    // Add styles for notification
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? 'var(--gradient-success)' : 
                    type === 'error' ? 'var(--gradient-warning)' : 
                    'var(--gradient-primary)'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 12px;
        box-shadow: var(--shadow-lg);
        z-index: 9999;
        max-width: 400px;
        animation: slideIn 0.3s ease-out;
    `;
    
    // Add animation styles if not already present
    if (!document.getElementById('notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            .notification-content {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 1rem;
            }
            .notification-close {
                background: none;
                border: none;
                color: white;
                font-size: 1.5rem;
                cursor: pointer;
                padding: 0;
                line-height: 1;
            }
            .notification-close:hover {
                opacity: 0.7;
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// Automatic data fetching functions
async function fetchLiveData() {
    try {
        showNotification('Fetching latest data... 🔄', 'info');
        
        let response = await fetch('/api/fetch-data');
        if (response.ok) {
            const data = await response.json();
            
            if (data.success) {
                // Update current data with fetched values
                const newData = {
                    ape: { apy: data.apeApy },
                    bayc: { 
                        dailyRewardsFull: data.baycDaily,
                        apr: parseFloat(data.baycApr)
                    },
                    mayc: { 
                        dailyRewardsFull: data.maycDaily,
                        apr: parseFloat(data.maycApr)
                    },
                    bakc: { 
                        dailyRewardsFull: data.bakcDaily,
                        apr: parseFloat(data.bakcApr)
                    },
                    apePrice: data.apePrice,
                    usdCnyRate: data.usdCnyRate
                };
                
                currentData = newData;
                
                // Update all UI elements
                updateConfigInputs();
                updateAllDisplays();
                
                // Save to localStorage
                saveDataToLocalStorage(currentData);
                
                // Update status
                updateDataStatus('Live API Data', new Date().toLocaleString());
                showNotification('✅ Data updated from live sources!', 'success');
                
                // Auto-calculate if there are existing inputs
                if (hasCalculationInputs()) {
                    calculateRewards();
                }
                
                return true;
            } else {
                // Handle cases where data.success is false
                console.error('API request successful, but data.success is false:', data);
                showNotification('❌ Failed to process live data. API returned an error.', 'error');
                return false;
            }
        } else {
            // Handle non-ok HTTP responses
            console.error('Failed to fetch live data. Status:', response.status);
            showNotification(`❌ Failed to fetch live data. Server returned status ${response.status}. Using cached values.`, 'error');
            return false;
        }
        
    } catch (error) {
        console.error('Error fetching live data:', error);
        showNotification('❌ Failed to fetch live data. Check your internet connection or server status. Using cached values.', 'error');
        return false;
    }
}

// Calculation functions
function calculateAPRFromDaily(dailyRewards, apeStaked) {
    if (apeStaked === 0) return 0;
    const annualRewards = dailyRewards * 365;
    return (annualRewards / apeStaked) * 100;
}

function hasCalculationInputs() {
    const apeAmount = parseFloat(document.getElementById('ape-input').value) || 0;
    const baycCount = parseInt(document.getElementById('bayc-input').value) || 0;
    const maycCount = parseInt(document.getElementById('mayc-input').value) || 0;
    const bakcCount = parseInt(document.getElementById('bakc-input').value) || 0;
    
    return apeAmount > 0 || baycCount > 0 || maycCount > 0 || bakcCount > 0;
}

function calculateRewards() {
    // Get user inputs
    const apeAmount = parseFloat(document.getElementById('ape-input').value) || 0;
    const baycCount = parseInt(document.getElementById('bayc-input').value) || 0;
    const maycCount = parseInt(document.getElementById('mayc-input').value) || 0;
    const bakcCount = parseInt(document.getElementById('bakc-input').value) || 0;
    
    // Save current inputs
    saveCurrentInputs();
    
    // Calculate APE staked for each pool
    const baycApeStaked = baycCount * APE_PER_NFT.bayc;
    const maycApeStaked = maycCount * APE_PER_NFT.mayc;
    const bakcApeStaked = bakcCount * APE_PER_NFT.bakc;
    const totalApeStaked = baycApeStaked + maycApeStaked + bakcApeStaked + apeAmount;
    
    // Calculate daily rewards
    const apeDailyRewards = apeAmount * (currentData.ape.apy / 365 / 100);
    const baycDailyRewards = currentData.bayc.dailyRewardsFull * baycCount;
    const maycDailyRewards = currentData.mayc.dailyRewardsFull * maycCount;
    const bakcDailyRewards = currentData.bakc.dailyRewardsFull * bakcCount;
    
    const totalDailyRewards = apeDailyRewards + baycDailyRewards + maycDailyRewards + bakcDailyRewards;
    const totalMonthlyRewards = totalDailyRewards * 30;
    const totalAnnualRewards = totalDailyRewards * 365;
    
    // Calculate USD and CNY values
    const dailyUSD = totalDailyRewards * currentData.apePrice;
    const dailyCNY = dailyUSD * currentData.usdCnyRate;
    const monthlyUSD = totalMonthlyRewards * currentData.apePrice;
    const monthlyCNY = monthlyUSD * currentData.usdCnyRate;
    const annualUSD = totalAnnualRewards * currentData.apePrice;
    const annualCNY = annualUSD * currentData.usdCnyRate;
    
    // Update APE staked breakdown
    document.getElementById('bayc-ape-staked').textContent = `${baycApeStaked.toLocaleString()} APE`;
    document.getElementById('mayc-ape-staked').textContent = `${maycApeStaked.toLocaleString()} APE`;
    document.getElementById('bakc-ape-staked').textContent = `${bakcApeStaked.toLocaleString()} APE`;
    document.getElementById('direct-ape-staked').textContent = `${apeAmount.toLocaleString()} APE`;
    document.getElementById('total-ape-staked').textContent = `${totalApeStaked.toLocaleString()} APE`;
    
    // Update breakdown for each pool
    updatePoolBreakdown('ape', apeAmount, apeDailyRewards, apeAmount > 0, 'APE staked');
    updatePoolBreakdown('bayc', baycCount, baycDailyRewards, baycCount > 0, 'NFTs staked');
    updatePoolBreakdown('mayc', maycCount, maycDailyRewards, maycCount > 0, 'NFTs staked');
    updatePoolBreakdown('bakc', bakcCount, bakcDailyRewards, bakcCount > 0, 'NFTs staked');
    
    // Update the total results
    document.getElementById('daily-rewards').textContent = `${totalDailyRewards.toFixed(4)} APE`;
    document.getElementById('monthly-rewards').textContent = `${totalMonthlyRewards.toFixed(2)} APE`;
    document.getElementById('annual-rewards').textContent = `${totalAnnualRewards.toFixed(2)} APE`;
    
    // Update USD and CNY values
    document.getElementById('daily-usd').textContent = `$${dailyUSD.toFixed(2)}`;
    document.getElementById('daily-cny').textContent = `¥${dailyCNY.toFixed(2)}`;
    document.getElementById('monthly-usd').textContent = `$${monthlyUSD.toFixed(2)}`;
    document.getElementById('monthly-cny').textContent = `¥${monthlyCNY.toFixed(2)}`;
    document.getElementById('annual-usd').textContent = `$${annualUSD.toFixed(2)}`;
    document.getElementById('annual-cny').textContent = `¥${annualCNY.toFixed(2)}`;
    
    // Show the results container
    document.getElementById('results-container').style.display = 'block';
}

function updatePoolBreakdown(poolName, inputAmount, dailyRewards, shouldShow, unit) {
    const breakdownElement = document.getElementById(`${poolName}-breakdown`);
    const detailsElement = document.getElementById(`${poolName}-breakdown-details`);
    const dailyElement = document.getElementById(`${poolName}-daily-breakdown`);
    const monthlyElement = document.getElementById(`${poolName}-monthly-breakdown`);
    const annualElement = document.getElementById(`${poolName}-annual-breakdown`);
    
    if (shouldShow) {
        // Show the breakdown item
        breakdownElement.style.display = 'block';
        
        // Update details
        if (poolName === 'ape') {
            detailsElement.textContent = `${inputAmount.toLocaleString()} ${unit}`;
        } else {
            detailsElement.textContent = `${inputAmount} ${unit}`;
        }
        
        // Update rewards
        dailyElement.textContent = `${dailyRewards.toFixed(4)} APE`;
        monthlyElement.textContent = `${(dailyRewards * 30).toFixed(2)} APE`;
        annualElement.textContent = `${(dailyRewards * 365).toFixed(2)} APE`;
    } else {
        // Hide the breakdown item
        breakdownElement.style.display = 'none';
    }
}

// Listener setup for staking inputs (APE amount, NFT counts)
function setupStakingInputListeners() {
    const stakingInputs = [
        document.getElementById('ape-input'),
        document.getElementById('bayc-input'),
        document.getElementById('mayc-input'),
        document.getElementById('bakc-input')
    ];
    let debounceTimeoutId;

    stakingInputs.forEach(input => {
        if (!input) return; // Guard against missing elements if HTML changes

        // Basic input sanitization (non-negative, integers for NFTs, decimals for APE)
        input.addEventListener('input', function() {
            if (this.value < 0) this.value = 0;
            if (this.id !== 'ape-input') {
                this.value = Math.floor(this.value);
            }
        });
        
        // Debounced listener for calculations
        input.addEventListener('input', function() {
            clearTimeout(debounceTimeoutId);
            debounceTimeoutId = setTimeout(() => {
                saveCurrentInputs();
                // Always calculate, even if inputs are zero, to clear/update results display
                calculateRewards();
            }, 500);
        });
    });
}

// Listener setup for configuration panel inputs
function setupConfigInputListeners() {
    const configInputIds = [
        'config-ape-apy', 'config-bayc-daily', 'config-mayc-daily',
        'config-bakc-daily', 'config-ape-price', 'config-usd-cny'
    ];

    configInputIds.forEach(id => {
        const input = document.getElementById(id);
        if (!input) return; // Guard

        let debounceTimeoutId;

        // Basic input sanitization (non-negative)
        input.addEventListener('input', function() {
            if (this.value < 0) this.value = 0;
        });

        // Debounced listener for updating currentData and UI
        input.addEventListener('input', function() {
            clearTimeout(debounceTimeoutId);
            debounceTimeoutId = setTimeout(() => {
                const value = parseFloat(this.value);
                let updated = false;

                switch (this.id) {
                    case 'config-ape-apy':
                        currentData.ape.apy = value || DEFAULT_DATA.ape.apy;
                        updated = true;
                        break;
                    case 'config-bayc-daily':
                        currentData.bayc.dailyRewardsFull = value || DEFAULT_DATA.bayc.dailyRewardsFull;
                        currentData.bayc.apr = calculateAPRFromDaily(currentData.bayc.dailyRewardsFull, APE_PER_NFT.bayc);
                        updated = true;
                        break;
                    case 'config-mayc-daily':
                        currentData.mayc.dailyRewardsFull = value || DEFAULT_DATA.mayc.dailyRewardsFull;
                        currentData.mayc.apr = calculateAPRFromDaily(currentData.mayc.dailyRewardsFull, APE_PER_NFT.mayc);
                        updated = true;
                        break;
                    case 'config-bakc-daily':
                        currentData.bakc.dailyRewardsFull = value || DEFAULT_DATA.bakc.dailyRewardsFull;
                        currentData.bakc.apr = calculateAPRFromDaily(currentData.bakc.dailyRewardsFull, APE_PER_NFT.bakc);
                        updated = true;
                        break;
                    case 'config-ape-price':
                        currentData.apePrice = value || DEFAULT_DATA.apePrice;
                        updated = true;
                        break;
                    case 'config-usd-cny':
                        currentData.usdCnyRate = value || DEFAULT_DATA.usdCnyRate;
                        updated = true;
                        break;
                }

                if (updated) {
                    if (saveDataToLocalStorage(currentData)) {
                        updateDataStatus('Manual Input', new Date().toLocaleString());
                        updateAllDisplays(); // Refresh headers, pool stats, etc.
                        if (hasCalculationInputs()) {
                            calculateRewards(); // Recalculate results if user has staking inputs
                        }
                         // No specific notification for each config change to avoid being too noisy.
                         // Status update is sufficient.
                    } else {
                        showNotification('Error saving updated configuration data.', 'error');
                    }
                }
            }, 750); // Slightly longer debounce for config inputs
        });
    });
}


// Event listeners setup for buttons
function setupButtonEventListeners() {
    const autoFetchButton = document.getElementById('auto-fetch-btn');
    if (autoFetchButton) {
        autoFetchButton.addEventListener('click', fetchLiveData);
    }
    // Other buttons were removed, so their listeners are not needed.
}

// Initialization
function initializeApp() {
    // Load saved data or use defaults
    const savedData = loadDataFromLocalStorage();
    if (savedData) {
        currentData = savedData;
        updateDataStatus('Saved Data', 'Loaded from browser storage');
    } else {
        currentData = { ...DEFAULT_DATA }; // Use hardcoded defaults if nothing in localStorage
        updateDataStatus('Default Values', 'Using system defaults');
    }
    
    // Load saved calculation inputs (ape amount, nft counts) or use defaults
    const hasInputs = loadSavedInputs();
    
    // Update all displays with currentData (either loaded or default)
    updateConfigInputs(); // Populate config panel inputs from currentData
    updateAllDisplays();  // Update header, pool stats etc.
    
    // Setup event listeners
    setupButtonEventListeners();
    setupStakingInputListeners();
    setupConfigInputListeners();
    
    // Auto-calculate if there are saved calculation inputs
    if (hasInputs && hasCalculationInputs()) {
        calculateRewards();
    }
    
    // Show welcome notification and auto-fetch data
    setTimeout(() => {
        const inputMessage = hasInputs ? 
            'APE Calculator loaded with your saved inputs! 💾' : 
            'APE Calculator loaded! Your inputs will be automatically saved. 🚀';
        showNotification(inputMessage, 'info');
        
        // Auto-fetch live data after a brief delay (only if data is older than 1 hour)
        const lastUpdated = localStorage.getItem('apeCalculatorLastUpdate');
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        
        if (!lastUpdated || parseInt(lastUpdated) < oneHourAgo) {
            setTimeout(() => {
                showNotification('Auto-fetching latest data... 🔄', 'info');
                fetchLiveData().then(success => {
                    if (success) {
                        localStorage.setItem('apeCalculatorLastUpdate', Date.now().toString());
                    }
                });
            }, 2000);
        }
    }, 1000);
}

// Run when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);
