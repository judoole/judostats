import { NextResponse } from 'next/server';
import { JsonStorage } from '@/lib/storage';
import { IJFClient } from '@/lib/ijf-client';

const storage = new JsonStorage();
const ijfClient = new IJFClient();

/**
 * GET /api/judoka/[id]/profile
 * Fetches judoka profile information (height, age, country) from IJF API
 * 
 * Query parameters:
 * - force: if true, fetches fresh data even if profile exists
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await storage.load();
    
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === 'true';
    
    // Validate judokaId format
    if (!/^\d+$/.test(id)) {
      return NextResponse.json(
        { error: 'Invalid judoka ID format' },
        { status: 400 }
      );
    }
    
    // Check if profile already exists
    const existingProfile = storage.getJudokaProfile(id);
    
    if (existingProfile && !force) {
      return NextResponse.json({ profile: existingProfile });
    }
    
    // Fetch profile from IJF API
    const personId = parseInt(id, 10);
    const competitorInfo = await ijfClient.getCompetitorInfo(personId);
    
    if (!competitorInfo) {
      if (existingProfile) {
        return NextResponse.json({ profile: existingProfile });
      }
      return NextResponse.json(
        { error: 'Failed to fetch profile from IJF API' },
        { status: 404 }
      );
    }
    
    // Convert IJF API response to our profile format
    const profile = {
      id: id,
      name: `${competitorInfo.given_name} ${competitorInfo.family_name}`.trim(),
      height: competitorInfo.height ? parseInt(competitorInfo.height, 10) : undefined,
      age: competitorInfo.age ? parseInt(competitorInfo.age, 10) : undefined,
      country: competitorInfo.country || competitorInfo.country_short,
    };
    
    // Save profile
    await storage.setJudokaProfile(profile);
    
    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Error fetching judoka profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch judoka profile' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/judoka/[id]/profile
 * Updates judoka profile information
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await storage.load();
    
    const { id } = await params;
    const updates = await request.json().catch(() => ({}));
    
    // Validate judokaId format
    if (!/^\d+$/.test(id)) {
      return NextResponse.json(
        { error: 'Invalid judoka ID format' },
        { status: 400 }
      );
    }
    
    await storage.updateJudokaProfile(id, updates);
    const profile = storage.getJudokaProfile(id);
    
    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Error updating judoka profile:', error);
    return NextResponse.json(
      { error: 'Failed to update judoka profile' },
      { status: 500 }
    );
  }
}

