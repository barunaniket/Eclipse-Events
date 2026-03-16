// app/api/version/route.ts
import { NextResponse } from 'next/server';

const BUILD_TAG =
  process.env.CF_PAGES_COMMIT_SHA ??
  process.env.CF_PAGES_COMMIT_HASH ??
  process.env.GITHUB_SHA ??
  'unknown';

const BRANCH =
  process.env.CF_PAGES_BRANCH ??
  process.env.GITHUB_REF_NAME ??
  'unknown';

const BUILD_TIME =
  process.env.CF_PAGES_BUILD_TIME ??
  process.env.BUILD_TIME ??
  'unknown';

export async function GET() {
  const res = NextResponse.json({
    buildTag: BUILD_TAG,
    branch: BRANCH,
    buildTime: BUILD_TIME
  });
  res.headers.set('x-build-tag', BUILD_TAG);
  res.headers.set('cache-control', 'no-store');
  return res;
}
