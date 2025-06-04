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

function saveDefaultsToLocalStorage() {
    const newDefaults = {
        ape: { apy: parseFloat(document.getElementById('config-ape-apy').value) || DEFAULT_DATA.ape.apy },
        bayc: { 
            dailyRewardsFull: parseFloat(document.getElementById('config-bayc-daily').value) || DEFAULT_DATA.bayc.dailyRewardsFull,
            apr: DEFAULT_DATA.bayc.apr 
        },
        mayc: { 
            dailyRewardsFull: parseFloat(document.getElementById('config-mayc-daily').value) || DEFAULT_DATA.mayc.dailyRewardsFull,
            apr: DEFAULT_DATA.mayc.apr 
        },
        bakc: { 
            dailyRewardsFull: parseFloat(document.getElementById('config-bakc-daily').value) || DEFAULT_DATA.bakc.dailyRewardsFull,
            apr: DEFAULT_DATA.bakc.apr 
        },
        apePrice: parseFloat(document.getElementById('config-ape-price').value) || DEFAULT_DATA.apePrice,
        usdCnyRate: parseFloat(document.getElementById('config-usd-cny').value) || DEFAULT_DATA.usdCnyRate
    };
    
    // Update DEFAULT_DATA
    Object.assign(DEFAULT_DATA, newDefaults);
    
    // Save as custom defaults
    localStorage.setItem('apeCalculatorDefaults', JSON.stringify(newDefaults));
    
    showNotification('New default values saved successfully! 🎉', 'success');
}

function loadCustomDefaults() {
    try {
        const saved = localStorage.getItem('apeCalculatorDefaults');
        if (saved) {
            const parsedDefaults = JSON.parse(saved);
            Object.assign(DEFAULT_DATA, parsedDefaults);
            return true;
        }
    } catch (error) {
        console.error('Error loading custom defaults:', error);
    }
    return false;
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
        
        // Try comprehensive fetch-data API first (uses all real APIs)
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
            }
        }
        
        // Try simple-fetch as backup if fetch-data fails
        response = await fetch('/api/simple-fetch');
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
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
                updateConfigInputs();
                updateAllDisplays();
                saveDataToLocalStorage(currentData);
                updateDataStatus(data.dataSource || 'Simple API', new Date().toLocaleString());
                showNotification('✅ Data updated from backup API!', 'success');
                
                if (hasCalculationInputs()) {
                    calculateRewards();
                }
                return true;
            }
        }
        
        // Fallback to individual API calls
        return await fetchDataFallback();
        
    } catch (error) {
        console.error('Error fetching live data:', error);
        showNotification('❌ Failed to fetch live data. Using fallback...', 'warning');
        return await fetchDataFallback();
    }
}

async function fetchDataFallback() {
    try {
        const updates = {};
        let hasUpdates = false;
        
        // Try our local API endpoints first to avoid CORS issues
        try {
            const localApeResponse = await fetch('/api/ape-staking');
            if (localApeResponse.ok) {
                const localApeData = await localApeResponse.json();
                if (localApeData.success && localApeData.apeApy) {
                    updates.apeApy = localApeData.apeApy;
                    hasUpdates = true;
                }
            }
        } catch (error) {
            console.error('Error fetching from local APE staking API:', error);
        }

        // Try local NFT staking API
        try {
            const localNftResponse = await fetch('/api/nft-staking');
            if (localNftResponse.ok) {
                const localNftData = await localNftResponse.json();
                if (localNftData.bayc || localNftData.mayc || localNftData.bakc) {
                    if (localNftData.bayc) {
                        updates.bayc = {
                            dailyRewardsFull: localNftData.bayc.dailyRewards,
                            apr: localNftData.bayc.apr
                        };
                    }
                    if (localNftData.mayc) {
                        updates.mayc = {
                            dailyRewardsFull: localNftData.mayc.dailyRewards,
                            apr: localNftData.mayc.apr
                        };
                    }
                    if (localNftData.bakc) {
                        updates.bakc = {
                            dailyRewardsFull: localNftData.bakc.dailyRewards,
                            apr: localNftData.bakc.apr
                        };
                    }
                    hasUpdates = true;
                }
            }
        } catch (error) {
            console.error('Error fetching from local NFT staking API:', error);
        }

        // Only try external APIs if local ones failed
        if (!hasUpdates) {
            // Fetch APE price from CryptoRates.ai API (CORS-friendly)
            try {
                const apeResponse = await fetch('https://cryptorates.ai/v1/get/APE');
                if (apeResponse.ok) {
                    const apeData = await apeResponse.json();
                    if (apeData.price && typeof apeData.price === 'number') {
                        updates.apePrice = parseFloat(apeData.price.toFixed(4));
                        hasUpdates = true;
                    }
                }
            } catch (error) {
                console.error('Error fetching APE price from CryptoRates.ai:', error);
                
                // Fallback to CoinMarketCap if CryptoRates.ai fails
                try {
                    const cmcResponse = await fetch('https://api.coinmarketcap.com/data-api/v3/cryptocurrency/detail/lite?id=18876');
                    if (cmcResponse.ok) {
                        const cmcData = await cmcResponse.json();
                        const price = cmcData?.data?.statistics?.price;
                        if (price && typeof price === 'number') {
                            updates.apePrice = parseFloat(price.toFixed(4));
                            hasUpdates = true;
                        }
                    }
                } catch (cmcError) {
                    console.error('Error fetching APE price from CoinMarketCap fallback:', cmcError);
                }
            }
            
            // Fetch USD/CNY rate
            try {
                const exchangeResponse = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
                if (exchangeResponse.ok) {
                    const exchangeData = await exchangeResponse.json();
                    if (exchangeData.rates?.CNY) {
                        updates.usdCnyRate = exchangeData.rates.CNY;
                        hasUpdates = true;
                    }
                }
            } catch (error) {
                console.error('Error fetching exchange rate:', error);
            }
        }
        
        if (hasUpdates) {
            // Apply updates to current data
            Object.assign(currentData, updates);
            
            // Update UI
            updateConfigInputs();
            updateAllDisplays();
            saveDataToLocalStorage(currentData);
            
            updateDataStatus('Partial Live Data', new Date().toLocaleString());
            showNotification('⚠️ Partial data updated from available sources', 'warning');
            
            if (hasCalculationInputs()) {
                calculateRewards();
            }
            
            return true;
        }
        
        showNotification('❌ Could not fetch any live data. Check your internet connection.', 'error');
        return false;
        
    } catch (error) {
        console.error('Error in fallback data fetch:', error);
        showNotification('❌ All data sources unavailable. Using cached values.', 'error');
        return false;
    }
}

async function fetchApeStakingData() {
    try {
        const response = await fetch('/api/ape-staking');
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.apeApy) {
                currentData.ape.apy = data.apeApy;
                return data.apeApy;
            }
        }
    } catch (error) {
        console.error('Error fetching APE staking data:', error);
    }
    return null;
}

async function fetchNftStakingData() {
    try {
        const response = await fetch('/api/nft-staking');
        if (response.ok) {
            const data = await response.json();
            if (data.success || data.bayc || data.mayc || data.bakc) {
                // Updated to work with new API response structure
                if (data.bayc) {
                    currentData.bayc.dailyRewardsFull = data.bayc.dailyRewards;
                    currentData.bayc.apr = data.bayc.apr;
                }
                if (data.mayc) {
                    currentData.mayc.dailyRewardsFull = data.mayc.dailyRewards;
                    currentData.mayc.apr = data.mayc.apr;
                }
                if (data.bakc) {
                    currentData.bakc.dailyRewardsFull = data.bakc.dailyRewards;
                    currentData.bakc.apr = data.bakc.apr;
                }
                return data;
            }
        }
    } catch (error) {
        console.error('Error fetching NFT staking data:', error);
    }
    return null;
}

// Data update functions
function updateDataFromInputs() {
    const newData = {
        ape: { 
            apy: parseFloat(document.getElementById('config-ape-apy').value) || currentData.ape.apy 
        },
        bayc: { 
            dailyRewardsFull: parseFloat(document.getElementById('config-bayc-daily').value) || currentData.bayc.dailyRewardsFull,
            apr: currentData.bayc.apr // Keep existing APR
        },
        mayc: { 
            dailyRewardsFull: parseFloat(document.getElementById('config-mayc-daily').value) || currentData.mayc.dailyRewardsFull,
            apr: currentData.mayc.apr // Keep existing APR
        },
        bakc: { 
            dailyRewardsFull: parseFloat(document.getElementById('config-bakc-daily').value) || currentData.bakc.dailyRewardsFull,
            apr: currentData.bakc.apr // Keep existing APR
        },
        apePrice: parseFloat(document.getElementById('config-ape-price').value) || currentData.apePrice,
        usdCnyRate: parseFloat(document.getElementById('config-usd-cny').value) || currentData.usdCnyRate
    };
    
    // Calculate APR for NFT pools based on daily rewards
    newData.bayc.apr = calculateAPRFromDaily(newData.bayc.dailyRewardsFull, APE_PER_NFT.bayc);
    newData.mayc.apr = calculateAPRFromDaily(newData.mayc.dailyRewardsFull, APE_PER_NFT.mayc);
    newData.bakc.apr = calculateAPRFromDaily(newData.bakc.dailyRewardsFull, APE_PER_NFT.bakc);
    
    currentData = newData;
    
    // Save to localStorage
    if (saveDataToLocalStorage(currentData)) {
        updateAllDisplays();
        updateDataStatus('Manual Input', new Date().toLocaleString());
        showNotification('Data updated successfully! 📊', 'success');
        
        // Auto-calculate if there are existing inputs
        if (hasCalculationInputs()) {
            calculateRewards();
        }
    } else {
        showNotification('Failed to save data. Please try again.', 'error');
    }
}

function resetToDefaults() {
    currentData = { ...DEFAULT_DATA };
    updateConfigInputs();
    updateAllDisplays();
    updateDataStatus('Default Values', 'System Default');
    
    // Save to localStorage
    saveDataToLocalStorage(currentData);
    
    showNotification('Data reset to default values! 🔄', 'info');
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

// Input validation
function setupInputValidation() {
    const inputs = document.querySelectorAll('input[type="number"]');
    inputs.forEach(input => {
        input.addEventListener('input', function() {
            // For APE input, allow decimal values
            if (this.id === 'ape-input' || this.id.includes('config-ape-price') || this.id.includes('config-usd-cny') || this.id.includes('config-ape-apy') || this.id.includes('daily')) {
                if (this.value < 0) this.value = 0;
                // Allow decimal values
            } else {
                // For NFT counts, ensure non-negative integer values
                if (this.value < 0) this.value = 0;
                this.value = Math.floor(this.value);
            }
        });
        
        // Auto-calculate on input change (debounced) and save inputs
        let timeoutId;
        input.addEventListener('input', function() {
            if (this.id.includes('ape-input') || this.id.includes('bayc-input') || 
                this.id.includes('mayc-input') || this.id.includes('bakc-input')) {
                
                // Save inputs on every change
                saveCurrentInputs();
                
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    if (hasCalculationInputs()) {
                        calculateRewards();
                    }
                }, 500);
            }
        });
    });
}

// Event listeners setup
function setupEventListeners() {
    // Data configuration buttons
    document.getElementById('update-data-btn').addEventListener('click', updateDataFromInputs);
    document.getElementById('reset-data-btn').addEventListener('click', resetToDefaults);
    document.getElementById('save-defaults-btn').addEventListener('click', saveDefaultsToLocalStorage);
    
    // Auto-fetch button
    document.getElementById('auto-fetch-btn').addEventListener('click', fetchLiveData);
    
    // Calculate button
    document.getElementById('calculate-btn').addEventListener('click', calculateRewards);
    
    // Setup input validation
    setupInputValidation();
}

// Initialization
function initializeApp() {
    // Load custom defaults if available
    loadCustomDefaults();
    
    // Load saved data or use defaults
    const savedData = loadDataFromLocalStorage();
    if (savedData) {
        currentData = savedData;
        updateDataStatus('Saved Data', 'Loaded from browser storage');
    } else {
        currentData = { ...DEFAULT_DATA };
        updateDataStatus('Default Values', 'System Default');
    }
    
    // Load saved inputs or use defaults
    const hasInputs = loadSavedInputs();
    
    // Update all displays
    updateConfigInputs();
    updateAllDisplays();
    
    // Setup event listeners
    setupEventListeners();
    
    // Auto-calculate if there are saved inputs
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