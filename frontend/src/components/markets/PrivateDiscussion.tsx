'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowUp,
  ChevronDown,
  EyeOff,
  LockKeyhole,
  MessageCircle,
  MessageSquareReply,
  Send,
  ShieldCheck,
} from 'lucide-react';
import clsx from 'clsx';
import { useAccount } from 'wagmi';
import Button from '@/components/ui/Button';
import {
  createMarketDiscussionPost,
  fetchLikedDiscussionPostIds,
  fetchMarketDiscussionPosts,
  isSupabaseDiscussionConfigured,
  likeMarketDiscussionPost,
  type DiscussionPost,
} from '@/lib/supabaseDiscussion';

type DiscussionSort = 'top' | 'new';

interface PrivateDiscussionProps {
  marketId: number;
}

function hashString(value: string): number {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function buildAuthorHash(marketId: number, address?: string): string {
  const seed = `${marketId}:${address ?? 'disconnected'}`;
  const hash = hashString(seed).toString(16).padStart(8, '0').slice(0, 8).toUpperCase();

  return `anon-${hash}`;
}

function formatPostTime(value: string): string {
  const timestamp = Date.parse(value);

  if (!Number.isFinite(timestamp)) {
    return 'now';
  }

  const deltaSeconds = Math.max(1, Math.floor((Date.now() - timestamp) / 1000));

  if (deltaSeconds < 60) {
    return `${deltaSeconds}s`;
  }

  const deltaMinutes = Math.floor(deltaSeconds / 60);

  if (deltaMinutes < 60) {
    return `${deltaMinutes}m`;
  }

  const deltaHours = Math.floor(deltaMinutes / 60);

  if (deltaHours < 24) {
    return `${deltaHours}h`;
  }

  return `${Math.floor(deltaHours / 24)}d`;
}

export default function PrivateDiscussion({ marketId }: PrivateDiscussionProps): JSX.Element {
  const { address, isConnected } = useAccount();
  const [posts, setPosts] = useState<DiscussionPost[]>([]);
  const [draft, setDraft] = useState<string>('');
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [expandedReplyIds, setExpandedReplyIds] = useState<Set<string>>(() => new Set());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoadingPosts, setLoadingPosts] = useState<boolean>(false);
  const [isPosting, setPosting] = useState<boolean>(false);
  const [postingReplyId, setPostingReplyId] = useState<string | null>(null);
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(() => new Set());
  const [sort, setSort] = useState<DiscussionSort>('new');
  const storageKey = `ciphermarket:private-discussion:${marketId}`;
  const authorHash = useMemo(() => buildAuthorHash(marketId, address), [address, marketId]);

  useEffect(() => {
    let isMounted = true;

    async function loadPosts(): Promise<void> {
      setErrorMessage(null);

      if (isSupabaseDiscussionConfigured) {
        setLoadingPosts(true);

        try {
          const remotePosts = await fetchMarketDiscussionPosts(marketId);
          const remoteLikedPostIds = isConnected
            ? await fetchLikedDiscussionPostIds(marketId, authorHash)
            : [];

          if (isMounted) {
            setPosts(remotePosts);
            setLikedPostIds(new Set(remoteLikedPostIds));
          }
        } catch (error) {
          if (isMounted) {
            setErrorMessage(error instanceof Error ? error.message : 'Could not load discussion.');
            setPosts([]);
          }
        } finally {
          if (isMounted) {
            setLoadingPosts(false);
          }
        }

        return;
      }

      try {
        const rawPosts = window.localStorage.getItem(storageKey);

        if (isMounted) {
          const localPosts = rawPosts ? (JSON.parse(rawPosts) as DiscussionPost[]) : [];
          setPosts(localPosts.map((post) => ({ ...post, parentId: post.parentId ?? null })));
          setLikedPostIds(
            new Set(
              JSON.parse(
                window.localStorage.getItem(`${storageKey}:likes:${authorHash}`) ?? '[]',
              ) as string[],
            ),
          );
        }
      } catch {
        if (isMounted) {
          setPosts([]);
        }
      }
    }

    void loadPosts();

    return () => {
      isMounted = false;
    };
  }, [authorHash, isConnected, marketId, storageKey]);

  useEffect(() => {
    if (isSupabaseDiscussionConfigured) {
      return;
    }

    window.localStorage.setItem(storageKey, JSON.stringify(posts));
  }, [posts, storageKey]);

  useEffect(() => {
    if (isSupabaseDiscussionConfigured) {
      return;
    }

    window.localStorage.setItem(
      `${storageKey}:likes:${authorHash}`,
      JSON.stringify(Array.from(likedPostIds)),
    );
  }, [authorHash, likedPostIds, storageKey]);

  const repliesByParent = useMemo(() => {
    return posts.reduce<Record<string, DiscussionPost[]>>((groups, post) => {
      if (!post.parentId) {
        return groups;
      }

      return {
        ...groups,
        [post.parentId]: [...(groups[post.parentId] ?? []), post].sort(
          (left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt),
        ),
      };
    }, {});
  }, [posts]);

  const sortedRootPosts = useMemo(() => {
    return posts
      .filter((post) => !post.parentId)
      .sort((left, right) => {
        if (sort === 'new') {
          return Date.parse(right.createdAt) - Date.parse(left.createdAt);
        }

        return right.likes - left.likes || Date.parse(right.createdAt) - Date.parse(left.createdAt);
      });
  }, [posts, sort]);

  const createLocalPost = (body: string, parentId: string | null): DiscussionPost => ({
    id: `${Date.now()}-${hashString(`${parentId ?? 'root'}:${body}`)}`,
    parentId,
    authorHash,
    body,
    createdAt: new Date().toISOString(),
    likes: 0,
  });

  const handleSubmit = async (parentId: string | null = null): Promise<void> => {
    const rawDraft = parentId ? replyDrafts[parentId] ?? '' : draft;
    const body = rawDraft.trim();

    if (!body || !isConnected) {
      return;
    }

    const localPost = createLocalPost(body, parentId);

    if (parentId) {
      setPostingReplyId(parentId);
    } else {
      setPosting(true);
    }
    setErrorMessage(null);

    try {
      const savedPost = isSupabaseDiscussionConfigured
        ? await createMarketDiscussionPost({ marketId, parentId, authorHash, body })
        : localPost;

      setPosts((current) => [savedPost, ...current]);

      if (parentId) {
        setReplyDrafts((current) => ({ ...current, [parentId]: '' }));
        setActiveReplyId(null);
        setExpandedReplyIds((current) => new Set([...current, parentId]));
      } else {
        setDraft('');
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not post comment.');
    } finally {
      setPosting(false);
      setPostingReplyId(null);
    }
  };

  const handleLike = async (postId: string): Promise<void> => {
    const post = posts.find((item) => item.id === postId);

    if (!post || !isConnected || likedPostIds.has(postId)) {
      return;
    }

    const nextLikes = post.likes + 1;

    setPosts((current) =>
      current.map((item) => (item.id === postId ? { ...item, likes: nextLikes } : item)),
    );
    setLikedPostIds((current) => new Set([...current, postId]));

    if (!isSupabaseDiscussionConfigured) {
      return;
    }

    try {
      await likeMarketDiscussionPost({ marketId, postId, authorHash });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not like comment.');
      setPosts((current) =>
        current.map((item) => (item.id === postId ? { ...item, likes: post.likes } : item)),
      );
      setLikedPostIds((current) => {
        const next = new Set(current);
        next.delete(postId);
        return next;
      });
    }
  };

  const postDisabled = !draft.trim() || isPosting || !isConnected;

  return (
    <section className="glass-card space-y-6 rounded-3xl p-8">
      <div className="flex flex-col gap-4 border-b border-white/5 pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
            <MessageCircle className="h-5 w-5" />
          </div>
          {/* <div className="space-y-2"> */}
            <h3 className="font-mono text-sm uppercase tracking-[0.22em] text-foreground">
              Private Discussion
            </h3>
            {/* <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-primary">
                <ShieldCheck className="h-3 w-3" />
                Privacy mode
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/8 bg-white/[0.03] px-3 py-1">
                <EyeOff className="h-3 w-3" />
                Wallet hidden
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/8 bg-white/[0.03] px-3 py-1">
                {isSupabaseDiscussionConfigured ? 'Supabase synced' : 'Local preview'}
              </span>
            </div> */}
          {/* </div> */}
        </div>

        <div className="inline-flex w-fit rounded-full border border-white/8 bg-white/[0.03] p-1">
          {(['new', 'top'] as const).map((mode) => (
            <button
              key={mode}
              className={clsx(
                'rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors',
                sort === mode ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
              onClick={() => setSort(mode)}
              type="button"
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-white/8 bg-black/10 p-4">
        <div className="flex min-w-0 items-center gap-2 border-b border-white/5 pb-3 text-xs text-muted-foreground">
          <LockKeyhole className="h-4 w-4 text-primary" />
          <span className="truncate">
            {isConnected ? `Posting as ${authorHash}` : 'Connect wallet to post'}
          </span>
        </div>
        <textarea
          className="mt-4 min-h-24 w-full resize-none rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-sm leading-6 text-foreground outline-none placeholder:text-muted-foreground/70 focus:border-primary/50 disabled:opacity-50"
          disabled={!isConnected}
          maxLength={360}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={
            isConnected
              ? 'Share a source, probability read, or question without exposing your wallet or position.'
              : 'Connect your wallet to join the discussion.'
          }
          value={draft}
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <span className="text-[11px] text-muted-foreground">{draft.length}/360</span>
          <Button
            className="gap-2"
            disabled={postDisabled}
            onClick={() => void handleSubmit()}
            type="button"
          >
            <Send className="h-4 w-4" />
            {!isConnected ? 'Connect Wallet' : isPosting ? 'Posting...' : 'Post'}
          </Button>
        </div>
      </div>

      {errorMessage ? (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          {errorMessage}
        </div>
      ) : null}

      <div className="space-y-3">
        {isLoadingPosts ? (
          <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-4 text-sm text-muted-foreground">
            Loading discussion...
          </div>
        ) : null}

        {!isLoadingPosts && sortedRootPosts.length === 0 ? (
          <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-4 text-sm text-muted-foreground">
            No comments yet.
          </div>
        ) : null}

        {sortedRootPosts.map((post) => {
          const replyDraft = replyDrafts[post.id] ?? '';
          const replies = repliesByParent[post.id] ?? [];
          const repliesExpanded = expandedReplyIds.has(post.id);

          return (
            <article
              key={post.id}
              className="rounded-2xl border border-white/8 bg-white/[0.025] p-4 transition-colors hover:bg-white/[0.04]"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <p className="font-mono text-xs uppercase tracking-[0.16em] text-foreground">
                    {post.authorHash}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatPostTime(post.createdAt)} ago
                  </p>
                </div>
                <button
                  className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-3 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary disabled:opacity-40"
                  disabled={!isConnected || likedPostIds.has(post.id)}
                  onClick={() => void handleLike(post.id)}
                  type="button"
                  title={
                    !isConnected
                      ? 'Connect wallet to like'
                      : likedPostIds.has(post.id)
                        ? 'Already liked'
                        : 'Like comment'
                  }
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                  {post.likes}
                </button>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{post.body}</p>
              <div className="mt-4 flex items-center gap-3">
                <button
                  className="inline-flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-primary disabled:opacity-40"
                  disabled={!isConnected}
                  onClick={() => setActiveReplyId((current) => (current === post.id ? null : post.id))}
                  type="button"
                >
                  <MessageSquareReply className="h-3.5 w-3.5" />
                  Reply
                </button>
                {replies.length > 0 ? (
                  <button
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-primary"
                    onClick={() =>
                      setExpandedReplyIds((current) => {
                        const next = new Set(current);

                        if (next.has(post.id)) {
                          next.delete(post.id);
                        } else {
                          next.add(post.id);
                        }

                        return next;
                      })
                    }
                    type="button"
                  >
                    <ChevronDown
                      className={clsx(
                        'h-3.5 w-3.5 transition-transform',
                        repliesExpanded && 'rotate-180',
                      )}
                    />
                    {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
                  </button>
                ) : null}
              </div>

              {activeReplyId === post.id ? (
                <div className="mt-4 rounded-2xl border border-white/8 bg-black/10 p-3">
                  <textarea
                    className="min-h-20 w-full resize-none rounded-xl border border-white/10 bg-white/[0.02] p-3 text-sm leading-6 text-foreground outline-none placeholder:text-muted-foreground/70 focus:border-primary/50"
                    maxLength={360}
                    onChange={(event) =>
                      setReplyDrafts((current) => ({ ...current, [post.id]: event.target.value }))
                    }
                    placeholder={`Reply as ${authorHash}`}
                    value={replyDraft}
                  />
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="text-[11px] text-muted-foreground">{replyDraft.length}/360</span>
                    <Button
                      className="gap-2"
                      disabled={!replyDraft.trim() || postingReplyId === post.id}
                      onClick={() => void handleSubmit(post.id)}
                      size="sm"
                      type="button"
                    >
                      <Send className="h-3.5 w-3.5" />
                      {postingReplyId === post.id ? 'Posting...' : 'Reply'}
                    </Button>
                  </div>
                </div>
              ) : null}

              {repliesExpanded && replies.length > 0 ? (
                <div className="mt-4 space-y-3 border-l border-white/10 pl-4">
                  {replies.map((reply) => (
                    <div key={reply.id} className="rounded-2xl border border-white/6 bg-white/[0.02] p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-foreground">
                            {reply.authorHash}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {formatPostTime(reply.createdAt)} ago
                          </p>
                        </div>
                        <button
                          className="inline-flex h-8 items-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-3 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary disabled:opacity-40"
                          disabled={!isConnected || likedPostIds.has(reply.id)}
                          onClick={() => void handleLike(reply.id)}
                          type="button"
                          title={
                            !isConnected
                              ? 'Connect wallet to like'
                              : likedPostIds.has(reply.id)
                                ? 'Already liked'
                                : 'Like reply'
                          }
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                          {reply.likes}
                        </button>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-muted-foreground">{reply.body}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
