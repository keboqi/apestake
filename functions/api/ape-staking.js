// Cloudflare Function to fetch APE staking APY from trackmyyield.xyz
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
    let apeApy = null;
    
    // Attempt to fetch APE APY from trackmyyield.xyz
    try {
      const response = await fetch('https://trackmyyield.xyz/', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (response.ok) {
        const html = await response.text();
        
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
              apeApy = apy;
              break;
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching APE staking APY:', error);
    }

    // Use fallback if no APY found
    if (!apeApy) {
      apeApy = 6.0; // from trackmyyield screenshot
    }

    const results = {
      success: true,
      apeApy: apeApy,
      timestamp: new Date().toISOString(),
      dataSource: apeApy !== 6.0 ? 'TrackMyYield.xyz' : 'Fallback'
    };

    return new Response(JSON.stringify(results), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Max-Age': '86400',
      },
    });

  } catch (error) {
    console.error('Error in APE staking function:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to fetch APE staking data',
      apeApy: 6.0, // fallback
      timestamp: new Date().toISOString(),
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