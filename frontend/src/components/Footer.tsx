export function Footer() {
  return (
    <footer className="bg-gray-100 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center text-gray-600">
          <p>&copy; {new Date().getFullYear()} 我的博客. All rights reserved.</p>
          <p className="mt-2 text-sm">
            Powered by Cloudflare Workers & Pages
          </p>
        </div>
      </div>
    </footer>
  );
}
