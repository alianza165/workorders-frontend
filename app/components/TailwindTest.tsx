export default function TailwindTest() {
  return (
    <div className="p-8">
      <div className="bg-blue-500 text-white p-4 rounded-lg">
        <h1 className="text-2xl font-bold">Tailwind Test</h1>
        <p className="mt-2">
          If you see this styled box, Tailwind is working!
        </p>
        <div className="mt-4 flex gap-4">
          <button className="px-4 py-2 bg-green-500 rounded hover:bg-green-600">
            Success
          </button>
          <button className="px-4 py-2 bg-red-500 rounded hover:bg-red-600">
            Danger
          </button>
        </div>
      </div>
    </div>
  );
}
