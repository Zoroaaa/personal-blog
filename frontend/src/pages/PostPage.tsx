import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Post } from '../types';
import { api } from '../utils/api';
import { format } from 'date-fns';
import { useAuthStore } from '../stores/authStore';

export function PostPage() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const { isAuthenticated } = useAuthStore();
  
  useEffect(() => {
    if (slug) {
      loadPost();
      loadComments();
    }
  }, [slug]);
  
  // 使用新的API
const loadPost = async (slug: string) => {
  try {
    const response = await api.getPost(slug);
    if (response.success && response.data) {
      setPost(response.data);
    }
  } catch (error) {
    console.error('Failed to load post:', error);
  }
};
  
  const loadComments = async () => {
    try {
      const data = await api.getComments(parseInt(slug!));
      setComments(data.comments);
    } catch (error) {
      console.error('Failed to load comments:', error);
    }
  };
  
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newComment.trim()) return;
    
    try {
      await api.createComment({
        postId: post.id,
        content: newComment,
      });
      setNewComment('');
      loadComments();
    } catch (error) {
      console.error('Failed to create comment:', error);
    }
  };
  
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center">加载中...</div>
      </div>
    );
  }
  
  if (!post) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center">文章不存在</div>
      </div>
    );
  }
  
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* 文章头部 */}
      <article>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">{post.title}</h1>
        
        <div className="flex items-center text-sm text-gray-500 space-x-4 mb-8">
          <span>作者: {post.author_display_name}</span>
          <span>•</span>
          <span>{format(new Date(post.published_at), 'yyyy-MM-dd')}</span>
          <span>•</span>
          <span>{post.view_count} 次阅读</span>
          <span>•</span>
          <span>{post.reading_time} 分钟</span>
        </div>
        
        {post.cover_image && (
          <img
            src={post.cover_image}
            alt={post.title}
            className="w-full h-96 object-cover rounded-lg mb-8"
          />
        )}
        
        {/* 文章内容 */}
        <div className="prose prose-lg max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {post.content}
          </ReactMarkdown>
        </div>
        
        {/* 标签 */}
        {post.tags && post.tags.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-2">
            {post.tags.map((tag: any) => (
              <span
                key={tag.id}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
              >
                #{tag.name}
              </span>
            ))}
          </div>
        )}
      </article>
      
      {/* 评论区 */}
      <div className="mt-16 border-t pt-8">
        <h2 className="text-2xl font-bold mb-6">评论 ({comments.length})</h2>
        
        {/* 发表评论 */}
        {isAuthenticated ? (
          <form onSubmit={handleSubmitComment} className="mb-8">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="写下你的评论..."
              className="w-full border rounded-lg p-3 mb-2 focus:ring-2 focus:ring-blue-500"
              rows={4}
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              发表评论
            </button>
          </form>
        ) : (
          <div className="mb-8 p-4 bg-gray-100 rounded-lg">
            <p className="text-gray-600">请先登录后再发表评论</p>
          </div>
        )}
        
        {/* 评论列表 */}
        <div className="space-y-6">
          {comments.map((comment) => (
            <div key={comment.id} className="border-l-2 border-gray-200 pl-4">
              <div className="flex items-center space-x-2 mb-2">
                <span className="font-medium">{comment.display_name || comment.username}</span>
                <span className="text-sm text-gray-500">
                  {format(new Date(comment.created_at), 'yyyy-MM-dd HH:mm')}
                </span>
              </div>
              <p className="text-gray-700">{comment.content}</p>
              
              {/* 回复 */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="mt-4 ml-8 space-y-4">
                  {comment.replies.map((reply: any) => (
                    <div key={reply.id} className="border-l-2 border-gray-200 pl-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="font-medium">{reply.display_name || reply.username}</span>
                        <span className="text-sm text-gray-500">
                          {format(new Date(reply.created_at), 'yyyy-MM-dd HH:mm')}
                        </span>
                      </div>
                      <p className="text-gray-700">{reply.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
