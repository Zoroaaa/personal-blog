import { render, screen } from '@testing-library/react';
import { PostList } from './PostList';

const mockPosts = [
  {
    id: 1,
    title: 'Test Post 1',
    slug: 'test-post-1',
    summary: 'Test summary 1',
    createdAt: '2024-01-01T00:00:00Z',
    readingTime: '2 min',
    viewCount: 100,
    tags: [{ name: 'test', slug: 'test' }],
  },
  {
    id: 2,
    title: 'Test Post 2',
    slug: 'test-post-2',
    summary: 'Test summary 2',
    createdAt: '2024-01-02T00:00:00Z',
    readingTime: '3 min',
    viewCount: 200,
    tags: [{ name: 'test', slug: 'test' }, { name: 'demo', slug: 'demo' }],
  },
];

describe('PostList', () => {
  it('renders post list correctly', () => {
    render(<PostList posts={mockPosts} loading={false} error={null} />);
    
    expect(screen.getByText('Test Post 1')).toBeInTheDocument();
    expect(screen.getByText('Test Post 2')).toBeInTheDocument();
    expect(screen.getByText('Test summary 1')).toBeInTheDocument();
    expect(screen.getByText('Test summary 2')).toBeInTheDocument();
  });
  
  it('renders loading state', () => {
    render(<PostList posts={[]} loading={true} error={null} />);
    expect(screen.getByText('加载中...')).toBeInTheDocument();
  });
  
  it('renders error state', () => {
    render(<PostList posts={[]} loading={false} error="Failed to load posts" />);
    expect(screen.getByText('Failed to load posts')).toBeInTheDocument();
  });
  
  it('renders empty state', () => {
    render(<PostList posts={[]} loading={false} error={null} />);
    expect(screen.getByText('暂无文章')).toBeInTheDocument();
  });
});
