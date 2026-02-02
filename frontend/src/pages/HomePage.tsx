import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../utils/api';
import { format } from 'date-fns';

export function HomePage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  useEffect(() => {
    loadPosts();
  }, [page]);
  
  const loadPosts = async () => {
    try {
      setLoading(true);
      const data = await api.getPosts({ page, limit: 10 });
      setPosts(data.posts);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      console.error('Failed to load posts:', error);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">加载中...</div>
      </div>
    );
  }
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-4xl font-bold text-gray-900 mb-8">最新文章</h1>
      
      <div className="space-y-8">
        {posts.map((post) => (
          <article key={post.id} className="bg-white rounded-lg shadow-md overflow-hidden">
            {post.cover_image && (
              <img
                src={post.cover_image}
                alt={post.title}
                className="w-full h-64 object-cover"
              />
            )}
            <div className="p-6">
              <Link to={`/posts/${post.slug}`}>
                <h2 className="text-2xl font-bold text-gray-900 hover:text-blue-600 mb-2">
                  {post.title}
                </h2>
              </Link>
              
              {post.summary && (
                <p className="text-gray-600 mb-4">{post.summary}</p>
              )}
              
              <div className="flex items-center text-sm text-gray-500 space-x-4">
                <span>作者: {post.author_name}</span>
                <span>•</span>
                <span>{format(new Date(post.published_at), 'yyyy-MM-dd')}</span>
                <span>•</span>
                <span>{post.view_count} 次阅读</span>
                {post.category_name && (
                  <>
                    <span>•</span>
                    <span className="text-blue-600">{post.category_name}</span>
                  </>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
      
      {/* 分页 */}
      {totalPages > 1 && (
        <div className="mt-8 flex justify-center space-x-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border rounded disabled:opacity-50"
          >
            上一页
          </button>
          <span className="px-4 py-2">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 border rounded disabled:opacity-50"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}
