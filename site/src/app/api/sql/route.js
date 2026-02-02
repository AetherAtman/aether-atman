import { neon } from '@neondatabase/serverless';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(request) {
  try {
    const { sql, confirm } = await request.json();
    
    if (!sql) {
      return NextResponse.json({ success: false, error: 'SQL required' }, { status: 400 });
    }
    
    // Safety check for destructive operations
    const isDestructive = /\b(DROP|DELETE|TRUNCATE|UPDATE)\b/i.test(sql);
    if (isDestructive && confirm !== 'yes-delete-data') {
      return NextResponse.json({ 
        success: false, 
        error: 'Destructive operation requires confirm: "yes-delete-data"' 
      }, { status: 400 });
    }
    
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      return NextResponse.json({ success: false, error: 'DATABASE_URL not configured' }, { status: 500 });
    }
    
    const db = neon(dbUrl);
    
    // Split by semicolons for multiple statements
    const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
    const results = [];
    
    for (const statement of statements) {
      try {
        const rows = await db(statement);
        results.push({ sql: statement.substring(0, 50) + '...', rows, rowCount: rows.length });
      } catch (err) {
        results.push({ sql: statement.substring(0, 50) + '...', error: err.message });
      }
    }
    
    return NextResponse.json({ success: true, results });
    
  } catch (error) {
    console.error('SQL API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
