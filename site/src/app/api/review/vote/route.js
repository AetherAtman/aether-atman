import { neon } from '@neondatabase/serverless';

export const runtime = 'edge';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers });
}

export async function GET(request) {
  const sql = neon(process.env.DATABASE_URL);
  const url = new URL(request.url);
  const userId = url.searchParams.get('user_id');
  
  try {
    const tallies = await sql`SELECT * FROM vote_tallies`;
    let userVotes = [];
    if (userId) {
      userVotes = await sql`
        SELECT image_name, vote_type, rating 
        FROM votes WHERE user_id = ${userId}
      `;
    }
    return new Response(JSON.stringify({ tallies, userVotes }), { headers });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });
  }
}

export async function POST(request) {
  const sql = neon(process.env.DATABASE_URL);
  try {
    const { user_id, image_name, vote_type, rating } = await request.json();
    
    if (!user_id || !image_name) {
      return new Response(JSON.stringify({ error: 'user_id and image_name required' }), { status: 400, headers });
    }
    
    // Upsert vote
    await sql`
      INSERT INTO votes (user_id, image_name, vote_type, rating)
      VALUES (${user_id}, ${image_name}, ${vote_type || null}, ${rating || null})
      ON CONFLICT (user_id, image_name) 
      DO UPDATE SET vote_type = EXCLUDED.vote_type, rating = EXCLUDED.rating, updated_at = NOW()
    `;
    
    // Update tallies
    const counts = await sql`
      SELECT 
        COUNT(*) FILTER (WHERE vote_type = 'up') as ups,
        COUNT(*) FILTER (WHERE vote_type = 'down') as downs,
        ROUND(AVG(rating)::numeric, 2) as avg_rating,
        COUNT(rating) as rating_count
      FROM votes WHERE image_name = ${image_name}
    `;
    
    const c = counts[0];
    await sql`
      INSERT INTO vote_tallies (image_name, ups, downs, avg_rating, rating_count)
      VALUES (${image_name}, ${c.ups || 0}, ${c.downs || 0}, ${c.avg_rating || null}, ${c.rating_count || 0})
      ON CONFLICT (image_name) 
      DO UPDATE SET ups = EXCLUDED.ups, downs = EXCLUDED.downs, 
                    avg_rating = EXCLUDED.avg_rating, rating_count = EXCLUDED.rating_count
    `;
    
    return new Response(JSON.stringify({ success: true }), { headers });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });
  }
}
