import Test from '../components/Test';

export default function TestPage() {
  return (
    <div className="min-h-screen bg-red-500">
      <h1 className="text-4xl font-bold text-white text-center p-8">
        Tailwind Test Page
      </h1>
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden md:max-w-2xl">
        <div className="p-8">
          <div className="uppercase tracking-wide text-sm text-indigo-500 font-semibold">
            Test Card
          </div>
          <p className="mt-2 text-gray-500">
            If you see this styled card with proper colors and spacing, Tailwind is working.
          </p>
        </div>
      </div>
      <Test />
    </div>
  );
}