import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true });
  
  // 清除 Cookie
  response.cookies.delete('access_token');
  
  return response;
}

export async function GET() {
  const response = NextResponse.redirect(new URL('/auth/login', process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'));
  
  // 清除 Cookie
  response.cookies.delete('access_token');
  
  return response;
}

