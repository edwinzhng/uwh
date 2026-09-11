import { NextResponse } from "next/server";
export const proxy = (): NextResponse => NextResponse.next();
