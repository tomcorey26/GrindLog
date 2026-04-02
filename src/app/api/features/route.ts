import { NextResponse } from "next/server";
import { getFeatureFlags } from "@/lib/feature-flags";

export async function GET() {
  return NextResponse.json(getFeatureFlags());
}
