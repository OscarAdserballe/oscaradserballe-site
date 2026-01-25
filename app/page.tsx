export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="text-center space-y-6 p-8">
        <h1 className="text-5xl font-bold text-gray-900">
          Oscar Julius Adserballe
        </h1>
        <div className="pt-4">
          <a 
            href="https://chat.oscaradserballe.com"
            className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            AnythingLLM →
          </a>
        </div>
      </div>
    </div>
  );
}
