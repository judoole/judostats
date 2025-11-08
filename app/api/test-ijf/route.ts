import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // Disable test endpoint on Vercel
  if (process.env.VERCEL) {
    return NextResponse.json(
      { error: 'Test endpoint is disabled in production' },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const compId = searchParams.get('compId') || '3081';
  
  // Validate compId to prevent SSRF
  const compIdNum = parseInt(compId);
  if (isNaN(compIdNum) || compIdNum < 1 || compIdNum > 999999) {
    return NextResponse.json(
      { error: 'Invalid competition ID. Must be a number between 1 and 999999' },
      { status: 400 }
    );
  }
  
  try {
    // Get categories for competition - compId is now validated
    const catUrl = `https://data.ijf.org/api/get_json?params%5Baction%5D=competition.categories_full&params%5Bid_competition%5D=${compIdNum}`;
    const catResponse = await fetch(catUrl);
    const catData = await catResponse.json();
    
    // Get matches for first category
    const catId = Object.keys(catData)?.[0];
    const matchUrl = `https://data.ijf.org/api/get_json?params%5Baction%5D=contest.find&params%5Bid_competition%5D=${compIdNum}&params%5Bid_weight%5D=1&params%5Border_by%5D=cnum`;
    const matchResponse = await fetch(matchUrl);
    const matchData = await matchResponse.json();
    
    // Get match details for first match
    let matchDetails = null;
    if (matchData && matchData.length > 0) {
      const contestCode = matchData[0].code;
      const detailUrl = `https://data.ijf.org/api/get_json?params%5Baction%5D=contest.find&params%5Bcontest_code%5D=${contestCode}&params%5Bpart%5D=info%2Cscore_list%2Cmedia%2Cevents`;
      const detailResponse = await fetch(detailUrl);
      matchDetails = await detailResponse.json();
    }
    
    return NextResponse.json({
      competitionId: compIdNum,
      categories: catData,
      firstCategoryId: catId,
      matches: matchData,
      matchCount: matchData?.length || 0,
      firstMatch: matchData?.[0] || null,
      matchDetails: matchDetails,
      hasEvents: !!(matchDetails?.events?.length),
      eventCount: matchDetails?.events?.length || 0,
    });
  } catch (error: any) {
    console.error('Error in test-ijf endpoint:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching data' },
      { status: 500 }
    );
  }
}

