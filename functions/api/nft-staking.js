// Cloudflare Function to fetch NFT staking rewards from apectrl.com API
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
    
    // Fetch NFT staking data from apectrl.com API (real endpoint from screenshots)
    try {
      const response = await fetch('https://apectrl.com/api/statistics/ape-staking');
      
      if (response.ok) {
        const data = await response.json();
        
        // Extract BAYC data from API response - calculate per-NFT rewards correctly
        if (data.bayc) {
          const baycRewardsPerHour = parseFloat(data.bayc.rewardsPerHour);
          const baycStakedNfts = parseInt(data.bayc.stakedNfts);
          // Daily rewards per NFT = (total hourly rewards * 24) / number of staked NFTs
          const dailyRewardsPerNft = parseFloat(((baycRewardsPerHour * 24) / baycStakedNfts).toFixed(2));
          
          results.bayc = {
            dailyRewards: dailyRewardsPerNft,
            apr: parseFloat(data.bayc.apr),
            stakedAmount: data.bayc.stakedAmount,
            stakedNfts: data.bayc.stakedNfts,
            capPerPosition: parseFloat(data.bayc.capPerPosition),
            rewardsPerHour: baycRewardsPerHour,
            totalDailyPool: parseFloat((baycRewardsPerHour * 24).toFixed(2))
          };
        }
        
        // Extract MAYC data from API response - calculate per-NFT rewards correctly
        if (data.mayc) {
          const maycRewardsPerHour = parseFloat(data.mayc.rewardsPerHour);
          const maycStakedNfts = parseInt(data.mayc.stakedNfts);
          // Daily rewards per NFT = (total hourly rewards * 24) / number of staked NFTs
          const dailyRewardsPerNft = parseFloat(((maycRewardsPerHour * 24) / maycStakedNfts).toFixed(2));
          
          results.mayc = {
            dailyRewards: dailyRewardsPerNft,
            apr: parseFloat(data.mayc.apr),
            stakedAmount: data.mayc.stakedAmount,
            stakedNfts: data.mayc.stakedNfts,
            capPerPosition: parseFloat(data.mayc.capPerPosition),
            rewardsPerHour: maycRewardsPerHour,
            totalDailyPool: parseFloat((maycRewardsPerHour * 24).toFixed(2))
          };
        }
        
        // Extract BAKC data from API response - calculate per-NFT rewards correctly
        if (data.bakc) {
          const bakcRewardsPerHour = parseFloat(data.bakc.rewardsPerHour);
          const bakcStakedNfts = parseInt(data.bakc.stakedNfts);
          // Daily rewards per NFT = (total hourly rewards * 24) / number of staked NFTs
          const dailyRewardsPerNft = parseFloat(((bakcRewardsPerHour * 24) / bakcStakedNfts).toFixed(2));
          
          results.bakc = {
            dailyRewards: dailyRewardsPerNft,
            apr: parseFloat(data.bakc.apr),
            stakedAmount: data.bakc.stakedAmount,
            stakedNfts: data.bakc.stakedNfts,
            capPerPosition: parseFloat(data.bakc.capPerPosition),
            rewardsPerHour: bakcRewardsPerHour,
            totalDailyPool: parseFloat((bakcRewardsPerHour * 24).toFixed(2))
          };
        }
        
        results.success = true;
        results.dataSource = 'ApeCTRL API';
        
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
    } catch (error) {
      console.error('Error fetching from apectrl.com API:', error);
      
      // Set fallback values based on correct screenshot values
      results.bayc = {
        dailyRewards: 17.52, // from screenshot: Daily Rewards (Full)
        apr: 63.35,
        stakedAmount: "18641719.671908488935755535",
        stakedNfts: 1978,
        capPerPosition: 10094,
        rewardsPerHour: 1348.01,
        totalDailyPool: 32352.34
      };
      
      results.mayc = {
        dailyRewards: 4.11, // from screenshot: Daily Rewards (Full)
        apr: 73.52,
        stakedAmount: "6498348.434328499095146192",
        stakedNfts: 3351,
        capPerPosition: 2042,
        rewardsPerHour: 545.44,
        totalDailyPool: 13090.66
      };
      
      results.bakc = {
        dailyRewards: 1.45, // from screenshot: Daily Rewards (Full)
        apr: 61.67,
        stakedAmount: "1558892.199345097453269134",
        stakedNfts: 1899,
        capPerPosition: 856,
        rewardsPerHour: 109.75,
        totalDailyPool: 2633.93
      };
      
      results.success = false;
      results.error = error.message;
      results.dataSource = 'Fallback (API failed)';
    }

    // Add timestamp
    results.timestamp = new Date().toISOString();

    return new Response(JSON.stringify(results), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Max-Age': '86400',
      },
    });

  } catch (error) {
    console.error('Error in NFT staking function:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to fetch NFT staking data',
      timestamp: new Date().toISOString(),
      // Fallback values from correct screenshot values
      bayc: {
        dailyRewards: 17.52,
        apr: 63.35,
        stakedAmount: "18641719.671908488935755535",
        stakedNfts: 1978,
        capPerPosition: 10094,
        rewardsPerHour: 1348.01,
        totalDailyPool: 32352.34
      },
      mayc: {
        dailyRewards: 4.11,
        apr: 73.52,
        stakedAmount: "6498348.434328499095146192",
        stakedNfts: 3351,
        capPerPosition: 2042,
        rewardsPerHour: 545.44,
        totalDailyPool: 13090.66
      },
      bakc: {
        dailyRewards: 1.45,
        apr: 61.67,
        stakedAmount: "1558892.199345097453269134",
        stakedNfts: 1899,
        capPerPosition: 856,
        rewardsPerHour: 109.75,
        totalDailyPool: 2633.93
      },
      dataSource: 'Fallback (Function failed)'
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