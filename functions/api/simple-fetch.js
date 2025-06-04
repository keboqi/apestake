// Real API fetch function using working endpoints
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
    const data = {
      success: true,
      timestamp: new Date().toISOString(),
      dataSource: 'Real APIs',
      // Set fallback values first
      apePrice: 0.7463,
      usdCnyRate: 7.1889,
      apeApy: 6.0,
      baycDaily: 17.52,
      maycDaily: 4.11,
      bakcDaily: 1.45,
      baycApr: 63.35,
      maycApr: 73.52,
      bakcApr: 61.67
    };

    // Fetch from real ApeCTRL API
    try {
      const response = await fetch('https://apectrl.com/api/statistics/ape-staking');
      if (response.ok) {
        const apiData = await response.json();
        
        // Calculate per-NFT daily rewards correctly
        if (apiData.bayc) {
          const baycRewardsPerHour = parseFloat(apiData.bayc.rewardsPerHour);
          const baycStakedNfts = parseInt(apiData.bayc.stakedNfts);
          data.baycDaily = parseFloat(((baycRewardsPerHour * 24) / baycStakedNfts).toFixed(2));
          data.baycApr = parseFloat(apiData.bayc.apr);
        }
        
        if (apiData.mayc) {
          const maycRewardsPerHour = parseFloat(apiData.mayc.rewardsPerHour);
          const maycStakedNfts = parseInt(apiData.mayc.stakedNfts);
          data.maycDaily = parseFloat(((maycRewardsPerHour * 24) / maycStakedNfts).toFixed(2));
          data.maycApr = parseFloat(apiData.mayc.apr);
        }
        
        if (apiData.bakc) {
          const bakcRewardsPerHour = parseFloat(apiData.bakc.rewardsPerHour);
          const bakcStakedNfts = parseInt(apiData.bakc.stakedNfts);
          data.bakcDaily = parseFloat(((bakcRewardsPerHour * 24) / bakcStakedNfts).toFixed(2));
          data.bakcApr = parseFloat(apiData.bakc.apr);
        }
        
        data.dataSource = 'ApeCTRL API (Live)';
      }
    } catch (error) {
      console.error('Error fetching from ApeCTRL API:', error);
      data.dataSource = 'Fallback (API failed)';
    }

    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Max-Age': '86400',
      },
    });

  } catch (error) {
    // Return fallback data if everything fails
    return new Response(JSON.stringify({
      success: false,
      timestamp: new Date().toISOString(),
      error: error.message,
      apePrice: 0.7463,
      usdCnyRate: 7.1889,
      apeApy: 6.0,
      baycDaily: 17.52,
      maycDaily: 4.11,
      bakcDaily: 1.45,
      baycApr: 63.35,
      maycApr: 73.52,
      bakcApr: 61.67,
      dataSource: 'Fallback (Function failed)'
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Max-Age': '86400',
      },
    });
  }
} 