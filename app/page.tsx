"use client";

export default function Home() {
  return (
    <div className="min-h-screen bg-red-100"> {/* Temporary color for visibility */}
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-center mb-8">Minimal Test Page</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Section 1</h2>
            <p>This is a test content box to check layout behavior.</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Section 2</h2>
            <p>Another test content box for comparison.</p>
          </div>
        </div>
      </div>
    </div>
  );
}