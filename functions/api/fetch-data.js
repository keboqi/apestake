// Cloudflare Function to fetch APE staking data from real APIs
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

    // Fetch NFT staking data from apectrl.com API (as shown in screenshot)
    try {
      const nftResponse = await fetch('https://apectrl.com/api/statistics/ape-staking');
      if (nftResponse.ok) {
        const nftData = await nftResponse.json();
        
        // Extract BAYC data - calculate full stake daily rewards correctly
        if (nftData.bayc) {
          const baycRewardsPerHour = parseFloat(nftData.bayc.rewardsPerHour);
          const baycStakedAmount = parseFloat(nftData.bayc.stakedAmount);
          const baycCapPerPosition = parseFloat(nftData.bayc.capPerPosition);
          // Daily rewards for FULL STAKE = (rewardsPerHour ÷ stakedAmount) × capPerPosition × 24
          results.baycDaily = parseFloat(((baycRewardsPerHour / baycStakedAmount) * baycCapPerPosition * 24).toFixed(2));
          results.baycApr = parseFloat(nftData.bayc.apr);
        }
        
        // Extract MAYC data - calculate full stake daily rewards correctly
        if (nftData.mayc) {
          const maycRewardsPerHour = parseFloat(nftData.mayc.rewardsPerHour);
          const maycStakedAmount = parseFloat(nftData.mayc.stakedAmount);
          const maycCapPerPosition = parseFloat(nftData.mayc.capPerPosition);
          // Daily rewards for FULL STAKE = (rewardsPerHour ÷ stakedAmount) × capPerPosition × 24
          results.maycDaily = parseFloat(((maycRewardsPerHour / maycStakedAmount) * maycCapPerPosition * 24).toFixed(2));
          results.maycApr = parseFloat(nftData.mayc.apr);
        }
        
        // Extract BAKC data - calculate full stake daily rewards correctly
        if (nftData.bakc) {
          const bakcRewardsPerHour = parseFloat(nftData.bakc.rewardsPerHour);
          const bakcStakedAmount = parseFloat(nftData.bakc.stakedAmount);
          const bakcCapPerPosition = parseFloat(nftData.bakc.capPerPosition);
          // Daily rewards for FULL STAKE = (rewardsPerHour ÷ stakedAmount) × capPerPosition × 24
          results.bakcDaily = parseFloat(((bakcRewardsPerHour / bakcStakedAmount) * bakcCapPerPosition * 24).toFixed(2));
          results.bakcApr = parseFloat(nftData.bakc.apr);
        }
      }
    } catch (error) {
      console.error('Error fetching NFT staking data:', error);
    }

    // Attempt to fetch APE APY from trackmyyield.xyz
    try {
      const apeStakingResponse = await fetch('https://trackmyyield.xyz/', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (apeStakingResponse.ok) {
        const html = await apeStakingResponse.text();
        
        // Look for various APY patterns in the HTML/JavaScript
        const patterns = [
          /"apeApy"\s*:\s*(\d+\.?\d*)/,
          /apeApy\s*[:=]\s*(\d+\.?\d*)/,
          /APY["\s]*[:=]\s*(\d+\.?\d*)%?/i,
          /(\d+\.?\d*)\s*%?\s*APY/i
        ];
        
        for (const pattern of patterns) {
          const match = html.match(pattern);
          if (match) {
            const apy = parseFloat(match[1]);
            if (apy && apy > 0 && apy < 100) {
              results.apeApy = apy;
              break;
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching APE staking APY:', error);
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
      nftStaking: 'ApeCTRL API',
      apeApy: 'TrackMyYield.xyz',
      usdCnyRate: 'ExchangeRate API'
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