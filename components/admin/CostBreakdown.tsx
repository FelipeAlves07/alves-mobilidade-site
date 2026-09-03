"use client";

import { Fuel, Clock, Utensils, TrendingUp, Route, DollarSign } from "lucide-react";
import { money } from "@/lib/quotes";
import type { CostBreakdown as CostBreakdownType } from "@/domain/quote/types";

interface CostBreakdownProps {
  breakdown: CostBreakdownType;
  showDetails?: boolean;
}

export default function CostBreakdown({ breakdown, showDetails = true }: CostBreakdownProps) {
  const b = breakdown;
  const profitPositive = b.profit >= 0;

  return (
    <div className="rounded-xl border border-[var(--accent-15)] bg-[var(--bg-surface)] p-5">
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--accent)]">
        Meus Gastos & Lucros
      </p>

      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-4 py-3">
          <div className="flex items-center gap-3">
            <Fuel size={16} className="text-zinc-500" />
            <span className="text-sm text-zinc-300">Combustível</span>
          </div>
          <span className="text-sm font-bold text-zinc-200">{money(b.fuelCost)}</span>
        </div>

        {b.tollCost > 0 && (
          <div className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-4 py-3">
            <div className="flex items-center gap-3">
              <Route size={16} className="text-zinc-500" />
              <span className="text-sm text-zinc-300">Pedágios</span>
            </div>
            <span className="text-sm font-bold text-zinc-200">{money(b.tollCost)}</span>
          </div>
        )}

        {b.mealCost > 0 && (
          <div className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-4 py-3">
            <div className="flex items-center gap-3">
              <Utensils size={16} className="text-zinc-500" />
              <span className="text-sm text-zinc-300">Alimentação ({b.mealsCount} refeições)</span>
            </div>
            <span className="text-sm font-bold text-zinc-200">{money(b.mealCost)}</span>
          </div>
        )}

        <div className="border-t border-[var(--accent-15)] pt-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DollarSign size={16} className="text-red-400" />
              <span className="text-sm font-bold text-red-300">Custo Total</span>
            </div>
            <span className="text-sm font-bold text-red-300">{money(b.totalCost)}</span>
          </div>
        </div>

        <div className="border-t border-[var(--accent-15)] pt-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DollarSign size={16} className="text-[var(--accent)]" />
              <span className="text-sm font-bold text-[var(--accent)]">Preço Cobrado</span>
            </div>
            <span className="text-lg font-black text-[var(--accent)]">{money(b.totalPrice)}</span>
          </div>
        </div>

        <div className="border-t border-[var(--accent-15)] pt-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TrendingUp size={16} className={profitPositive ? "text-emerald-400" : "text-red-400"} />
              <span className={`text-sm font-bold ${profitPositive ? "text-emerald-300" : "text-red-300"}`}>
                Lucro
              </span>
            </div>
            <span className={`text-lg font-black ${profitPositive ? "text-emerald-400" : "text-red-400"}`}>
              {money(b.profit)} <span className="text-xs font-normal opacity-70">({b.profitPerKm}/km)</span>
            </span>
          </div>
        </div>

        {showDetails && (
          <div className="flex items-center gap-4 border-t border-[var(--accent-15)] pt-3 text-xs text-zinc-500">
            <span className="flex items-center gap-1"><Clock size={12} /> {b.durationHours}h de viagem</span>
          </div>
        )}
      </div>
    </div>
  );
}
