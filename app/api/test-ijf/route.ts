import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const compId = searchParams.get('compId') || '3081';
  
  try {
    // Get categories for competition 3081
    const catUrl = `https://data.ijf.org/api/get_json?params%5Baction%5D=competition.categories_full&params%5Bid_competition%5D=${compId}`;
    const catResponse = await fetch(catUrl);
    const catData = await catResponse.json();
    
    // Get matches for first category
    const catId = Object.keys(catData)?.[0];
    const matchUrl = `https://data.ijf.org/api/get_json?params%5Baction%5D=contest.find&params%5Bid_competition%5D=${compId}&params%5Bid_weight%5D=1&params%5Border_by%5D=cnum`;
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
      competitionId: compId,
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
    return NextResponse.json({ error: error.message });
  }
}

