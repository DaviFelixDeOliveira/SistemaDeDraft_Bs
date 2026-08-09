import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// ================================================================
// MAPEAMENTO CÓDIGO ↔ BANCO (Supabase)
// O estado interno usa inglês ('victory', 'defeat', 'tbk', 'enemy').
// O banco Supabase usa português ('vitoria', 'derrota', 'nos', 'inimigo').
// Use sempre estas funções ao ler/escrever no banco — nunca escreva
// os valores diretamente para evitar descompassos.
// ================================================================

/** Converte resultado interno → valor aceito pelo banco */
export function toDbResult(result: 'victory' | 'defeat'): 'vitoria' | 'derrota' {
  return result === 'victory' ? 'vitoria' : 'derrota';
}

/** Converte resultado do banco → valor interno do código */
export function fromDbResult(result: string): 'victory' | 'defeat' {
  return result === 'vitoria' ? 'victory' : 'defeat';
}

/** Converte team interno → valor aceito pelo banco */
export function toDbTeam(team: 'tbk' | 'enemy'): 'nos' | 'inimigo' {
  return team === 'tbk' ? 'nos' : 'inimigo';
}

/** Converte team do banco → valor interno do código */
export function fromDbTeam(team: string): 'tbk' | 'enemy' {
  return team === 'nos' ? 'tbk' : 'enemy';
}


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getLevenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = Array(a.length + 1).fill(null).map(() => Array(b.length + 1).fill(null));

  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + indicator // substitution
      );
    }
  }
  return matrix[a.length][b.length];
}

export function fuzzySearch(query: string, target: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase().trim();
  const t = target.toLowerCase();
  
  if (t.includes(q)) return true;
  
  // Calculate threshold based on query length
  const getThreshold = (len: number) => len <= 3 ? 1 : (len <= 5 ? 2 : 3);
  const threshold = getThreshold(q.length);
  
  // Check full string distance
  if (getLevenshteinDistance(q, t) <= threshold) return true;

  // Split target into words and check distance for each word against the query
  const targetWords = t.split(/[\s-]+/);
  for (const word of targetWords) {
    if (getLevenshteinDistance(q, word) <= threshold) {
      return true;
    }
    // Also check if any word starts with the query roughly
    if (word.length > q.length) {
       const prefix = word.substring(0, q.length);
       if (getLevenshteinDistance(q, prefix) <= (q.length <= 4 ? 1 : 2)) {
          return true;
       }
    }
  }

  // Handle case where query is multiple words (e.g., "el prmo")
  const queryWords = q.split(/[\s-]+/);
  if (queryWords.length > 1) {
    // If every word in the query roughly matches some word in the target
    const allQueryWordsMatch = queryWords.every(qw => {
      const qThreshold = getThreshold(qw.length);
      return targetWords.some(tw => {
        if (tw.includes(qw)) return true;
        if (getLevenshteinDistance(qw, tw) <= qThreshold) return true;
        if (tw.length > qw.length && getLevenshteinDistance(qw, tw.substring(0, qw.length)) <= 1) return true;
        return false;
      });
    });
    if (allQueryWordsMatch) return true;
  }
  
  return false;
}

export const getBrawlerBgColor = (brawler: { name?: string, rarity?: string }) => {
  if (!brawler) return 'bg-slate-200 dark:bg-slate-800';
  if (brawler.name === 'Shelly') return 'bg-[#94d7f4]';
  
  switch (brawler.rarity) {
    case 'Raro': return 'bg-[#2edd1c]';
    case 'Super Raro':
    case 'Super-Raro': return 'bg-[#1693ff]';
    case 'Épico': return 'bg-[#b116ed]';
    case 'Mítico': return 'bg-[#ef4140]';
    case 'Lendário': return 'bg-[#f8c820]';
    case 'Ultralendário':
    case 'Cromático': return 'bg-gradient-to-br from-yellow-300 via-red-400 to-purple-400';
    default: return 'bg-slate-200 dark:bg-slate-800';
  }
};

import { ShieldHalf, Crosshair, Plus, Radical, Swords, Radar, Target } from "lucide-react";
import React from 'react';

export const getBrawlerClassIcon = (type: string, className = "w-4 h-4") => {
  switch (type?.toLowerCase()) {
    case 'tanque':
      return React.createElement(ShieldHalf, { className });
    case 'algoz':
      return React.createElement(Swords, { className }); // or dagger, using Swords
    case 'suporte':
      return React.createElement(Plus, { className }); // cross
    case 'controle':
      return React.createElement(Radar, { className });
    case 'destruidores':
      return React.createElement(Radical, { className }); // generic for fist/damage
    case 'tiro preciso':
      return React.createElement(Crosshair, { className });
    case 'lancadores':
    case 'lançadores':
      return React.createElement(Target, { className }); // or bomb
    default:
      return null;
  }
};
