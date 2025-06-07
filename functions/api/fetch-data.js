// Cloudflare Function to fetch APE staking data from real APIs

// Helper function to decode the ABI-encoded hex string from getAllStakes
function decodeGetAllStakesResponse(hexString) {
  if (hexString.startsWith('0x')) {
    hexString = hexString.substring(2);
  }

  // The first 32 bytes (64 hex chars) are the offset to the array data.
  // For a tightly packed array like this, it's typically 0x20 (32 bytes),
  // meaning the length and data follow immediately.
  // const offset = parseInt(hexString.substring(0, 64), 16); // Not strictly needed if data is contiguous

  // The next 32 bytes (64 hex chars) are the array length.
  // This starts at index 64 (after the offset field).
  const arrayLengthHex = hexString.substring(64, 128);
  const arrayLength = parseInt(arrayLengthHex, 16);

  const decodedStakes = [];
  // Each struct (DashboardStake) has 5 uint256 fields, so 5 * 32 bytes = 160 bytes = 320 hex characters.
  const structHexLength = 5 * 64;
  // The actual array data starts after the offset and length fields (i.e., after the first 64+64 = 128 characters)
  let currentPosition = 128;

  for (let i = 0; i < arrayLength; i++) {
    const poolIdHex = hexString.substring(currentPosition, currentPosition + 64);
    const tokenIdHex = hexString.substring(currentPosition + 64, currentPosition + 128);
    const depositedHex = hexString.substring(currentPosition + 128, currentPosition + 192);
    const unclaimedHex = hexString.substring(currentPosition + 192, currentPosition + 256);
    const rewards24HrsHex = hexString.substring(currentPosition + 256, currentPosition + 320);

    decodedStakes.push({
      poolId: parseInt(poolIdHex, 16),
      tokenId: parseInt(tokenIdHex, 16),
      deposited: BigInt('0x' + depositedHex).toString(), // Store as string for JSON compatibility if needed
      unclaimed: BigInt('0x' + unclaimedHex).toString(),
      rewards24Hrs: BigInt('0x' + rewards24HrsHex).toString(),
    });

    currentPosition += structHexLength;
  }

  return decodedStakes;
}

export async function onRequest(context) {
  // Handle CORS preflight
  if (context.request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  try {
    const results = {}; // This will eventually be populated from statusDetails
    // let apeApySource = 'Fallback'; // REMOVED - Replaced by statusDetails.apeApy.source

    // Initialize structures for detailed status reporting and error collection
    let statusDetails = {
      apePrice: { source: 'Fallback', value: null, error: null },
      usdCnyRate: { source: 'Fallback', value: null, error: null },
      apeApy: { source: 'Fallback', value: null, error: null },
      bayc: { source: 'Fallback', daily: null, apr: null, error: null },
      mayc: { source: 'Fallback', daily: null, apr: null, error: null },
      bakc: { source: 'Fallback', daily: null, apr: null, error: null }
    };
    let fetchErrors = [];

    // Define constants that might be used in multiple places
    const APECHAIN_RPC_URL = 'https://apechain.calderachain.xyz/http';
    const STAKING_CONTRACT_ADDRESS = '0x4ba2396086d52ca68a37d9c0fa364286e9c7835a';
    const GET_ALL_STAKES_CALL_DATA = '0xd42a6eeb000000000000000000000000ea4b9b75cd563a9e003bb9c16bb7a963d2fdc750000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000300000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000300000000000000000000000000000000000000000000000000000000000000030000000000000000000000000000000000000000000000000000000000001c670000000000000000000000000000000000000000000000000000000000005fde0000000000000000000000000000000000000000000000000000000000001c6700000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000001';
    
    // Fetch APE price from CryptoRates.ai API (CORS-friendly)
    try {
      const apeResponse = await fetch('https://cryptorates.ai/v1/get/APE');
      if (apeResponse.ok) {
        const apeData = await apeResponse.json();
        if (apeData.price && typeof apeData.price === 'number') {
          statusDetails.apePrice.value = parseFloat(apeData.price.toFixed(4));
          statusDetails.apePrice.source = 'CryptoRates.ai API';
          statusDetails.apePrice.error = null;
        } else {
          throw new Error("Invalid data format from CryptoRates.ai");
        }
      } else {
        throw new Error(`CryptoRates.ai API fetch failed with status: ${apeResponse.status}`);
      }
    } catch (error) {
      const errorMsg = `APE Price fetch failed: ${error.message}`;
      statusDetails.apePrice.error = errorMsg;
      if (!fetchErrors.includes(errorMsg)) fetchErrors.push(errorMsg);
    }
    if (statusDetails.apePrice.value === null) {
      statusDetails.apePrice.value = 0.7463; // Default fallback
      statusDetails.apePrice.source = 'Fallback Default';
    }

    // --- Start NFT Data Fetching ---
    let onChainNftSuccess = false;
    let foundBaycOnChain = false;
    let foundMaycOnChain = false;
    let foundBakcOnChain = false;

    try { // 1. Primary: ApeChain On-Chain (`getAllStakes`)
      const payload = {
        jsonrpc: '2.0',
        id: 2, // Distinct ID
        method: 'eth_call',
        params: [{ to: STAKING_CONTRACT_ADDRESS, data: GET_ALL_STAKES_CALL_DATA }, 'latest']
      };
      const response = await fetch(APECHAIN_RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error(`On-chain NFT fetch failed with status: ${response.status}`);

      const responseData = await response.json();
      if (!responseData.result || responseData.result === "0x" || responseData.result === "0x0000000000000000000000000000000000000000000000000000000000000000") {
        throw new Error("Empty or invalid result from on-chain NFT call.");
      }

      const stakes = decodeGetAllStakesResponse(responseData.result);

      for (const stake of stakes) {
        const poolId = stake.poolId;
        const depositedBI = BigInt(stake.deposited);
        const rewards24HrsBI = BigInt(stake.rewards24Hrs);
        const dailyRewardApe = Number(rewards24HrsBI * 100n / (10n ** 18n)) / 100;
        let apr = 0;
        if (depositedBI > 0n) {
          const dailyRateForAPR = Number(rewards24HrsBI * 1000000n / depositedBI);
          apr = (dailyRateForAPR * 365) / 10000;
        }

        if (poolId === 1) { // BAYC
          statusDetails.bayc = { daily: parseFloat(dailyRewardApe.toFixed(2)), apr: parseFloat(apr.toFixed(2)), source: 'ApeChain On-Chain', error: null };
          foundBaycOnChain = true;
        } else if (poolId === 2) { // MAYC
          statusDetails.mayc = { daily: parseFloat(dailyRewardApe.toFixed(2)), apr: parseFloat(apr.toFixed(2)), source: 'ApeChain On-Chain', error: null };
          foundMaycOnChain = true;
        } else if (poolId === 3) { // BAKC
          statusDetails.bakc = { daily: parseFloat(dailyRewardApe.toFixed(2)), apr: parseFloat(apr.toFixed(2)), source: 'ApeChain On-Chain', error: null };
          foundBakcOnChain = true;
        }
      }
      if (foundBaycOnChain && foundMaycOnChain && foundBakcOnChain) {
        onChainNftSuccess = true;
      } else {
        // If any pool is missing, we consider the on-chain source incomplete for our needs.
        // Individual errors for successfully fetched pools are cleared above.
        // This error will be a general one for NFT data.
        let missingPools = [];
        if (!foundBaycOnChain) missingPools.push("BAYC");
        if (!foundMaycOnChain) missingPools.push("MAYC");
        if (!foundBakcOnChain) missingPools.push("BAKC");
        throw new Error(`Incomplete pool data from on-chain source (missing: ${missingPools.join(', ')}).`);
      }
    } catch (onChainNftError) {
      const errorMsg = `On-chain NFT data collection failed: ${onChainNftError.message}`;
      // Apply error to all NFT types that weren't successfully fetched from chain
      if (!foundBaycOnChain) statusDetails.bayc.error = errorMsg; else statusDetails.bayc.error = null; // Clear if found, else set global error
      if (!foundMaycOnChain) statusDetails.mayc.error = errorMsg; else statusDetails.mayc.error = null;
      if (!foundBakcOnChain) statusDetails.bakc.error = errorMsg; else statusDetails.bakc.error = null;
      if (!fetchErrors.includes(errorMsg)) fetchErrors.push(errorMsg);
      onChainNftSuccess = false; // Ensure it's false if any error occurred
    }

    if (!onChainNftSuccess) { // 2. Secondary: ApeCtrl API
      try {
        const nftResponse = await fetch('https://apectrl.com/api/statistics/ape-staking');
        if (!nftResponse.ok) throw new Error(`ApeCtrl API fetch failed with status: ${nftResponse.status}`);

        const nftData = await nftResponse.json();

        // Update BAYC from ApeCtrl if not already sourced from on-chain
        if (nftData.bayc && statusDetails.bayc.source === 'Fallback') {
          const baycRewardsPerHour = parseFloat(nftData.bayc.rewardsPerHour);
          const baycStakedAmount = parseFloat(nftData.bayc.stakedAmount);
          const baycCapPerPosition = parseFloat(nftData.bayc.capPerPosition);
          const baycDaily = baycStakedAmount > 0 ? (baycRewardsPerHour / baycStakedAmount) * baycCapPerPosition * 24 : 0;
          statusDetails.bayc = {
            daily: parseFloat(baycDaily.toFixed(2)),
            apr: parseFloat(nftData.bayc.apr),
            source: 'ApeCtrl API',
            error: null
          };
        }
        // Update MAYC from ApeCtrl if not already sourced from on-chain
        if (nftData.mayc && statusDetails.mayc.source === 'Fallback') {
          const maycRewardsPerHour = parseFloat(nftData.mayc.rewardsPerHour);
          const maycStakedAmount = parseFloat(nftData.mayc.stakedAmount);
          const maycCapPerPosition = parseFloat(nftData.mayc.capPerPosition);
          const maycDaily = maycStakedAmount > 0 ? (maycRewardsPerHour / maycStakedAmount) * maycCapPerPosition * 24 : 0;
          statusDetails.mayc = {
            daily: parseFloat(maycDaily.toFixed(2)),
            apr: parseFloat(nftData.mayc.apr),
            source: 'ApeCtrl API',
            error: null
          };
        }
        // Update BAKC from ApeCtrl if not already sourced from on-chain
        if (nftData.bakc && statusDetails.bakc.source === 'Fallback') {
          const bakcRewardsPerHour = parseFloat(nftData.bakc.rewardsPerHour);
          const bakcStakedAmount = parseFloat(nftData.bakc.stakedAmount);
          const bakcCapPerPosition = parseFloat(nftData.bakc.capPerPosition);
          const bakcDaily = bakcStakedAmount > 0 ? (bakcRewardsPerHour / bakcStakedAmount) * bakcCapPerPosition * 24 : 0;
          statusDetails.bakc = {
            daily: parseFloat(bakcDaily.toFixed(2)),
            apr: parseFloat(nftData.bakc.apr),
            source: 'ApeCtrl API',
            error: null
          };
        }
      } catch (websiteNftError) {
        const errorMsg = `ApeCtrl API processing failed: ${websiteNftError.message}`;
        // Apply error only if the specific pool wasn't successfully fetched from on-chain and is still 'Fallback'
        if (statusDetails.bayc.source === 'Fallback') statusDetails.bayc.error = statusDetails.bayc.error ? statusDetails.bayc.error + '; ' + errorMsg : errorMsg;
        if (statusDetails.mayc.source === 'Fallback') statusDetails.mayc.error = statusDetails.mayc.error ? statusDetails.mayc.error + '; ' + errorMsg : errorMsg;
        if (statusDetails.bakc.source === 'Fallback') statusDetails.bakc.error = statusDetails.bakc.error ? statusDetails.bakc.error + '; ' + errorMsg : errorMsg;
        if (!fetchErrors.includes(errorMsg)) fetchErrors.push(errorMsg);
      }
    }

    // 3. Tertiary: Hardcoded Defaults for NFT Data (applied per pool if still needed)
    if (statusDetails.bayc.daily === null) { // Check .daily, as .source might be 'Fallback' but error set
      statusDetails.bayc.daily = 17.52;
      statusDetails.bayc.apr = 63.35;
      statusDetails.bayc.source = 'Fallback Default'; // Overwrite source to 'Fallback Default'
    }
    if (statusDetails.mayc.daily === null) {
      statusDetails.mayc.daily = 4.11;
      statusDetails.mayc.apr = 73.52;
      statusDetails.mayc.source = 'Fallback Default';
    }
    if (statusDetails.bakc.daily === null) {
      statusDetails.bakc.daily = 1.45;
      statusDetails.bakc.apr = 61.67;
      statusDetails.bakc.source = 'Fallback Default';
    }
    // --- End NFT Data Fetching ---

    // --- Start apeApy Fetching ---
    // Fallback Order: 1. ApeScan Website -> 2. TrackMyYield.xyz -> 3. Hardcoded Default

    // Attempt 1: ApeScan Website
    try {
      const apeScanUrl = 'https://apescan.io/readContract?m=light&a=0x000000000000000000000000000000000000006b&n=ape&v=0x000000000000000000000000000000000000006b';
      const response = await fetch(apeScanUrl);
      if (!response.ok) {
        throw new Error(`ApeScan fetch failed with status: ${response.status}`);
      }
      const htmlText = await response.text();
      // Regex as a string, to be used with new RegExp if needed, but .match directly is fine for simple cases.
      const apeScanRegex = /getApy\s*\(0x[0-9a-fA-F]+\)\s*(\d+)\s*uint64/;
      const match = htmlText.match(apeScanRegex);

      if (match && match[1]) {
        const rawApy = BigInt(match[1]);
        const calculatedApy = Number(rawApy) / (10**9);
        statusDetails.apeApy.value = parseFloat(calculatedApy.toFixed(2));
        statusDetails.apeApy.source = 'ApeScan Website';
        statusDetails.apeApy.error = null;
      } else {
        throw new Error("Could not parse APY from ApeScan page.");
      }
    } catch (apeScanError) {
      const errorMsg = `ApeScan website fetch/parse failed: ${apeScanError.message}`;
      statusDetails.apeApy.error = errorMsg; // Set as the first error
      if (!fetchErrors.includes(errorMsg)) fetchErrors.push(errorMsg);
      // statusDetails.apeApy.value remains null
    }

    if (statusDetails.apeApy.value === null) { // If ApeScan failed, try TrackMyYield.xyz
      // Attempt 2: TrackMyYield.xyz Website
      try {
        const tmyResponse = await fetch('https://trackmyyield.xyz/', {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        if (!tmyResponse.ok) {
          throw new Error(`TrackMyYield.xyz fetch failed with status: ${tmyResponse.status}`);
        }
        const tmyHtmlText = await tmyResponse.text();
        const tmyPatterns = [
          { regexStr: "\"apeApy\"\\s*:\\s*(\\d+\\.?\\d*)", flags: "" },
          { regexStr: "apeApy\\s*[:=]\\s*(\\d+\\.?\\d*)", flags: "" },
          { regexStr: "APY[\"\\s]*[:=]\\s*(\\d+\\.?\\d*)%?", flags: "i" },
          { regexStr: "(\\d+\\.?\\d*)\\s*%?\\s*APY", flags: "i" }
        ];

        let tmyApyFound = false;
        for (const p of tmyPatterns) {
          const pattern = new RegExp(p.regexStr, p.flags);
          const match = tmyHtmlText.match(pattern);
          if (match && match[1]) {
            const parsedApy = parseFloat(match[1]);
            if (parsedApy && parsedApy > 0 && parsedApy < 100) {
              statusDetails.apeApy.value = parseFloat(parsedApy.toFixed(2));
              statusDetails.apeApy.source = 'TrackMyYield.xyz';
              statusDetails.apeApy.error = null; // Clear error from ApeScan attempt
              tmyApyFound = true;
              break;
            }
          }
        }
        if (!tmyApyFound) {
          throw new Error("Could not parse APY from TrackMyYield.xyz page or value out of range.");
        }
      } catch (tmyError) {
        const errorMsg = `TrackMyYield.xyz fetch/parse failed: ${tmyError.message}`;
        statusDetails.apeApy.error = statusDetails.apeApy.error ? statusDetails.apeApy.error + '; ' + errorMsg : errorMsg;
        if (!fetchErrors.includes(errorMsg)) fetchErrors.push(errorMsg);
        // statusDetails.apeApy.value remains null
      }
    }

    if (statusDetails.apeApy.value === null) { // If both ApeScan and TrackMyYield failed
      // Attempt 3: Hardcoded Default
      statusDetails.apeApy.value = 6.0;
      statusDetails.apeApy.source = 'Fallback Default';
      // statusDetails.apeApy.error retains the error(s) from failed attempts
    }
    // --- End apeApy Fetching ---

    // Fetch USD/CNY rate (try multiple sources)
    try {
      const exchangeResponse = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      if (exchangeResponse.ok) {
        const exchangeData = await exchangeResponse.json();
        if (exchangeData.rates && exchangeData.rates.CNY) {
          statusDetails.usdCnyRate.value = parseFloat(exchangeData.rates.CNY.toFixed(4));
          statusDetails.usdCnyRate.source = 'ExchangeRate API';
          statusDetails.usdCnyRate.error = null;
        } else {
          throw new Error("Invalid data format from ExchangeRate API");
        }
      } else {
        throw new Error(`ExchangeRate API fetch failed with status: ${exchangeResponse.status}`);
      }
    } catch (error) {
      const errorMsg = `USD/CNY rate fetch failed: ${error.message}`;
      statusDetails.usdCnyRate.error = errorMsg;
      if (!fetchErrors.includes(errorMsg)) fetchErrors.push(errorMsg);
    }
    if (statusDetails.usdCnyRate.value === null) {
      statusDetails.usdCnyRate.value = 7.1889; // Default fallback
      statusDetails.usdCnyRate.source = 'Fallback Default';
    }

    // Populate final results from statusDetails
    results.apePrice = statusDetails.apePrice.value;
    results.usdCnyRate = statusDetails.usdCnyRate.value;
    results.apeApy = statusDetails.apeApy.value;
    results.baycDaily = statusDetails.bayc.daily;
    results.baycApr = statusDetails.bayc.apr;
    results.maycDaily = statusDetails.mayc.daily;
    results.maycApr = statusDetails.mayc.apr;
    results.bakcDaily = statusDetails.bakc.daily;
    results.bakcApr = statusDetails.bakc.apr;

    // Add metadata
    results.timestamp = new Date().toISOString();
    results.success = true; // API call itself is successful
    results.fetchErrors = fetchErrors;
    results.detailedStatus = statusDetails;
    results.dataSources = {
      apePrice: statusDetails.apePrice.source,
      nftStakingBAYC: statusDetails.bayc.source,
      nftStakingMAYC: statusDetails.mayc.source,
      nftStakingBAKC: statusDetails.bakc.source,
      apeApy: statusDetails.apeApy.source,
      usdCnyRate: statusDetails.usdCnyRate.source
    };

    return new Response(JSON.stringify(results), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Max-Age': '86400',
      },
    });

  } catch (error) {
    console.error('Error in fetch-data function:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to fetch data',
      timestamp: new Date().toISOString(),
      // Return fallback values based on correct screenshot values
      apePrice: 0.7463,
      usdCnyRate: 7.1889,
      apeApy: 6.0,
      baycDaily: 17.52,
      maycDaily: 4.11,
      bakcDaily: 1.45,
      baycApr: 63.35,
      maycApr: 73.52,
      bakcApr: 61.67,
      dataSources: {
        apePrice: 'Fallback',
        nftStaking: 'Fallback', 
        apeApy: 'Fallback',
        usdCnyRate: 'Fallback'
      }
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Max-Age': '86400',
      },
    });
  }
} 
