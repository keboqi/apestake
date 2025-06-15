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

// --- DOM Element Cache ---
const domElements = {};

// --- Constants ---
const DEBOUNCE_TIME_STAKING_INPUTS_MS = 500;
const DEBOUNCE_TIME_CONFIG_INPUTS_MS = 750;
// Note: DAYS_IN_MONTH and DAYS_IN_YEAR are already defined before calculateIndividualRewards

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
        apeAmount: parseFloat(domElements.apeInput.value) || 0,
        baycCount: parseInt(domElements.baycInput.value) || 0,
        maycCount: parseInt(domElements.maycInput.value) || 0,
        bakcCount: parseInt(domElements.bakcInput.value) || 0
    };
    
    currentInputs = inputs;
    return saveInputsToLocalStorage(inputs);
}

function loadSavedInputs() {
    const savedInputs = loadInputsFromLocalStorage();
    if (savedInputs) {
        currentInputs = savedInputs;
        updateCalculationInputs(); // Uses domElements internally now
        return true;
    }
    return false;
}

function updateCalculationInputs() {
    if (domElements.apeInput) domElements.apeInput.value = currentInputs.apeAmount;
    if (domElements.baycInput) domElements.baycInput.value = currentInputs.baycCount;
    if (domElements.maycInput) domElements.maycInput.value = currentInputs.maycCount;
    if (domElements.bakcInput) domElements.bakcInput.value = currentInputs.bakcCount;
}

// UI update functions
function updateAllDisplays() {
    // Update header stats
    if (domElements.headerApeApy) domElements.headerApeApy.textContent = `${currentData.ape.apy}%`;
    if (domElements.headerBaycApr) domElements.headerBaycApr.textContent = `${currentData.bayc.apr}%`;
    if (domElements.headerMaycApr) domElements.headerMaycApr.textContent = `${currentData.mayc.apr}%`;
    if (domElements.headerBakcApr) domElements.headerBakcApr.textContent = `${currentData.bakc.apr}%`;
    if (domElements.headerApePrice) domElements.headerApePrice.textContent = `$${currentData.apePrice.toFixed(4)}`;
    if (domElements.headerUsdCny) domElements.headerUsdCny.textContent = `${currentData.usdCnyRate.toFixed(4)}`;
    
    // Update pool stats
    if (domElements.apeApy) domElements.apeApy.textContent = `${currentData.ape.apy}%`;
    if (domElements.apeDailyRate) domElements.apeDailyRate.textContent = `${(currentData.ape.apy / DAYS_IN_YEAR).toFixed(4)}%`;
    
    if (domElements.baycDailyRewards) domElements.baycDailyRewards.textContent = `${currentData.bayc.dailyRewardsFull} APE`;
    if (domElements.baycApr) domElements.baycApr.textContent = `${currentData.bayc.apr}%`;
    
    if (domElements.maycDailyRewards) domElements.maycDailyRewards.textContent = `${currentData.mayc.dailyRewardsFull} APE`;
    if (domElements.maycApr) domElements.maycApr.textContent = `${currentData.mayc.apr}%`;
    
    if (domElements.bakcDailyRewards) domElements.bakcDailyRewards.textContent = `${currentData.bakc.dailyRewardsFull} APE`;
    if (domElements.bakcApr) domElements.bakcApr.textContent = `${currentData.bakc.apr}%`;
    
    // Update result display prices
    if (domElements.displayApePrice) domElements.displayApePrice.textContent = `$${currentData.apePrice.toFixed(4)}`;
    if (domElements.displayUsdCny) domElements.displayUsdCny.textContent = `${currentData.usdCnyRate.toFixed(4)}`;
}

function updateConfigInputs() {
    const apeApyInput = domElements['config-ape-apy'];
    const baycDailyInput = domElements['config-bayc-daily'];
    const maycDailyInput = domElements['config-mayc-daily'];
    const bakcDailyInput = domElements['config-bakc-daily'];
    const apePriceInput = domElements['config-ape-price'];
    const usdCnyInput = domElements['config-usd-cny'];

    if (apeApyInput) {
        apeApyInput.value = currentData.ape.apy;
        apeApyInput.placeholder = String(currentData.ape.apy);
    }
    if (baycDailyInput) {
        baycDailyInput.value = currentData.bayc.dailyRewardsFull;
        baycDailyInput.placeholder = String(currentData.bayc.dailyRewardsFull);
    }
    if (maycDailyInput) {
        maycDailyInput.value = currentData.mayc.dailyRewardsFull;
        maycDailyInput.placeholder = String(currentData.mayc.dailyRewardsFull);
    }
    if (bakcDailyInput) {
        bakcDailyInput.value = currentData.bakc.dailyRewardsFull;
        bakcDailyInput.placeholder = String(currentData.bakc.dailyRewardsFull);
    }
    if (apePriceInput) {
        apePriceInput.value = currentData.apePrice;
        apePriceInput.placeholder = String(currentData.apePrice);
    }
    if (usdCnyInput) {
        usdCnyInput.value = currentData.usdCnyRate;
        usdCnyInput.placeholder = String(currentData.usdCnyRate);
    }
}

function updateDataStatus(timestamp, individualSources = {}) {
    if (domElements.lastUpdatedStatus) domElements.lastUpdatedStatus.textContent = timestamp;

    const sourcesString = `APE Price: ${individualSources.apePrice || 'N/A'}, NFT Staking: ${individualSources.nftStaking || 'N/A'}, APY: ${individualSources.apeApy || 'N/A'}, USD/CNY: ${individualSources.usdCnyRate || 'N/A'}`;
    if (domElements.allSourcesStatus) domElements.allSourcesStatus.textContent = sourcesString;
}

function updateConfigSourceInfo(sources = {}) {
    if (domElements.configSourceApeApy) domElements.configSourceApeApy.textContent = `Source: ${sources.apeApy || 'N/A'}`;
    if (domElements.configSourceNft) domElements.configSourceNft.textContent = `Source: ${sources.nftStaking || 'N/A'}`;
    if (domElements.configSourceApePrice) domElements.configSourceApePrice.textContent = `APE Price: ${sources.apePrice || 'N/A'}`;
    if (domElements.configSourceUsdCny) domElements.configSourceUsdCny.textContent = `USD/CNY Rate: ${sources.usdCnyRate || 'N/A'}`;
}

// Notification system
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    // Base class 'notification' and type-specific class e.g., 'notification-info', 'notification-success', 'notification-error'
    notification.className = `notification notification-${type}`;
    notification.setAttribute('role', 'alert');

    const content = document.createElement('div');
    content.className = 'notification-content';

    const messageSpan = document.createElement('span');
    messageSpan.className = 'notification-message';
    messageSpan.textContent = message;

    const closeButton = document.createElement('button');
    closeButton.className = 'notification-close';
    closeButton.innerHTML = '&times;'; // Use innerHTML for HTML entity
    closeButton.setAttribute('aria-label', 'Close notification');
    closeButton.onclick = () => notification.remove();

    content.appendChild(messageSpan);
    content.appendChild(closeButton);
    notification.appendChild(content);
    
    // Ensure CSS for notifications is injected only once
    if (!document.getElementById('custom-notification-styles')) {
        const styleSheet = document.createElement('style');
        styleSheet.id = 'custom-notification-styles';
        styleSheet.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                color: white;
                padding: 1rem 1.5rem;
                border-radius: 12px; /* Consistent with original */
                box-shadow: var(--shadow-lg); /* Use existing CSS var */
                z-index: 9999;
                max-width: 400px;
                animation: notificationSlideIn 0.3s ease-out forwards;
                display: flex; /* For alignment of content */
                align-items: center; /* For alignment of content */
            }
            .notification-info {
                background: var(--gradient-primary); /* Use existing CSS var */
            }
            .notification-success {
                background: var(--gradient-success); /* Use existing CSS var */
            }
            .notification-error {
                background: var(--gradient-warning); /* Use existing CSS var */
            }
            @keyframes notificationSlideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            .notification-content {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 1rem;
                width: 100%; /* Ensure content fills notification */
            }
            .notification-message {
                flex-grow: 1; /* Allow message to take available space */
            }
            .notification-close {
                background: none;
                border: none;
                color: white;
                font-size: 1.5rem;
                cursor: pointer;
                padding: 0;
                line-height: 1;
                opacity: 0.8;
            }
            .notification-close:hover {
                opacity: 1;
            }
        `;
        document.head.appendChild(styleSheet);
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
                currentData = transformApiData(data);
                
                // Update all UI elements
                updateConfigInputs();
                updateAllDisplays();
                
                // Save to localStorage
                saveDataToLocalStorage(currentData);
                
                // Update status based on the actual sources from the API response
                let overallDataSource = 'Live Market Data'; // Default for successful fetch
                const sources = data.dataSources; // e.g., { apePrice: 'Live API Data', apeApy: 'KV Cache', ... }

                if (sources) {
                    // Define critical sources that determine the overall status
                    const criticalSourceValues = [
                        sources.apePrice,
                        sources.apeApy,
                        sources.nftStaking
                    ].filter(Boolean); // Filter out undefined if some sources are missing

                    if (criticalSourceValues.length > 0) { // Only if we have some source info
                        if (criticalSourceValues.some(s => s === 'Fallback Default')) {
                            overallDataSource = 'Using Default Market Data';
                        } else if (criticalSourceValues.some(s => s === 'KV Cache')) {
                            overallDataSource = 'Using Cached Market Data';
                        } else if (criticalSourceValues.every(s => s.includes('API') || s.includes('On-Chain'))) {
                            overallDataSource = 'Live Market Data';
                        } else {
                            // If sources are mixed (e.g. some API, some KV, but no Fallback Default)
                            // or if some sources are unexpected.
                            overallDataSource = 'Fetched Data (Mixed Sources)';
                        }
                    } else if (Object.keys(sources).length > 0 && criticalSourceValues.length === 0) {
                        // Non-critical sources might exist, but critical ones are missing/not reported
                        overallDataSource = 'Fetched Data (Partial)';
                    } else { // No source information at all
                        overallDataSource = 'Fetched Data (Source Info Missing)';
                    }
                } else { // data.dataSources object itself is missing
                    overallDataSource = 'Fetched Data (Source Info Missing)';
                }

                // updateDataSourceList(data.dataSources); // This line is removed
                updateConfigSourceInfo(data.dataSources);
                updateDataStatus(data.timestamp ? new Date(data.timestamp).toLocaleString() : new Date().toLocaleString(), sources);
                showNotification('✅ Data updated!', 'success'); // General success message
                
                // Auto-calculate if there are existing inputs
                if (hasCalculationInputs()) {
                    calculateRewards();
                }
                
                return true;
            } else {
                // Handle cases where data.success is false but API call was ok
                const apiErrorMessage = data.error || (data.fetchErrors && data.fetchErrors.join('; ')) || 'API indicated an issue with data sources.';
                console.error('API request successful, but data processing failed:', apiErrorMessage, data);
                showNotification(`❌ Failed to process live data: ${apiErrorMessage}. Using cached values.`, 'error');
                // Optionally, show more detailed errors if available in data.detailedStatus
                // logDetailedErrors(data.detailedStatus);
                return false;
            }
        } else {
            // Handle non-ok HTTP responses
            let errorInfo = `Server returned status ${response.status}.`;
            try {
                const errorData = await response.json();
                errorInfo = errorData.error || JSON.stringify(errorData);
            } catch (e) {
                // If parsing JSON fails, try to get text
                try {
                    errorInfo = await response.text();
                } catch (e2) { /* Keep the status code error */ }
            }
            console.error('Failed to fetch live data. Status:', response.status, errorInfo);
            showNotification(`❌ Failed to fetch live data: ${errorInfo.substring(0,100)}. Using cached values.`, 'error');
            return false;
        }
        
    } catch (error) { // Catch network errors or other unexpected issues with fetch itself
        console.error('Error fetching live data:', error);
        showNotification('❌ Network error or problem fetching live data. Check your connection. Using cached values.', 'error');
        return false;
    }
}

function transformApiData(apiData) {
    // Ensure APR values are numbers and handle potential NaN from parseFloat
    const parseApr = (apr) => {
        const num = parseFloat(apr);
        return isNaN(num) ? 0 : num; // Default to 0 if APR is not a valid number
    };

    return {
        ape: { apy: apiData.apeApy || 0 }, // Default to 0 if undefined
        bayc: {
            dailyRewardsFull: apiData.baycDaily || 0,
            apr: parseApr(apiData.baycApr)
        },
        mayc: {
            dailyRewardsFull: apiData.maycDaily || 0,
            apr: parseApr(apiData.maycApr)
        },
        bakc: {
            dailyRewardsFull: apiData.bakcDaily || 0,
            apr: parseApr(apiData.bakcApr)
        },
        apePrice: apiData.apePrice || 0,
        usdCnyRate: apiData.usdCnyRate || 0
    };
}

// Calculation functions
function calculateAPRFromDaily(dailyRewards, apeStaked) {
    if (apeStaked === 0) return 0;
    const annualRewards = dailyRewards * 365;
    return (annualRewards / apeStaked) * 100;
}

function hasCalculationInputs() {
    const apeAmount = domElements.apeInput ? (parseFloat(domElements.apeInput.value) || 0) : 0;
    const baycCount = domElements.baycInput ? (parseInt(domElements.baycInput.value) || 0) : 0;
    const maycCount = domElements.maycInput ? (parseInt(domElements.maycInput.value) || 0) : 0;
    const bakcCount = domElements.bakcInput ? (parseInt(domElements.bakcInput.value) || 0) : 0;
    
    return apeAmount > 0 || baycCount > 0 || maycCount > 0 || bakcCount > 0;
}

// --- Calculation Sub-functions ---

function getUserStakingInputs() {
    return {
        apeAmount: domElements.apeInput ? (parseFloat(domElements.apeInput.value) || 0) : 0,
        baycCount: domElements.baycInput ? (parseInt(domElements.baycInput.value) || 0) : 0,
        maycCount: domElements.maycInput ? (parseInt(domElements.maycInput.value) || 0) : 0,
        bakcCount: domElements.bakcInput ? (parseInt(domElements.bakcInput.value) || 0) : 0
    };
}

function calculateStakedAmounts(inputs) {
    const baycApeStaked = inputs.baycCount * APE_PER_NFT.bayc;
    const maycApeStaked = inputs.maycCount * APE_PER_NFT.mayc;
    const bakcApeStaked = inputs.bakcCount * APE_PER_NFT.bakc;
    const totalApeStaked = baycApeStaked + maycApeStaked + bakcApeStaked + inputs.apeAmount;
    return { baycApeStaked, maycApeStaked, bakcApeStaked, totalApeStaked };
}

const DAYS_IN_MONTH = 30; // Approximation for monthly calculations
const DAYS_IN_YEAR = 365;

function calculateIndividualRewards(inputs, data) {
    const apeDailyRewards = inputs.apeAmount * (data.ape.apy / DAYS_IN_YEAR / 100);
    const baycDailyRewards = data.bayc.dailyRewardsFull * inputs.baycCount;
    const maycDailyRewards = data.mayc.dailyRewardsFull * inputs.maycCount;
    const bakcDailyRewards = data.bakc.dailyRewardsFull * inputs.bakcCount;
    return { apeDailyRewards, baycDailyRewards, maycDailyRewards, bakcDailyRewards };
}

function calculateTotalRewards(individualRewards) {
    const totalDailyRewards = individualRewards.apeDailyRewards + individualRewards.baycDailyRewards + individualRewards.maycDailyRewards + individualRewards.bakcDailyRewards;
    const totalMonthlyRewards = totalDailyRewards * DAYS_IN_MONTH;
    const totalAnnualRewards = totalDailyRewards * DAYS_IN_YEAR;
    return { totalDailyRewards, totalMonthlyRewards, totalAnnualRewards };
}

function calculateFiatValues(rewards, apePrice, usdCnyRate) {
    const dailyUSD = rewards.totalDailyRewards * apePrice;
    const dailyCNY = dailyUSD * usdCnyRate;
    const monthlyUSD = rewards.totalMonthlyRewards * apePrice;
    const monthlyCNY = monthlyUSD * usdCnyRate;
    const annualUSD = rewards.totalAnnualRewards * apePrice;
    const annualCNY = annualUSD * usdCnyRate;
    return { dailyUSD, dailyCNY, monthlyUSD, monthlyCNY, annualUSD, annualCNY };
}

function updateResultsDisplay(inputs, stakedAmounts, individualRewards, totalRewards, fiatValues) {
    // Update APE staked breakdown
    if (domElements.baycApeStaked) domElements.baycApeStaked.textContent = `${stakedAmounts.baycApeStaked.toLocaleString()} APE`;
    if (domElements.maycApeStaked) domElements.maycApeStaked.textContent = `${stakedAmounts.maycApeStaked.toLocaleString()} APE`;
    if (domElements.bakcApeStaked) domElements.bakcApeStaked.textContent = `${stakedAmounts.bakcApeStaked.toLocaleString()} APE`;
    if (domElements.directApeStaked) domElements.directApeStaked.textContent = `${inputs.apeAmount.toLocaleString()} APE`;
    if (domElements.totalApeStaked) domElements.totalApeStaked.textContent = `${stakedAmounts.totalApeStaked.toLocaleString()} APE`;

    // Update breakdown for each pool (updatePoolBreakdown uses domElements internally too)
    updatePoolBreakdown('ape', inputs.apeAmount, individualRewards.apeDailyRewards, inputs.apeAmount > 0, 'APE staked');
    updatePoolBreakdown('bayc', inputs.baycCount, individualRewards.baycDailyRewards, inputs.baycCount > 0, 'NFTs staked');
    updatePoolBreakdown('mayc', inputs.maycCount, individualRewards.maycDailyRewards, inputs.maycCount > 0, 'NFTs staked');
    updatePoolBreakdown('bakc', inputs.bakcCount, individualRewards.bakcDailyRewards, inputs.bakcCount > 0, 'NFTs staked');

    // Update the total results
    if (domElements.dailyRewards) domElements.dailyRewards.textContent = `${totalRewards.totalDailyRewards.toFixed(4)} APE`;
    if (domElements.monthlyRewards) domElements.monthlyRewards.textContent = `${totalRewards.totalMonthlyRewards.toFixed(2)} APE`;
    if (domElements.annualRewards) domElements.annualRewards.textContent = `${totalRewards.totalAnnualRewards.toFixed(2)} APE`;

    // Update USD and CNY values
    if (domElements.dailyUsd) domElements.dailyUsd.textContent = `$${fiatValues.dailyUSD.toFixed(2)}`;
    if (domElements.dailyCny) domElements.dailyCny.textContent = `¥${fiatValues.dailyCNY.toFixed(2)}`;
    if (domElements.monthlyUsd) domElements.monthlyUsd.textContent = `$${fiatValues.monthlyUSD.toFixed(2)}`;
    if (domElements.monthlyCny) domElements.monthlyCny.textContent = `¥${fiatValues.monthlyCNY.toFixed(2)}`;
    if (domElements.annualUsd) domElements.annualUsd.textContent = `$${fiatValues.annualUSD.toFixed(2)}`;
    if (domElements.annualCny) domElements.annualCny.textContent = `¥${fiatValues.annualCNY.toFixed(2)}`;

    // Show the results container
    domElements.resultsContainer?.classList.remove('hidden');
}


// --- Main Calculation Function ---
function calculateRewards() {
    const userInputs = getUserStakingInputs();
    saveCurrentInputs(); // Save these inputs to localStorage and currentInputs variable

    const stakedAmounts = calculateStakedAmounts(userInputs);
    const individualRewards = calculateIndividualRewards(userInputs, currentData);
    const totalRewards = calculateTotalRewards(individualRewards);
    const fiatValues = calculateFiatValues(totalRewards, currentData.apePrice, currentData.usdCnyRate);

    updateResultsDisplay(userInputs, stakedAmounts, individualRewards, totalRewards, fiatValues);
}


function updatePoolBreakdown(poolName, inputAmount, dailyRewards, shouldShow, unit) {
    const breakdownElement = domElements[`${poolName}Breakdown`];
    const detailsElement = domElements[`${poolName}BreakdownDetails`];
    const dailyElement = domElements[`${poolName}DailyBreakdown`];
    const monthlyElement = domElements[`${poolName}MonthlyBreakdown`];
    const annualElement = domElements[`${poolName}AnnualBreakdown`];
    
    if (!breakdownElement || !detailsElement || !dailyElement || !monthlyElement || !annualElement) {
        console.warn(`DOM elements for ${poolName} breakdown not found.`);
        return;
    }

    if (shouldShow) {
        breakdownElement.classList.remove('hidden');
        if (poolName === 'ape') {
            detailsElement.textContent = `${inputAmount.toLocaleString()} ${unit}`;
        } else {
            detailsElement.textContent = `${inputAmount} ${unit}`;
        }
        dailyElement.textContent = `${dailyRewards.toFixed(4)} APE`;
        monthlyElement.textContent = `${(dailyRewards * DAYS_IN_MONTH).toFixed(2)} APE`;
        annualElement.textContent = `${(dailyRewards * DAYS_IN_YEAR).toFixed(2)} APE`;
    } else {
        breakdownElement.classList.add('hidden');
    }
}

// Listener setup for staking inputs (APE amount, NFT counts)
function setupStakingInputListeners() {
    const stakingInputs = [
        domElements.apeInput, domElements.baycInput,
        domElements.maycInput, domElements.bakcInput
    ];
    let debounceTimeoutId;

    stakingInputs.forEach(inputElement => { // Renamed 'input' to 'inputElement' for clarity
        if (!inputElement) return;

        inputElement.addEventListener('input', function() {
            if (this.value < 0) this.value = 0;
            // Ensure 'ape-input' allows decimals, others are integers
            if (this.id !== domElements.apeInput.id) {
                this.value = Math.floor(this.value);
            }
        });
        
        inputElement.addEventListener('input', function() {
            clearTimeout(debounceTimeoutId);
            debounceTimeoutId = setTimeout(() => {
                saveCurrentInputs();
                calculateRewards();
            }, DEBOUNCE_TIME_STAKING_INPUTS_MS);
        });
    });
}

// Listener setup for configuration panel inputs
function setupConfigInputListeners() {
    const configMapping = {
        'config-ape-apy': {
            path: ['ape', 'apy'],
            defaultPath: ['ape', 'apy'],
            isNumeric: true
        },
        'config-bayc-daily': {
            path: ['bayc', 'dailyRewardsFull'],
            defaultPath: ['bayc', 'dailyRewardsFull'],
            dependentAprConfig: { path: ['bayc', 'apr'], nftKey: 'bayc' },
            isNumeric: true
        },
        'config-mayc-daily': {
            path: ['mayc', 'dailyRewardsFull'],
            defaultPath: ['mayc', 'dailyRewardsFull'],
            dependentAprConfig: { path: ['mayc', 'apr'], nftKey: 'mayc' },
            isNumeric: true
        },
        'config-bakc-daily': {
            path: ['bakc', 'dailyRewardsFull'],
            defaultPath: ['bakc', 'dailyRewardsFull'],
            dependentAprConfig: { path: ['bakc', 'apr'], nftKey: 'bakc' },
            isNumeric: true
        },
        'config-ape-price': {
            path: ['apePrice'],
            defaultPath: ['apePrice'],
            isNumeric: true
        },
        'config-usd-cny': {
            path: ['usdCnyRate'],
            defaultPath: ['usdCnyRate'],
            isNumeric: true
        }
    };

    Object.keys(configMapping).forEach(id => {
        const inputElement = domElements[id]; // Use the ID directly as cached in cacheDomElements

        if (!inputElement) {
            console.warn(`Configuration input element not found in domElements: ${id}`);
            return;
        }

        let debounceTimeoutId;

        if (configMapping[id].isNumeric) {
            inputElement.addEventListener('input', function() {
                if (this.value < 0) this.value = 0;
            });
        }

        inputElement.addEventListener('input', function() {
            clearTimeout(debounceTimeoutId);
            debounceTimeoutId = setTimeout(() => {
                const config = configMapping[this.id];
                let valueToSet;

                if (config.isNumeric) {
                    const parsedValue = parseFloat(this.value);
                    valueToSet = isNaN(parsedValue) ? getValueByPath(DEFAULT_DATA, config.defaultPath) : parsedValue;
                } else {
                    valueToSet = this.value;
                }

                setValueByPath(currentData, config.path, valueToSet);

                if (config.dependentAprConfig) {
                    const dailyRewardsValue = valueToSet;
                    const newApr = calculateAPRFromDaily(dailyRewardsValue, APE_PER_NFT[config.dependentAprConfig.nftKey]);
                    setValueByPath(currentData, config.dependentAprConfig.path, newApr);
                }

                if (saveDataToLocalStorage(currentData)) {
                    updateDataStatus(new Date().toLocaleString(), currentData.dataSources || { apePrice: 'N/A', nftStaking: 'N/A', apeApy: 'N/A', usdCnyRate: 'N/A' });
                    updateAllDisplays();
                    if (hasCalculationInputs()) calculateRewards();
                } else {
                    showNotification('Error saving updated configuration data.', 'error');
                }
            }, DEBOUNCE_TIME_CONFIG_INPUTS_MS);
        });
    });
}

// Helper functions for nested object property access (can be moved to a utility section if needed)
function setValueByPath(obj, path, value) {
    let current = obj;
    for (let i = 0; i < path.length - 1; i++) {
        if (!current[path[i]]) current[path[i]] = {}; // Create path if it doesn't exist
        current = current[path[i]];
    }
    current[path[path.length - 1]] = value;
}

function getValueByPath(obj, path) {
    return path.reduce((acc, part) => acc && acc[part], obj);
}


// Event listeners setup for buttons
function setupButtonEventListeners() {
    domElements.autoFetchButton?.addEventListener('click', fetchLiveData);
    // Other buttons were removed, so their listeners are not needed.
}

// --- Initialization Sub-functions ---

function cacheDomElements() {
    // Staking Inputs
    domElements.apeInput = document.getElementById('ape-input');
    domElements.baycInput = document.getElementById('bayc-input');
    domElements.maycInput = document.getElementById('mayc-input');
    domElements.bakcInput = document.getElementById('bakc-input');

    // Header Stats
    domElements.headerApeApy = document.getElementById('header-ape-apy');
    domElements.headerBaycApr = document.getElementById('header-bayc-apr');
    domElements.headerMaycApr = document.getElementById('header-mayc-apr');
    domElements.headerBakcApr = document.getElementById('header-bakc-apr');
    domElements.headerApePrice = document.getElementById('header-ape-price');
    domElements.headerUsdCny = document.getElementById('header-usd-cny');

    // Pool Stats
    domElements.apeApy = document.getElementById('ape-apy');
    domElements.apeDailyRate = document.getElementById('ape-daily-rate');
    domElements.baycDailyRewards = document.getElementById('bayc-daily-rewards');
    domElements.baycApr = document.getElementById('bayc-apr');
    domElements.maycDailyRewards = document.getElementById('mayc-daily-rewards');
    domElements.maycApr = document.getElementById('mayc-apr');
    domElements.bakcDailyRewards = document.getElementById('bakc-daily-rewards');
    domElements.bakcApr = document.getElementById('bakc-apr');

    // Result Display Prices
    domElements.displayApePrice = document.getElementById('display-ape-price');
    domElements.displayUsdCny = document.getElementById('display-usd-cny');

    // Config Inputs (using original IDs as keys for direct mapping in setupConfigInputListeners)
    const configIds = [
        'config-ape-apy', 'config-bayc-daily', 'config-mayc-daily',
        'config-bakc-daily', 'config-ape-price', 'config-usd-cny'
    ];
    configIds.forEach(id => domElements[id] = document.getElementById(id));


    // Data Status
    domElements.lastUpdatedStatus = document.getElementById('last-updated-status');
    domElements.allSourcesStatus = document.getElementById('all-sources-status');

    // Config panel source info
    domElements.configSourceApeApy = document.getElementById('config-source-ape-apy');
    domElements.configSourceNft = document.getElementById('config-source-nft');
    domElements.configSourceApePrice = document.getElementById('config-source-ape-price');
    domElements.configSourceUsdCny = document.getElementById('config-source-usd-cny');

    // Results Container & Breakdown
    domElements.resultsContainer = document.getElementById('results-container'); // Cached
    domElements.baycApeStaked = document.getElementById('bayc-ape-staked');
    domElements.maycApeStaked = document.getElementById('mayc-ape-staked');
    domElements.bakcApeStaked = document.getElementById('bakc-ape-staked');
    domElements.directApeStaked = document.getElementById('direct-ape-staked');
    domElements.totalApeStaked = document.getElementById('total-ape-staked');

    // Pool Breakdown sections
    ['ape', 'bayc', 'mayc', 'bakc'].forEach(pool => {
        domElements[`${pool}Breakdown`] = document.getElementById(`${pool}-breakdown`);
        domElements[`${pool}BreakdownDetails`] = document.getElementById(`${pool}-breakdown-details`);
        domElements[`${pool}DailyBreakdown`] = document.getElementById(`${pool}-daily-breakdown`);
        domElements[`${pool}MonthlyBreakdown`] = document.getElementById(`${pool}-monthly-breakdown`);
        domElements[`${pool}AnnualBreakdown`] = document.getElementById(`${pool}-annual-breakdown`);
    });

    // Total Rewards
    domElements.dailyRewards = document.getElementById('daily-rewards');
    domElements.monthlyRewards = document.getElementById('monthly-rewards');
    domElements.annualRewards = document.getElementById('annual-rewards');
    domElements.dailyUsd = document.getElementById('daily-usd');
    domElements.dailyCny = document.getElementById('daily-cny');
    domElements.monthlyUsd = document.getElementById('monthly-usd');
    domElements.monthlyCny = document.getElementById('monthly-cny');
    domElements.annualUsd = document.getElementById('annual-usd');
    domElements.annualCny = document.getElementById('annual-cny');

    // Buttons
    domElements.autoFetchButton = document.getElementById('auto-fetch-btn');
}


function loadInitialData() {
    const savedData = loadDataFromLocalStorage();
    if (savedData) {
        currentData = savedData;
        const ts = currentData.timestamp ? new Date(currentData.timestamp).toLocaleString() : 'Loaded from cache';
        updateDataStatus(ts, currentData.dataSources || { apePrice: 'N/A', nftStaking: 'N/A', apeApy: 'N/A', usdCnyRate: 'N/A' });
        // updateDataSourceList(); // This line is removed
        updateConfigSourceInfo(currentData.dataSources || {}); // Pass sources to config info
    } else {
        currentData = { ...DEFAULT_DATA }; // Use hardcoded defaults
        updateDataStatus('Defaults loaded', { apePrice: 'N/A', nftStaking: 'N/A', apeApy: 'N/A', usdCnyRate: 'N/A' });
        // updateDataSourceList(); // This line is removed
        updateConfigSourceInfo({}); // Pass empty sources for defaults
    }
}

function loadInitialInputs() {
    // loadSavedInputs() already updates currentInputs and UI fields
    return loadSavedInputs();
}

function setupAllEventListeners() {
    setupButtonEventListeners();
    setupStakingInputListeners();
    setupConfigInputListeners();
}

function performInitialUIDisplayAndCalculations(hasInputs) {
    updateConfigInputs(); // Populate config panel inputs from currentData
    updateAllDisplays();  // Update header, pool stats etc.

    // Auto-calculate if there are saved calculation inputs
    if (hasInputs && hasCalculationInputs()) { // hasCalculationInputs checks current DOM values
        calculateRewards();
    }
}

const AUTO_FETCH_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const WELCOME_MESSAGE_DELAY_MS = 1000;
const AUTO_FETCH_DELAY_MS = 2000; // Delay after welcome message

function initiateDelayedAutoFetch(hasInputs) {
    setTimeout(() => {
        const inputMessage = hasInputs ? 
            'APE Calculator loaded with your saved inputs! 💾' : 
            'APE Calculator loaded! Your inputs will be automatically saved. 🚀';
        showNotification(inputMessage, 'info');
        
        const lastUpdated = localStorage.getItem('apeCalculatorLastUpdate');
        const now = Date.now();
        
        if (!lastUpdated || (now - parseInt(lastUpdated)) > AUTO_FETCH_INTERVAL_MS) {
            setTimeout(() => {
                // showNotification('Auto-fetching latest data... 🔄', 'info'); // fetchLiveData shows its own notification
                fetchLiveData().then(success => {
                    if (success) {
                        localStorage.setItem('apeCalculatorLastUpdate', now.toString());
                    }
                });
            }, AUTO_FETCH_DELAY_MS);
        }
    }, WELCOME_MESSAGE_DELAY_MS);
}

// --- Main Initialization Function ---
function initializeApp() {
    cacheDomElements(); // Cache all DOM elements first
    loadInitialData();
    const inputsWereLoaded = loadInitialInputs();

    setupAllEventListeners();
    performInitialUIDisplayAndCalculations(inputsWereLoaded);

    // Fetch fresh data once when the page loads
    fetchLiveData();
}

// Run when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);
