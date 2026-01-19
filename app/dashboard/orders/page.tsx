'use client';

export default function OrdersPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Pedidos Recientes</h1>
      <div className="bg-white rounded-xl shadow-sm border p-8 text-center text-gray-500">
        <p>Aquí aparecerá la lista de pedidos en tiempo real.</p>
        <span className="text-xs text-gray-400">(Aún no hay pedidos registrados)</span>
      </div>
    </div>
  );
}