import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function extractFirstUrl(value: string) {
  const match = value.match(/https?:\/\/[^\s]+/i);
  return match?.[0]?.replace(/[),.]+$/, "") ?? "";
}

function redirectToHome(request: NextRequest, rawValue: string) {
  const sharedUrl = extractFirstUrl(rawValue);
  const redirectUrl = new URL("/", request.url);

  if (sharedUrl) {
    redirectUrl.searchParams.set("sharedUrl", sharedUrl);
    redirectUrl.searchParams.set("source", "share-target");
  } else {
    redirectUrl.searchParams.set("shareError", "No video URL was found in the shared content.");
  }

  return NextResponse.redirect(redirectUrl, { status: 303 });
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const rawValue = [
    searchParams.get("url"),
    searchParams.get("text"),
    searchParams.get("title"),
  ]
    .filter(Boolean)
    .join(" ");

  return redirectToHome(request, rawValue);
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const rawValue = [
    formData.get("url"),
    formData.get("text"),
    formData.get("title"),
  ]
    .filter((value): value is string => typeof value === "string")
    .join(" ");

  return redirectToHome(request, rawValue);
}
