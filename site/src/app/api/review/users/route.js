import { neon } from '@neondatabase/serverless';

export const runtime = 'edge';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers });
}

export async function GET() {
  const sql = neon(process.env.DATABASE_URL);
  try {
    const users = await sql`
      SELECT id, username, email, created_at 
      FROM users ORDER BY created_at DESC
    `;
    return new Response(JSON.stringify({ success: true, users, count: users.length }), { headers });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });
  }
}

export async function DELETE(request) {
  const sql = neon(process.env.DATABASE_URL);
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  const username = url.searchParams.get('username');
  
  if (!id && !username) {
    return new Response(JSON.stringify({ error: 'Must provide id or username' }), { status: 400, headers });
  }
  
  try {
    if (id) {
      // First delete user's votes
      await sql`DELETE FROM votes WHERE user_id = ${id}`;
      // Then delete user
      await sql`DELETE FROM users WHERE id = ${id}`;
    } else {
      // Get user ID first
      const user = await sql`SELECT id FROM users WHERE username = ${username}`;
      if (user.length > 0) {
        await sql`DELETE FROM votes WHERE user_id = ${user[0].id}`;
        await sql`DELETE FROM users WHERE username = ${username}`;
      }
    }
    return new Response(JSON.stringify({ success: true, deleted: id || username }), { headers });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });
  }
}
