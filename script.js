
Fix invalid assignment in script.js
Jun 7
keboqi/apestake
+67
-44

Archive

Share
View Pull Request


Uncaught SyntaxError: Invalid left-hand side in assignment (at script.js:119:5)
error line    domElements.apeInput?.value = currentInputs.apeAmount;
fix it
Copy
Summary

Updated assignments in the DOM update functions to avoid optional chaining on the left-hand side, ensuring safe checks for each element before assigning values or text content

Reworked the results display logic to guard every element assignment, preventing invalid left-hand side expressions when updating the UI

Removed the duplicate notification element declaration to clear remaining syntax issues

Testing

✅ node --check script.js


File (1)
auto fetched and updated cloudflare kv, but it doesn't update the values on page, and we want the place holder value on page is latest data from kv, not the hard coded values.
Copy
Notes

Updated updateConfigInputs so input placeholders reflect the latest data. This ensures values shown on the page match what is retrieved from Cloudflare KV rather than the hard‑coded HTML defaults.

Summary

Added placeholder updates alongside value assignments in updateConfigInputs so refreshed data is visible even when fields are cleared

Testing

✅ node --check script.js


File (1)
make sure the fetched values update the textboxes, they are now empty.
Copy
Notes

Fixed the empty textbox issue by referencing configuration inputs using their actual hyphenated IDs, ensuring fetched data correctly populates the page.

Summary

Updated updateConfigInputs to retrieve elements like 'config-bayc-daily' and update both their values and placeholders with the latest data

Testing

✅ node --check script.js


File (1)


Diff
Logs
script.js
+67
-44

@@ -94,102 +94,125 @@ function loadInputsFromLocalStorage() {
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

function updateDataStatus(source, timestamp) {
    if (domElements.dataSourceStatus) domElements.dataSourceStatus.textContent = source;
    if (domElements.lastUpdatedStatus) domElements.lastUpdatedStatus.textContent = timestamp;
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
@@ -426,74 +449,74 @@ function calculateIndividualRewards(inputs, data) {
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
