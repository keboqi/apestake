// Cloudflare Function to fetch APE staking data from real APIs

// Helper function to decode the ABI-encoded hex string from getAllStakes
// The response is an ABI-encoded tuple: (DashboardStake[])
// DashboardStake struct: { uint256 poolId, uint256 tokenId, uint256 deposited, uint256 unclaimed, uint256 rewards24Hrs }
function decodeGetAllStakesResponse(hexString) {
  // Remove '0x' prefix if present
  if (hexString.startsWith('0x')) {
    hexString = hexString.substring(2);
  }

  // --- ABI Decoding Constants ---
  // Each field in the struct is uint256, which is 32 bytes (64 hex characters)
  const FIELD_HEX_LENGTH = 64;
  // Number of fields in each DashboardStake struct
  const NUM_FIELDS_PER_STRUCT = 5;
  // Total length of one struct in hex characters
  const STRUCT_HEX_LENGTH = NUM_FIELDS_PER_STRUCT * FIELD_HEX_LENGTH;

  // --- Decoding Process ---
  // 1. Offset to Array Data (ignore for now, assuming tightly packed)
  // The first 64 hex characters represent the offset to the start of the array data.
  // For a dynamic array of structs, this is typically 0x20 (32 bytes),
  // indicating that the array length and data follow immediately.
  // const offsetToArrayData = parseInt(hexString.substring(0, FIELD_HEX_LENGTH), 16);

  // 2. Array Length
  // The next 64 hex characters (after the offset) represent the number of elements in the array.
  const arrayLengthHex = hexString.substring(FIELD_HEX_LENGTH, FIELD_HEX_LENGTH * 2);
  const arrayLength = parseInt(arrayLengthHex, 16);

  // 3. Array Data
  // The actual array data starts after the offset and length fields.
  let currentDataPosition = FIELD_HEX_LENGTH * 2;
  const decodedStakes = [];

  for (let i = 0; i < arrayLength; i++) {
    // Slice the portion of the hex string that represents the current struct
    const structHex = hexString.substring(currentDataPosition, currentDataPosition + STRUCT_HEX_LENGTH);

    // Decode each field within the struct
    const poolIdHex = structHex.substring(0, FIELD_HEX_LENGTH);
    const tokenIdHex = structHex.substring(FIELD_HEX_LENGTH, FIELD_HEX_LENGTH * 2);
    const depositedHex = structHex.substring(FIELD_HEX_LENGTH * 2, FIELD_HEX_LENGTH * 3);
    const unclaimedHex = structHex.substring(FIELD_HEX_LENGTH * 3, FIELD_HEX_LENGTH * 4);
    const rewards24HrsHex = structHex.substring(FIELD_HEX_LENGTH * 4, FIELD_HEX_LENGTH * 5);

    decodedStakes.push({
      poolId: parseInt(poolIdHex, 16),
      tokenId: parseInt(tokenIdHex, 16), // tokenId is part of the struct but not used in current APR calculations
      deposited: BigInt('0x' + depositedHex).toString(),
      unclaimed: BigInt('0x' + unclaimedHex).toString(),
      rewards24Hrs: BigInt('0x' + rewards24HrsHex).toString(),
    });

    // Move to the next struct in the hex string
    currentDataPosition += STRUCT_HEX_LENGTH;
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
    const KV_KEY = "LAST_SUCCESSFUL_DATA";
    let kvData = null;

    if (context.env.APE_STAKING_DATA_KV) {
      try {
        kvData = await context.env.APE_STAKING_DATA_KV.get(KV_KEY, { type: "json" });
        if (kvData) {
            console.log("Successfully retrieved data from KV store.");
        } else {
            console.log("No data found in KV store for key:", KV_KEY);
        }
      } catch (e) {
        console.error("KV GET error:", e.message);
        // Do not add to fetchErrors here, as fetchErrors is initialized later.
        // This error will be implicitly handled by kvData remaining null.
      }
    } else {
      console.warn("KV store (APE_STAKING_DATA_KV) is not available in this environment.");
    }

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
    const APE_CONTRACT_ADDRESS = '0x000000000000000000000000000000000000006b';
    // Fixed call data - removed the odd length issue that was causing parsing errors
    const GET_ALL_STAKES_CALL_DATA = '0xd42a6eeb000000000000000000000000ea4b9b75cd563a9e003bb9c16bb7a963d2fdc750000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000001c6700000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000005fde00000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000001c67';
    const GET_APY_CALL_DATA = '0x1fb922e0'; // getApy() function selector
    
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
          throw new Error("Invalid data format from CryptoRates.ai (price not found or not a number)");
        }
      } else {
        let errorText = await apeResponse.text();
        try {
            const errorJson = JSON.parse(errorText);
            errorText = errorJson.message || errorJson.error || JSON.stringify(errorJson);
        } catch (e) {
            // errorText is already plain text
        }
        throw new Error(`CryptoRates.ai API request failed with status ${apeResponse.status}: ${errorText}`);
      }
    } catch (error) {
      const errorMsg = `APE Price (CryptoRates.ai) Error: ${error.message}`;
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
        id: 365061061772180, // Use working ID from successful calls
        method: 'eth_call',
        params: [{ 
          from: '0x0000000000000000000000000000000000000000',
          to: STAKING_CONTRACT_ADDRESS, 
          data: GET_ALL_STAKES_CALL_DATA 
        }, 'latest']
      };
      const response = await fetch(APECHAIN_RPC_URL, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Origin': 'https://apescan.io',
          'Referer': 'https://apescan.io/',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        let errorBody = "Could not retrieve error body.";
        try {
          const errorJson = await response.json();
          errorBody = errorJson.error ? errorJson.error.message : JSON.stringify(errorJson);
        } catch (e) {
          try {
            errorBody = await response.text();
          } catch (e2) {
            // Keep default errorBody
          }
        }
        throw new Error(`ApeChain RPC request for getAllStakes failed with status ${response.status}: ${errorBody}`);
      }

      const responseData = await response.json();
      if (responseData.error) {
        throw new Error(`ApeChain RPC error for getAllStakes: ${responseData.error.message || JSON.stringify(responseData.error)}`);
      }
      if (!responseData.result || responseData.result === "0x" || responseData.result === "0x0000000000000000000000000000000000000000000000000000000000000000") {
        throw new Error("Empty or invalid result from ApeChain getAllStakes: " + (responseData.result || "undefined"));
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
        throw new Error(`Incomplete pool data from ApeChain getAllStakes (missing: ${missingPools.join(', ')}).`);
      }
    } catch (onChainNftError) {
      const specificErrorMsg = `NFT Data (ApeChain getAllStakes) Error: ${onChainNftError.message}`;
      // Apply error to all NFT types that weren't successfully fetched from chain
      if (!foundBaycOnChain) statusDetails.bayc.error = specificErrorMsg;
      // else statusDetails.bayc.error remains null if already fetched
      if (!foundMaycOnChain) statusDetails.mayc.error = specificErrorMsg;
      if (!foundBakcOnChain) statusDetails.bakc.error = specificErrorMsg;

      if (!fetchErrors.includes(specificErrorMsg)) fetchErrors.push(specificErrorMsg);
      onChainNftSuccess = false; // Ensure it's false if any error occurred
    }

    if (!onChainNftSuccess) { // 2. Secondary: ApeCtrl API
      try {
        const nftResponse = await fetch('https://apectrl.com/api/statistics/ape-staking');
        if (!nftResponse.ok) {
          let errorBody = "Could not retrieve error body.";
          try {
            errorBody = await nftResponse.text(); // ApeCtrl might return HTML or plain text error
          } catch (e) { /* Keep default */ }
          throw new Error(`ApeCtrl API request failed with status ${nftResponse.status}: ${errorBody}`);
        }
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
        const specificErrorMsg = `NFT Data (ApeCtrl API) Error: ${websiteNftError.message}`;
        // Apply error only if the specific pool is still 'Fallback' (meaning not sourced from on-chain)
        if (statusDetails.bayc.source === 'Fallback') {
            statusDetails.bayc.error = statusDetails.bayc.error ? statusDetails.bayc.error + '; ' + specificErrorMsg : specificErrorMsg;
        }
        if (statusDetails.mayc.source === 'Fallback') {
            statusDetails.mayc.error = statusDetails.mayc.error ? statusDetails.mayc.error + '; ' + specificErrorMsg : specificErrorMsg;
        }
        if (statusDetails.bakc.source === 'Fallback') {
            statusDetails.bakc.error = statusDetails.bakc.error ? statusDetails.bakc.error + '; ' + specificErrorMsg : specificErrorMsg;
        }
        if (!fetchErrors.includes(specificErrorMsg)) fetchErrors.push(specificErrorMsg);
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
    // Fallback Order: 1. ApeChain On-Chain RPC -> 2. ApeScan Website -> 3. TrackMyYield.xyz -> 4. Hardcoded Default

    // Attempt 1: ApeChain On-Chain RPC (getApy)
    try {
      const apyPayload = {
        jsonrpc: '2.0',
        id: 365061061772181, // Different ID from NFT call
        method: 'eth_call',
        params: [{ 
          from: '0x0000000000000000000000000000000000000000',
          to: APE_CONTRACT_ADDRESS, 
          data: GET_APY_CALL_DATA 
        }, 'latest']
      };
      const apyResponse = await fetch(APECHAIN_RPC_URL, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Origin': 'https://apescan.io',
          'Referer': 'https://apescan.io/',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36'
        },
        body: JSON.stringify(apyPayload)
      });

      if (!apyResponse.ok) {
        let errorBody = "Could not retrieve error body.";
        try {
          const errorJson = await apyResponse.json();
          errorBody = errorJson.error ? errorJson.error.message : JSON.stringify(errorJson);
        } catch (e) {
          try {
            errorBody = await apyResponse.text();
          } catch (e2) { /* Keep default */ }
        }
        throw new Error(`ApeChain RPC request for getApy failed with status ${apyResponse.status}: ${errorBody}`);
      }

      const apyResponseData = await apyResponse.json();
      if (apyResponseData.error) {
        throw new Error(`ApeChain RPC error for getApy: ${apyResponseData.error.message || JSON.stringify(apyResponseData.error)}`);
      }
      if (!apyResponseData.result || apyResponseData.result === "0x" || apyResponseData.result === "0x0000000000000000000000000000000000000000000000000000000000000000") {
        throw new Error("Empty or invalid result from ApeChain getApy: " + (apyResponseData.result || "undefined"));
      }

      // Decode the APY result (uint64)
      let resultHex = apyResponseData.result;
      if (resultHex.startsWith('0x')) {
        resultHex = resultHex.substring(2);
      }
      
      const rawApy = BigInt('0x' + resultHex);
      const calculatedApy = Number(rawApy) / (10**9);
      
      if (calculatedApy > 0 && calculatedApy < 50) { // Reasonable APY range
        statusDetails.apeApy.value = parseFloat(calculatedApy.toFixed(2));
        statusDetails.apeApy.source = 'ApeChain On-Chain RPC';
        statusDetails.apeApy.error = null;
      } else {
        throw new Error(`APY value out of reasonable range from ApeChain getApy: ${calculatedApy}`);
      }
    } catch (onChainApyError) {
      const specificErrorMsg = `APE APY (ApeChain getApy) Error: ${onChainApyError.message}`;
      statusDetails.apeApy.error = specificErrorMsg; // This is the primary source, so it always sets/overwrites
      if (!fetchErrors.includes(specificErrorMsg)) fetchErrors.push(specificErrorMsg);
    }

    if (statusDetails.apeApy.value === null) { // If on-chain failed, try ApeScan Website
      // Attempt 2: ApeScan Website
      try {
        const apeScanUrl = 'https://apescan.io/readContract?m=light&a=0x000000000000000000000000000000000000006b&n=ape&v=0x000000000000000000000000000000000000006b';
        const response = await fetch(apeScanUrl);
        if (!response.ok) {
          let errorText = await response.text();
          throw new Error(`ApeScan website request failed with status ${response.status}: ${errorText.substring(0, 200)}`);
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
          statusDetails.apeApy.error = null; // Clear previous errors if successful
        } else {
          throw new Error("Could not parse APY from ApeScan website page content.");
        }
      } catch (apeScanError) {
        const specificErrorMsg = `APE APY (ApeScan Website) Error: ${apeScanError.message}`;
        // Only set error if primary (on-chain) also failed. Append if primary had an error.
        statusDetails.apeApy.error = statusDetails.apeApy.error ? statusDetails.apeApy.error + '; ' + specificErrorMsg : specificErrorMsg;
        if (!fetchErrors.includes(specificErrorMsg)) fetchErrors.push(specificErrorMsg);
        // statusDetails.apeApy.value remains null
      }
    }

    if (statusDetails.apeApy.value === null) { // If ApeScan failed, try TrackMyYield.xyz
      // Attempt 3: TrackMyYield.xyz Website
      try {
        const tmyResponse = await fetch('https://trackmyyield.xyz/', {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        if (!tmyResponse.ok) {
          let errorText = await tmyResponse.text();
          throw new Error(`TrackMyYield.xyz website request failed with status ${tmyResponse.status}: ${errorText.substring(0,200)}`);
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
          throw new Error("Could not parse APY from TrackMyYield.xyz page content or value out of range.");
        }
      } catch (tmyError) {
        const specificErrorMsg = `APE APY (TrackMyYield.xyz) Error: ${tmyError.message}`;
        statusDetails.apeApy.error = statusDetails.apeApy.error ? statusDetails.apeApy.error + '; ' + specificErrorMsg : specificErrorMsg;
        if (!fetchErrors.includes(specificErrorMsg)) fetchErrors.push(specificErrorMsg);
        // statusDetails.apeApy.value remains null
      }
    }

    if (statusDetails.apeApy.value === null) { // If all sources failed (On-chain, ApeScan, and TrackMyYield)
      // Attempt 4: Hardcoded Default
      statusDetails.apeApy.value = 6.0;
      statusDetails.apeApy.source = 'Fallback Default';
      // statusDetails.apeApy.error retains the error(s) from failed attempts, which is desired.
    }
    // --- End apeApy Fetching ---

    // Fetch USD/CNY rate
    try {
      const exchangeResponse = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      if (exchangeResponse.ok) {
        const exchangeData = await exchangeResponse.json();
        if (exchangeData.rates && exchangeData.rates.CNY && typeof exchangeData.rates.CNY === 'number') {
          statusDetails.usdCnyRate.value = parseFloat(exchangeData.rates.CNY.toFixed(4));
          statusDetails.usdCnyRate.source = 'ExchangeRate API';
          statusDetails.usdCnyRate.error = null;
        } else {
          throw new Error("Invalid data format from ExchangeRate API (CNY rate not found or not a number)");
        }
      } else {
        let errorText = await exchangeResponse.text();
        try {
            const errorJson = JSON.parse(errorText);
            errorText = errorJson.message || errorJson.error || JSON.stringify(errorJson);
        } catch (e) { /* errorText is already plain text */ }
        throw new Error(`ExchangeRate API request failed with status ${exchangeResponse.status}: ${errorText}`);
      }
    } catch (error) {
      const errorMsg = `USD/CNY Rate (ExchangeRate API) Error: ${error.message}`;
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

    // --- KV Data Merging ---
    if (kvData) { // kvData was read at the beginning
        const updateFromKV = (fieldKey, statusDetailKey, isGroup = false) => {
            if (!statusDetails[statusDetailKey]) {
                console.warn(`Status detail key ${statusDetailKey} not found for KV merge.`);
                return;
            }

            if (isGroup) {
                if (statusDetails[statusDetailKey].source === 'Fallback Default') {
                    const hasAllDataInKV = (dk, kvd) => {
                        if (!kvd) return false;
                        if (dk === 'bayc') return kvd.baycDaily !== undefined && kvd.baycApr !== undefined;
                        if (dk === 'mayc') return kvd.maycDaily !== undefined && kvd.maycApr !== undefined;
                        if (dk === 'bakc') return kvd.bakcDaily !== undefined && kvd.bakcApr !== undefined;
                        return false;
                    };
                    if (hasAllDataInKV(fieldKey, kvData)) {
                        console.log(`Using KV Cache for ${fieldKey}`);
                        if (fieldKey === 'bayc') { results.baycDaily = kvData.baycDaily; results.baycApr = kvData.baycApr; statusDetails.bayc.daily = kvData.baycDaily; statusDetails.bayc.apr = kvData.baycApr; }
                        if (fieldKey === 'mayc') { results.maycDaily = kvData.maycDaily; results.maycApr = kvData.maycApr; statusDetails.mayc.daily = kvData.maycDaily; statusDetails.mayc.apr = kvData.maycApr; }
                        if (fieldKey === 'bakc') { results.bakcDaily = kvData.bakcDaily; results.bakcApr = kvData.bakcApr; statusDetails.bakc.daily = kvData.bakcDaily; statusDetails.bakc.apr = kvData.bakcApr; }
                        statusDetails[statusDetailKey].source = 'KV Cache';
                        statusDetails[statusDetailKey].error = null;
                    }
                }
            } else {
                if (statusDetails[statusDetailKey].source === 'Fallback Default' && kvData[fieldKey] !== undefined) {
                    console.log(`Using KV Cache for ${fieldKey}`);
                    results[fieldKey] = kvData[fieldKey];
                    statusDetails[statusDetailKey].value = kvData[fieldKey];
                    statusDetails[statusDetailKey].source = 'KV Cache';
                    statusDetails[statusDetailKey].error = null;
                }
            }
        };

        // Attempt to use KV data for fields that ended up as 'Fallback Default'
        updateFromKV('apePrice', 'apePrice');
        updateFromKV('usdCnyRate', 'usdCnyRate');
        updateFromKV('apeApy', 'apeApy');
        updateFromKV('bayc', 'bayc', true);
        updateFromKV('mayc', 'mayc', true);
        updateFromKV('bakc', 'bakc', true);
    }

    // --- Conditional KV Write ---
    // Write the potentially updated 'results' (after API fetches and KV merge) back to KV
    if (context.env.APE_STAKING_DATA_KV) {
        // Define "good enough" data: at least apePrice and apeApy are not from hardcoded defaults.
        const isDataGoodForKV = statusDetails.apePrice.source !== 'Fallback Default' &&
                               statusDetails.apeApy.source !== 'Fallback Default';

        if (isDataGoodForKV) {
            try {
                // Construct a minimal object for KV storage from the 'results' object
                const dataToStoreInKV = {
                    apePrice: results.apePrice,
                    usdCnyRate: results.usdCnyRate,
                    apeApy: results.apeApy,
                    baycDaily: results.baycDaily,
                    baycApr: results.baycApr,
                    maycDaily: results.maycDaily,
                    maycApr: results.maycApr,
                    bakcDaily: results.bakcDaily,
                    bakcApr: results.bakcApr
                    // Do not store timestamp, success, fetchErrors, detailedStatus, dataSources in KV
                };
                await context.env.APE_STAKING_DATA_KV.put(KV_KEY, JSON.stringify(dataToStoreInKV));
                console.log("Successfully wrote data to KV store.");
            } catch (e) {
                console.error("KV PUT error:", e.message);
                if (!fetchErrors.includes(`KV PUT Error: ${e.message}`)) {
                    fetchErrors.push(`KV PUT Error: ${e.message}`);
                }
            }
        } else {
            console.log("Data not considered good enough to update KV store.");
        }
    }

    // Add metadata - IMPORTANT: This must be done AFTER KV merge and write attempt
    // so that detailedStatus and dataSources reflect the final state.
    results.timestamp = new Date().toISOString();
    results.success = true; // API call itself is successful if it reaches this point
    results.fetchErrors = fetchErrors; // Includes any KV errors encountered during merge/write
    results.detailedStatus = statusDetails; // Reflects KV Cache source if used
    results.dataSources = { // Repopulate based on final statusDetails
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
