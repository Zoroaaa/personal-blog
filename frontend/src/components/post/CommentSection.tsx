/**
 * 评论区：发表评论表单 + 评论列表（含递归回复）。
 */

import { RichTextEditor } from '../RichTextEditor';
import { formatDate } from '../../utils/formatDate';
import { sanitizeHtml } from '../../utils/sanitizeHtml';
import type { PostCommentsController } from '../../hooks/usePostComments';
import type { Comment, Post } from '../../types';

interface CommentSectionProps {
  post: Post;
  isAuthenticated: boolean;
  commentsApi: PostCommentsController;
  onLogin: () => void;
}

interface CommentItemProps {
  comment: Comment;
  level: number;
  commentsApi: PostCommentsController;
}

function CommentItem({ comment, level, commentsApi }: CommentItemProps) {
  const {
    commentLoading,
    commentLiking,
    replyingTo,
    replyContent,
    setReplyContent,
    mentionableUsers,
    uploadingImage,
    handleReplyMention,
    handleCommentImageUpload,
    handleLikeComment,
    handleReply,
    handleSubmitReply,
  } = commentsApi;

  return (
    <div className={`${level > 0 ? 'ml-8' : ''} border-l-2 border-border pl-4 mb-4`}>
      <div className="flex items-start space-x-3">
        {comment.avatarUrl || comment.user?.avatarUrl ? (
          <img
            src={comment.avatarUrl || comment.user?.avatarUrl}
            alt={comment.displayName || comment.user?.displayName}
            className="w-10 h-10 rounded-full"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-border flex items-center justify-center">
            <span className="text-foreground font-medium">
              {comment.displayName?.[0] || comment.user?.displayName?.[0] || comment.username?.[0] || '?'}
            </span>
          </div>
        )}

        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <span className="font-medium text-foreground">
              {comment.displayName || comment.user?.displayName || comment.username}
            </span>
            <span className="text-sm text-muted-foreground">
              {/* 使用安全的日期格式化 */}
              {formatDate(comment.createdAt)}
            </span>
          </div>
          <div
            className="text-foreground comment-content"
            dangerouslySetInnerHTML={{
              __html: sanitizeHtml(comment.content)
            }}
          />

          <div className="mt-2 flex items-center space-x-4 text-sm text-muted-foreground">
            <button
              onClick={() => handleLikeComment(comment.id)}
              disabled={commentLiking === comment.id}
              className={`flex items-center transition-colors ${comment.isLiked ? 'text-red-600' : 'hover:text-primary'} ${commentLiking === comment.id ? 'opacity-50' : ''}`}
            >
              <svg
                className={`w-4 h-4 mr-1 ${comment.isLiked ? 'fill-current' : ''}`}
                fill={comment.isLiked ? 'currentColor' : 'none'}
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              {comment.likeCount || 0}
            </button>

            {level < 3 && (
              <button
                onClick={() => handleReply(comment.id)}
                className="hover:text-primary"
              >
                回复
              </button>
            )}
          </div>

          {/* 回复表单 */}
          {replyingTo === comment.id && (
            <form
              onSubmit={(e) => handleSubmitReply(e, comment.id)}
              className="mt-4 p-4 bg-muted rounded-lg"
            >
              <RichTextEditor
                value={replyContent}
                onChange={setReplyContent}
                placeholder="写下你的回复...输入 @ 可提及用户"
                maxLength={500}
                mentionableUsers={mentionableUsers}
                onImageUpload={handleCommentImageUpload}
                onMention={handleReplyMention}
              />
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {uploadingImage ? '图片上传中...' : '支持富文本格式'}
                </span>
                <button
                  type="submit"
                  disabled={commentLoading || !replyContent.trim() || uploadingImage}
                  className="px-4 py-1 bg-primary text-white rounded hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {commentLoading ? '发表中...' : '发表回复'}
                </button>
              </div>
            </form>
          )}

          {/* 递归渲染回复 */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-4">
              {comment.replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  level={level + 1}
                  commentsApi={commentsApi}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function CommentSection({ post, isAuthenticated, commentsApi, onLogin }: CommentSectionProps) {
  const {
    comments,
    newComment,
    setNewComment,
    commentLoading,
    mentionableUsers,
    uploadingImage,
    handleMention,
    handleCommentImageUpload,
    handleSubmitComment,
  } = commentsApi;

  return (
    <div className="mt-16 border-t border-border pt-8">
      <h2 className="text-2xl font-bold text-foreground mb-6">评论 ({comments.length})</h2>

      {/* 归档文章提示 */}
      {post.status === 'archived' && (
        <div className="mb-8 p-6 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg text-center">
          <svg className="mx-auto h-12 w-12 text-orange-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
          <p className="text-orange-700 dark:text-orange-300 font-medium">该文章已归档，不允许发表评论</p>
        </div>
      )}

      {/* 发表评论 */}
      {post.status !== 'archived' && (
        isAuthenticated ? (
          <form onSubmit={handleSubmitComment} className="mb-8">
            <RichTextEditor
              value={newComment}
              onChange={setNewComment}
              placeholder="写下你的评论...输入 @ 可提及用户"
              maxLength={1000}
              mentionableUsers={mentionableUsers}
              onImageUpload={handleCommentImageUpload}
              onMention={handleMention}
            />
            <div className="flex items-center justify-between mt-4">
              <span className="text-sm text-muted-foreground">
                {uploadingImage ? '图片上传中...' : '支持富文本格式，输入 @ 可提及用户'}
              </span>
              <button
                type="submit"
                disabled={commentLoading || !newComment.trim() || uploadingImage}
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {commentLoading ? '发表中...' : '发表评论'}
              </button>
            </div>
          </form>
        ) : (
          <div className="mb-8 p-6 bg-muted border border-border rounded-lg text-center">
            <p className="text-muted-foreground mb-4">请先登录后再发表评论</p>
            <button
              onClick={onLogin}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
            >
              去登录
            </button>
          </div>
        )
      )}

      {/* 评论列表 */}
      {comments.length > 0 ? (
        <div className="space-y-6">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              level={0}
              commentsApi={commentsApi}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-muted rounded-lg">
          <svg className="mx-auto h-12 w-12 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <p className="mt-2 text-muted-foreground">暂无评论，来发表第一条评论吧！</p>
        </div>
      )}
    </div>
  );
}