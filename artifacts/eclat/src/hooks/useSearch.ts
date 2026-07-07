// src/hooks/useSearch.ts — Enterprise search engine for Thealankar (real data only)
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Product, Category } from '@/lib/types';

const SYNONYMS: Record<string, string[]> = {
  'tee': ['t-shirt','tshirt'], 'tshirt': ['t-shirt'],
  'hood': ['hoodie'], 'hoodie': ['hood'],
  'blk': ['black'], 'wht': ['white'], 'rd': ['red'], 'blu': ['blue'],
  'jkt': ['jacket'], 'pant': ['trouser','pants'], 'trouser': ['pant','pants'],
  'earring': ['earing','ear ring'], 'earing': ['earring'],
  'neck': ['necklace'], 'necklace': ['neck'],
  'bangle': ['bangles','bracelet'], 'bracelet': ['bangle','bangles'],
  'ring': ['rings'], 'rings': ['ring'],
  'anklet': ['ankle bracelet'], 'hair': ['hairpin','hair pin'],
  'gold': ['golden'], 'oxidised': ['oxidized','antique'], 'oxidized': ['oxidised','antique'],
  'oversized': ['big','large','oversize'],
};

const HISTORY_KEY = 'thealankar_search_history';
const MAX_HISTORY = 8;

const normalise = (s: string) =>
  (s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();

function levenshtein(a: string, b: string): number {
  const m=a.length,n=b.length;
  if(m===0)return n; if(n===0)return m;
  const dp:number[][]=Array.from({length:m+1},(_,i)=>Array.from({length:n+1},(__,j)=>i===0?j:j===0?i:0));
  for(let i=1;i<=m;i++)for(let j=1;j<=n;j++)
    dp[i][j]=a[i-1]===b[j-1]?dp[i-1][j-1]:1+Math.min(dp[i-1][j],dp[i][j-1],dp[i-1][j-1]);
  return dp[m][n];
}

function expandQuery(query: string): string[] {
  const tokens=normalise(query).split(' ').filter(Boolean);
  const expanded=new Set<string>();
  tokens.forEach(t=>{expanded.add(t);(SYNONYMS[t]||[]).forEach(s=>expanded.add(s));});
  return [...expanded];
}

export interface SearchResult { product: Product; score: number; matchedField: string; }

function scoreProduct(product: Product, rawQuery: string): SearchResult | null {
  if(!rawQuery.trim())return null;
  const q=normalise(rawQuery);
  const tokens=expandQuery(rawQuery);
  const f={
    name:normalise(product.name||''), brand:normalise(product.brand||''),
    category:normalise(product.category||''), description:normalise(product.description||''),
    sku:normalise(product.sku||''), collection:normalise(product.collection||''),
    occasion:normalise(product.occasion||''),
  };
  let score=0; let matchedField='';
  if(f.name===q){score=100;matchedField='name';}
  else if(f.name.startsWith(q)){score=90;matchedField='name';}
  else if(tokens.every(t=>f.name.includes(t))){score=80;matchedField='name';}
  else if(f.brand===q||f.brand.startsWith(q)){score=70;matchedField='brand';}
  else if(f.category.includes(q)||tokens.some(t=>f.category.includes(t))){score=60;matchedField='category';}
  else if(tokens.some(t=>f.name.includes(t))){score=50;matchedField='name';}
  else if(tokens.some(t=>f.description.includes(t)||f.collection.includes(t)||f.occasion.includes(t)||f.sku===t)){score=35;matchedField='description';}
  else{
    const nameWords=f.name.split(' ');
    if(tokens.some(token=>nameWords.some(word=>word.length>3&&levenshtein(token,word)<=2))){score=20;matchedField='fuzzy';}
  }
  if(score===0)return null;
  if(product.isBestseller)score+=3;
  if(product.featured)score+=2;
  if(product.isNew)score+=1;
  return{product,score,matchedField};
}

function readHistory():string[]{try{return JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]');}catch{return[];}}
function writeHistory(h:string[]){try{localStorage.setItem(HISTORY_KEY,JSON.stringify(h));}catch{}}

/** Derive trending terms from real products — no mock data */
function deriveTrending(products: Product[], categories: Category[] = []): string[] {
  const seen = new Set<string>();
  const terms: string[] = [];

  // Get all valid products that have a name and are in stock
  const validProducts = products.filter(p => p.name && p.inStock !== false);

  // Shuffle the products randomly
  const shuffled = [...validProducts].sort(() => 0.5 - Math.random());

  // Take up to 15 unique product names
  for (const p of shuffled) {
    if (!seen.has(p.name)) {
      seen.add(p.name);
      terms.push(p.name);
    }
    if (terms.length >= 15) break;
  }

  return terms;
}

export interface UseSearchReturn {
  query:string; setQuery:(q:string)=>void; debouncedQuery:string;
  results:SearchResult[]; isSearching:boolean;
  history:string[]; trending:string[];
  addToHistory:(term:string)=>void; removeFromHistory:(term:string)=>void; clearHistory:()=>void;
}

export function useSearch(products: Product[], categories: Category[] = [], debounceMs=250): UseSearchReturn {
  const [query,setQuery]=useState('');
  const [debouncedQuery,setDebouncedQuery]=useState('');
  const [isSearching,setIsSearching]=useState(false);
  const [history,setHistory]=useState<string[]>(readHistory);
  const timerRef=useRef<ReturnType<typeof setTimeout>|null>(null);

  useEffect(()=>{
    if(timerRef.current)clearTimeout(timerRef.current);
    if(!query.trim()){setDebouncedQuery('');setIsSearching(false);return;}
    setIsSearching(true);
    timerRef.current=setTimeout(()=>{setDebouncedQuery(query);setIsSearching(false);},debounceMs);
    return()=>{if(timerRef.current)clearTimeout(timerRef.current);};
  },[query,debounceMs]);

  const results=useMemo<SearchResult[]>(()=>{
    if(!debouncedQuery.trim()||!products.length)return[];
    return products.map(p=>scoreProduct(p,debouncedQuery)).filter((r):r is SearchResult=>r!==null)
      .sort((a,b)=>b.score-a.score).slice(0,20);
  },[products,debouncedQuery]);

  // Derive trending from real products — recomputed only when products change
  const trending=useMemo(()=>deriveTrending(products, categories),[products, categories]);

  const addToHistory=useCallback((term:string)=>{
    const t=term.trim();if(!t)return;
    setHistory(prev=>{const next=[t,...prev.filter(h=>h!==t)].slice(0,MAX_HISTORY);writeHistory(next);return next;});
  },[]);
  const removeFromHistory=useCallback((term:string)=>{
    setHistory(prev=>{const next=prev.filter(h=>h!==term);writeHistory(next);return next;});
  },[]);
  const clearHistory=useCallback(()=>{setHistory([]);writeHistory([]);},[]);

  return{query,setQuery,debouncedQuery,results,isSearching,history,trending,addToHistory,removeFromHistory,clearHistory};
}
