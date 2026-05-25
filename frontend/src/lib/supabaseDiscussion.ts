export interface DiscussionPost {
  id: string;
  parentId: string | null;
  authorHash: string;
  body: string;
  createdAt: string;
  likes: number;
}

interface SupabaseCommentRow {
  id: string;
  parent_id: string | null;
  author_hash: string;
  body: string;
  created_at: string;
  likes: number;
}

interface SupabaseLikeRow {
  comment_id: string;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseDiscussionConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

function getEndpoint(path: string): string {
  if (!SUPABASE_URL) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
  }

  return `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${path}`;
}

function getHeaders(prefer?: string): HeadersInit {
  if (!SUPABASE_ANON_KEY) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    ...(prefer ? { Prefer: prefer } : {}),
  };
}

function mapRow(row: SupabaseCommentRow): DiscussionPost {
  return {
    id: row.id,
    parentId: row.parent_id,
    authorHash: row.author_hash,
    body: row.body,
    createdAt: row.created_at,
    likes: row.likes,
  };
}

export async function fetchMarketDiscussionPosts(marketId: number): Promise<DiscussionPost[]> {
  const params = new URLSearchParams({
    market_id: `eq.${marketId}`,
    order: 'created_at.desc',
    limit: '100',
  });
  const response = await fetch(getEndpoint(`market_comments?${params.toString()}`), {
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error('Could not load market discussion.');
  }

  const rows = (await response.json()) as SupabaseCommentRow[];
  return rows.map(mapRow);
}

export async function createMarketDiscussionPost(input: {
  marketId: number;
  parentId?: string | null;
  authorHash: string;
  body: string;
}): Promise<DiscussionPost> {
  const response = await fetch(getEndpoint('market_comments'), {
    method: 'POST',
    headers: getHeaders('return=representation'),
    body: JSON.stringify({
      market_id: input.marketId,
      parent_id: input.parentId ?? null,
      author_hash: input.authorHash,
      body: input.body,
    }),
  });

  if (!response.ok) {
    throw new Error('Could not post discussion comment.');
  }

  const rows = (await response.json()) as SupabaseCommentRow[];
  return mapRow(rows[0]);
}

export async function fetchLikedDiscussionPostIds(
  marketId: number,
  authorHash: string,
): Promise<string[]> {
  const params = new URLSearchParams({
    market_id: `eq.${marketId}`,
    author_hash: `eq.${authorHash}`,
    select: 'comment_id',
  });
  const response = await fetch(getEndpoint(`market_comment_likes?${params.toString()}`), {
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error('Could not load liked comments.');
  }

  const rows = (await response.json()) as SupabaseLikeRow[];
  return rows.map((row) => row.comment_id);
}

export async function likeMarketDiscussionPost(input: {
  marketId: number;
  postId: string;
  authorHash: string;
}): Promise<void> {
  const response = await fetch(getEndpoint('market_comment_likes'), {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      market_id: input.marketId,
      comment_id: input.postId,
      author_hash: input.authorHash,
    }),
  });

  if (response.status === 409) {
    throw new Error('You already liked this comment.');
  }

  if (!response.ok) {
    throw new Error('Could not like comment.');
  }
}
