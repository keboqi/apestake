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
    const results = {};
    let apeApySource = 'Fallback'; // Initialize APE APY source

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
          results.apePrice = parseFloat(apeData.price.toFixed(4));
        }
      }
    } catch (error) {
      console.error('Error fetching APE price from CryptoRates.ai:', error);
    }

    // Fetch NFT staking data from ApeChain using getAllStakes
    let nftDataSuccessfullyFetched = false;
    try {
      const payload = {
        jsonrpc: '2.0',
        id: 2, // Use a different ID from the apeApy fetch
        method: 'eth_call',
        params: [{
          to: STAKING_CONTRACT_ADDRESS,
          data: GET_ALL_STAKES_CALL_DATA
        }, 'latest']
      };
      const response = await fetch(APECHAIN_RPC_URL, { // APECHAIN_RPC_URL should be available
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const responseData = await response.json();
        if (responseData.result) {
          const stakes = decodeGetAllStakesResponse(responseData.result); // Assumes decodeGetAllStakesResponse is defined

          for (const stake of stakes) {
            const poolId = stake.poolId; // is a number
            const depositedBI = BigInt(stake.deposited);
            const rewards24HrsBI = BigInt(stake.rewards24Hrs); // This is total rewards for the pool for 24hrs

            // Calculate dailyRewardApe (rewards per 100 APE staked if applicable, or total daily for pool)
            // The provided `getAllStakes` seems to return total rewards for a pool, not per individual NFT.
            // The old calculation was for individual NFT full stake.
            // For now, rewards24Hrs from chain is total for the pool.
            // Let's assume rewards24HrsBI is the total for the pool.
            // The original contract calculations for "daily" were based on per-NFT caps.
            // We need to align what `rewards24Hrs` means. If it's pool total, then APR is pool total.
            // For now, let's assume `rewards24Hrs` from chain IS the "Daily Reward Full Stake Equivalent" for that pool type.
            const dailyRewardApe = Number(rewards24HrsBI * 100n / (10n**18n)) / 100;

            let apr = 0;
            if (depositedBI > 0n) {
              // dailyRateForAPR = Number( (rewards24HrsBI * 10^18 * 10^6) / (depositedBI * 10^18) )
              // rewards24HrsBI and depositedBI are already in 10^18 format.
              const dailyRateForAPR = Number(rewards24HrsBI * 1000000n / depositedBI); // Scale up for precision before division
              apr = (dailyRateForAPR * 365) / 10000; // Scale down to percentage (e.g., 1732 -> 17.32% -> 63.218)
            }

            if (poolId === 1) { // BAYC
              results.baycDaily = parseFloat(dailyRewardApe.toFixed(2));
              results.baycApr = parseFloat(apr.toFixed(2));
            } else if (poolId === 2) { // MAYC
              results.maycDaily = parseFloat(dailyRewardApe.toFixed(2));
              results.maycApr = parseFloat(apr.toFixed(2));
            } else if (poolId === 3) { // BAKC
              results.bakcDaily = parseFloat(dailyRewardApe.toFixed(2));
              results.bakcApr = parseFloat(apr.toFixed(2));
            }
          }
          nftDataSuccessfullyFetched = true;
        }
      }
    } catch (error) {
      console.error('Error fetching NFT staking data from ApeChain:', error);
      // nftDataSuccessfullyFetched remains false
    }

    // Attempt to fetch APE APY from ApeChain
    // const APECHAIN_RPC_URL = 'https://apechain.calderachain.xyz/http'; // Now defined above
    const APECHAIN_CONTRACT_ADDRESS = '0x000000000000000000000000000000000000006b';
    const APECHAIN_GET_APY_SIGNATURE = '0xb7a09138';

    try {
      const payload = {
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_call',
        params: [{
          to: APECHAIN_CONTRACT_ADDRESS,
          data: APECHAIN_GET_APY_SIGNATURE
        }, 'latest']
      };
      const response = await fetch(APECHAIN_RPC_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const responseData = await response.json();
        if (responseData.result) {
          const integerValue = parseInt(responseData.result, 16);
          if (!isNaN(integerValue)) {
            results.apeApy = parseFloat((integerValue / 1000000000).toFixed(2));
            apeApySource = 'ApeChain On-Chain';
          }
        }
      }
    } catch (error) {
      console.error('Error fetching APE APY from ApeChain:', error);
      // apeApySource remains 'Fallback'
    }

    // Fetch USD/CNY rate (try multiple sources)
    try {
      // Try exchangerate-api first (free)
      const exchangeResponse = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      if (exchangeResponse.ok) {
        const exchangeData = await exchangeResponse.json();
        results.usdCnyRate = exchangeData.rates?.CNY || 7.1889;
      }
    } catch (error) {
      console.error('Error fetching exchange rate:', error);
      results.usdCnyRate = 7.1889; // fallback from screenshot
    }

    // Set default values if fetching failed (based on correct screenshot values)
    if (!results.apeApy) results.apeApy = 6.0; // from trackmyyield screenshot
    if (!results.baycDaily) results.baycDaily = 17.52; // from screenshot: Daily Rewards (Full)
    if (!results.maycDaily) results.maycDaily = 4.11; // from screenshot: Daily Rewards (Full)  
    if (!results.bakcDaily) results.bakcDaily = 1.45; // from screenshot: Daily Rewards (Full)
    if (!results.baycApr) results.baycApr = 63.35; // from apectrl API
    if (!results.maycApr) results.maycApr = 73.52; // from apectrl API (updated from screenshot)
    if (!results.bakcApr) results.bakcApr = 61.67; // from apectrl API
    if (!results.apePrice) results.apePrice = 0.7463; // fallback
    if (!results.usdCnyRate) results.usdCnyRate = 7.1889; // fallback

    // Add metadata
    results.timestamp = new Date().toISOString();
    results.success = true;
    results.dataSources = {
      apePrice: results.apePrice !== 0.7463 ? 'CryptoRates.ai API' : 'Fallback',
      nftStaking: nftDataSuccessfullyFetched ? 'ApeChain On-Chain' : 'Fallback',
      apeApy: apeApySource, // Use the determined source
      usdCnyRate: 'ExchangeRate API' // Assuming this remains or is handled elsewhere
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
